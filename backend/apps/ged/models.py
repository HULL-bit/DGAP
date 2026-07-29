"""Gestion électronique de documents — GED (M6), Bloc G, jamais exposé côté public
(back-office interne uniquement, scopes `ged:*`).

Portée de cette première passe (EF-601, EF-602, EF-603, EF-604, EF-607, EF-608 —
« Obligatoire » sauf EF-608 « Important ») : référentiel documentaire unique avec
métadonnées et plan de classement, OCR français automatique à l'entrée (Tesseract,
déjà provisionné dans l'image Docker — `tesseract-ocr-fra`, `poppler-utils` pour
rasteriser les PDF avant reconnaissance), recherche plein texte sur le contenu
océrisé, gestion des versions avec verrouillage (check-in/check-out), empreinte
SHA-256 à l'entrée, partage interne à durée limitée avec traçabilité.

Non couvert (dépendances non livrées ou hors périmètre produit) :
- EF-605 (classement automatique par règles/apprentissage) — nécessite un moteur
  de classification, hors périmètre de cette passe.
- EF-606 (cycle de vie) — les champs (`statut_cycle_vie`, `duree_conservation_mois`,
  `date_destruction_prevue`, `gel_juridique`) sont posés mais aucun processus de
  destruction contrôlée avec procès-verbal généré n'est construit.
- Vérification périodique d'intégrité (EF-607) — l'empreinte est calculée à
  l'entrée et à chaque nouvelle version ; une tâche planifiée de re-vérification
  périodique (Celery beat, déjà dans la stack) n'est pas construite.
- OCR asynchrone — traité de façon synchrone à l'enregistrement (best-effort,
  n'empêche jamais l'enregistrement du document en cas d'échec) ; un traitement en
  tâche de fond serait préférable pour de gros volumes, non construit ici (aucune
  tâche Celery n'existe encore ailleurs dans le projet pour amorcer ce patron).
- Comparaison de versions (EF-604 mentionne « comparaison ») — restauration et
  historique sont couverts, pas un différentiel visuel entre versions (documents
  binaires, PDF).
"""

from __future__ import annotations

import hashlib
import io
import logging
import secrets

from django.db import models
from django.utils import timezone

from core.models import ModeleAvecSuppressionLogique, ModeleBase, ModeleHorodate

logger = logging.getLogger(__name__)


class NatureDocumentGed(models.TextChoices):
    ADMINISTRATIF = "ADMINISTRATIF", "Administratif"
    JURIDIQUE = "JURIDIQUE", "Juridique"
    TECHNIQUE = "TECHNIQUE", "Technique"


class StatutCycleVie(models.TextChoices):
    ACTIF = "ACTIF", "Actif"
    ARCHIVE = "ARCHIVE", "Archivé"
    DETRUIT = "DETRUIT", "Détruit"


class StatutOcr(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente"
    TRAITE = "TRAITE", "Traité"
    ECHEC = "ECHEC", "Échec"


def chemin_document_ged(instance: Document, nom_fichier: str) -> str:
    return f"ged/{instance.id}/{nom_fichier}"


def chemin_version_document(instance: VersionDocument, nom_fichier: str) -> str:
    return f"ged/{instance.document_id}/versions/{instance.numero}/{nom_fichier}"


def calculer_empreinte_sha256(fichier) -> str:
    """SHA-256 de l'ensemble du fichier (EF-607) — lu par blocs pour ne jamais
    charger un gros document entièrement en mémoire."""
    hasheur = hashlib.sha256()
    fichier.seek(0)
    for bloc in fichier.chunks():
        hasheur.update(bloc)
    fichier.seek(0)
    return hasheur.hexdigest()


def extraire_texte_ocr(fichier, nom_fichier: str) -> str:
    """OCR français (EF-602) — best-effort : ne lève jamais, retourne une chaîne
    vide en cas d'échec (page illisible, format non pris en charge…)."""
    import pytesseract
    from PIL import Image

    fichier.seek(0)
    contenu = fichier.read()
    fichier.seek(0)
    try:
        if nom_fichier.lower().endswith(".pdf"):
            from pdf2image import convert_from_bytes

            pages = convert_from_bytes(contenu)
            textes = [pytesseract.image_to_string(page, lang="fra") for page in pages]
            return "\n\n".join(textes).strip()
        image = Image.open(io.BytesIO(contenu))
        return pytesseract.image_to_string(image, lang="fra").strip()
    except Exception:
        logger.warning("Échec de l'OCR pour %s", nom_fichier, exc_info=True)
        return ""


class Document(ModeleAvecSuppressionLogique):
    titre = models.CharField(max_length=250)
    nature = models.CharField(max_length=15, choices=NatureDocumentGed.choices)
    #: Plan de classement institutionnel (EF-601), ex. « rh/contrats »,
    #: « juridique/decrets » — hiérarchie encodée en chemin, pas de modèle d'arbre
    #: séparé pour cette première passe.
    categorie = models.CharField(max_length=150, blank=True, db_index=True)
    perimetre = models.ForeignKey(
        "comptes.Perimetre",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents_ged",
    )
    #: Fichier réel (MinIO) — même patron que `Article.image` : l'URL exposée par
    #: l'API est presignée à la lecture, jamais stockée telle quelle.
    fichier = models.FileField(upload_to=chemin_document_ged)
    empreinte_sha256 = models.CharField(max_length=64, blank=True, editable=False)
    contenu_ocr = models.TextField(blank=True)
    statut_ocr = models.CharField(
        max_length=15, choices=StatutOcr.choices, default=StatutOcr.EN_ATTENTE
    )

    statut_cycle_vie = models.CharField(
        max_length=15, choices=StatutCycleVie.choices, default=StatutCycleVie.ACTIF
    )
    duree_conservation_mois = models.PositiveIntegerField(null=True, blank=True)
    date_destruction_prevue = models.DateField(null=True, blank=True)
    gel_juridique = models.BooleanField(
        default=False, help_text="Suspend toute destruction tant que ce gel n'est pas levé."
    )

    verrouille_par = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    verrouille_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "documents_ged"
        ordering = ["-cree_le"]
        verbose_name = "Document (GED)"

    def __str__(self) -> str:  # pragma: no cover
        return self.titre

    @property
    def est_verrouille(self) -> bool:
        return self.verrouille_par_id is not None

    def traiter_fichier_entrant(self) -> None:
        """Empreinte + OCR (EF-602, EF-607) — appelé à la création et à chaque
        nouvelle version, jamais à une simple modification de métadonnées."""
        self.empreinte_sha256 = calculer_empreinte_sha256(self.fichier)
        texte = extraire_texte_ocr(self.fichier, self.fichier.name or "")
        self.contenu_ocr = texte
        self.statut_ocr = StatutOcr.TRAITE if texte else StatutOcr.ECHEC

    def verrouiller(self, utilisateur) -> None:
        self.verrouille_par = utilisateur
        self.verrouille_le = timezone.now()
        self.save(update_fields=["verrouille_par", "verrouille_le", "modifie_le"])

    def deverrouiller(self) -> None:
        self.verrouille_par = None
        self.verrouille_le = None
        self.save(update_fields=["verrouille_par", "verrouille_le", "modifie_le"])

    def nouvelle_version(self, fichier, commentaire: str = "", acteur=None) -> VersionDocument:
        """Archive le fichier courant en tant que version, puis le remplace
        (EF-604) — le fichier remplacé n'est jamais perdu, seulement historisé."""
        dernier_numero = (
            self.versions.order_by("-numero").values_list("numero", flat=True).first() or 0
        )
        version = VersionDocument.objects.create(
            document=self,
            numero=dernier_numero + 1,
            fichier=self.fichier,
            empreinte_sha256=self.empreinte_sha256,
            commentaire=commentaire,
            cree_par=acteur,
        )
        self.fichier = fichier
        self.traiter_fichier_entrant()
        self.modifie_par = acteur
        self.save()
        return version

    def restaurer_version(self, version: VersionDocument, acteur=None) -> VersionDocument:
        """Restaure une ancienne version comme contenu courant — la restauration
        elle-même est historisée comme une nouvelle version (jamais de perte)."""
        return self.nouvelle_version(
            version.fichier,
            commentaire=f"Restauration de la version {version.numero}",
            acteur=acteur,
        )


class VersionDocument(ModeleBase):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    numero = models.PositiveIntegerField()
    fichier = models.FileField(upload_to=chemin_version_document)
    empreinte_sha256 = models.CharField(max_length=64, blank=True)
    commentaire = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "versions_document_ged"
        ordering = ["-numero"]
        constraints = [
            models.UniqueConstraint(fields=["document", "numero"], name="uniq_version_document_ged")
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.document.titre} — v{self.numero}"


def generer_jeton_partage() -> str:
    return secrets.token_urlsafe(32)


class LienPartage(ModeleHorodate):
    """Partage interne à durée limitée (EF-608) — jamais public : consommé par un
    agent authentifié muni du jeton, jamais en anonyme (§ « interne » du cahier)."""

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="liens_partage")
    jeton = models.CharField(
        max_length=64, unique=True, editable=False, default=generer_jeton_partage
    )
    expire_le = models.DateTimeField()
    cree_par = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        db_table = "liens_partage_ged"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Lien vers {self.document.titre} (expire {self.expire_le:%Y-%m-%d})"

    @property
    def est_expire(self) -> bool:
        return timezone.now() > self.expire_le


def documents_visibles_par(utilisateur) -> models.QuerySet[Document]:
    """Pas de restriction de confidentialité dans cette passe (contrairement à
    `apps.courrier`) — le référentiel GED n'a pas de niveau de classification dans
    le périmètre EF-601/602/603/604/607/608 couvert ici. Fonction conservée pour
    un point d'extension unique si EF-507-like venait à s'appliquer à la GED."""
    return Document.objets.all()
