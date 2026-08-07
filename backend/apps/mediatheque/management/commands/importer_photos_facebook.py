"""Import ponctuel des photos d'une page Facebook publique via l'API Graph
officielle de Meta — aucun contournement d'authentification ni de protection
anti-robot, seulement l'API documentée. Nécessite un jeton d'accès Page valide
généré par l'administrateur de la page (voir README de ce module pour la
procédure d'obtention).

Les médias importés sont créés en brouillon (`publie=False`) : une revue
manuelle (légende, cadrage, droits sur les personnes visibles) est nécessaire
avant toute publication sur le portail public.
"""

from __future__ import annotations

import time

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db.models import Max

from apps.mediatheque.models import Galerie, MediaGalerie, TypeMedia

GRAPH_API_VERSION = "v21.0"
DELAI_ENTRE_TELECHARGEMENTS_SECONDES = 0.2


class Command(BaseCommand):
    help = (
        "Importe les photos d'une page Facebook dans une galerie brouillon via "
        "l'API Graph officielle. Nécessite --token (jeton d'accès Page)."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--token", required=True, help="Jeton d'accès Page Facebook.")
        parser.add_argument(
            "--page-id",
            default="dgap.officielle",
            help="Identifiant ou nom d'utilisateur de la page Facebook.",
        )
        parser.add_argument(
            "--galerie-code",
            default="facebook-import",
            help="Code de la galerie de destination (créée si absente).",
        )
        parser.add_argument(
            "--limite",
            type=int,
            default=0,
            help="Nombre maximal de photos à importer (0 = toutes).",
        )

    def handle(self, *args: object, **options: object) -> None:
        token = str(options["token"])
        page_id = str(options["page_id"])
        limite = int(options["limite"])  # type: ignore[call-overload]
        galerie_code = str(options["galerie_code"])

        galerie, cree = Galerie.objects.get_or_create(
            code=galerie_code,
            defaults={
                "titre": "Photos importées — Facebook DGAP",
                "description": (
                    "Import brut depuis la page Facebook officielle — à trier, "
                    "légender et publier manuellement depuis le back-office."
                ),
            },
        )
        if cree:
            self.stdout.write(self.style.SUCCESS(f"Galerie créée : {galerie.code}"))

        marqueurs_deja_importes = {
            legende.split("]", 1)[0] + "]"
            for legende in MediaGalerie.objects.filter(
                galerie=galerie, legende__startswith="[fb:"
            ).values_list("legende", flat=True)
        }

        url: str | None = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{page_id}/photos"
        params: dict[str, str | int] | None = {
            "type": "uploaded",
            "fields": "id,name,images",
            "access_token": token,
            "limit": 100,
        }

        total_importes = 0
        total_ignores = 0

        while url:
            reponse = requests.get(url, params=params, timeout=30)
            if reponse.status_code != 200:
                raise CommandError(
                    f"Échec de l'appel à l'API Graph ({reponse.status_code}) : "
                    f"{reponse.text[:500]}"
                )
            donnees = reponse.json()

            for photo in donnees.get("data", []):
                marqueur = f"[fb:{photo['id']}]"
                if marqueur in marqueurs_deja_importes:
                    total_ignores += 1
                    continue

                images = photo.get("images") or []
                if not images:
                    continue
                # Le premier élément renvoyé par l'API Graph est toujours la plus
                # haute résolution disponible.
                meilleure_image_url = images[0]["source"]

                fichier_reponse = requests.get(meilleure_image_url, timeout=60)
                if fichier_reponse.status_code != 200:
                    self.stderr.write(f"Échec du téléchargement de la photo {photo['id']}")
                    continue

                legende_originale = (photo.get("name") or "").strip()
                legende = f"{marqueur} {legende_originale}".strip()[:200]

                dernier_ordre = (
                    MediaGalerie.objects.filter(galerie=galerie).aggregate(m=Max("ordre"))["m"] or 0
                )

                media = MediaGalerie(
                    galerie=galerie,
                    type=TypeMedia.IMAGE,
                    legende=legende,
                    ordre=dernier_ordre + 1,
                    publie=False,
                )
                media.image.save(
                    f"{photo['id']}.jpg", ContentFile(fichier_reponse.content), save=True
                )
                total_importes += 1
                self.stdout.write(f"Importé : {photo['id']} — {legende_originale[:60]}")
                marqueurs_deja_importes.add(marqueur)

                if limite and total_importes >= limite:
                    url = None
                    break
                time.sleep(DELAI_ENTRE_TELECHARGEMENTS_SECONDES)
            else:
                # Boucle `for` non interrompue par `break` (limite non atteinte) :
                # on passe à la page suivante si l'API Graph en fournit une.
                url = donnees.get("paging", {}).get("next")
                params = None  # l'URL "next" contient déjà tous les paramètres.
                continue
            break

        self.stdout.write(
            self.style.SUCCESS(
                f"Terminé : {total_importes} photo(s) importée(s), "
                f"{total_ignores} déjà présente(s)."
            )
        )
        self.stdout.write(
            "Les médias importés sont en brouillon (non publiés) — à trier et "
            "publier depuis le back-office (Galeries)."
        )
