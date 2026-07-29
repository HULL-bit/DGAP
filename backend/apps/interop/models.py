"""Interconnexion — apps.interop (M14), Bloc G, jamais exposé côté public.

Portée de cette passe : EF-1401 (« socle d'API sécurisées documentées pour tous
les échanges externes, sans échange de fichiers manuels non tracés ») — un
journal des échanges externes, prêt à recevoir un connecteur réel pour chacun
des systèmes cités par le cahier, mais aussi utilisable dès maintenant pour
tracer un échange effectué manuellement (l'exigence porte sur l'absence
d'échange *non tracé*, pas sur l'absence d'échange manuel) — et le volet
« rapprochement automatique » d'EF-1404, calculé au-dessus du grand livre mock
déjà existant d'`apps.paiements` (aucune nouvelle donnée, même patron que
`apps.statistiques` : agrégation pure, pas de modèle propre).

Non couvert (dépendent de contreparties externes réelles hors de portée d'un
projet sans accès à ces systèmes, ou déjà couverts ailleurs) :
- EF-1402 (chaîne judiciaire) — systèmes réels du Ministère de la Justice, des
  tribunaux et des parquets.
- EF-1403 (forces de sécurité) — conventions réelles avec la Police et la
  Gendarmerie nationales.
- EF-1404, volet intégration de passerelle réelle (mobile money, cartes) —
  aucun compte marchand engagé (décision déjà actée pour `apps.paiements`,
  mock uniquement).
- EF-1405 (notifications SMS/e-mail) — déjà livré par `apps.notifications`
  (e-mail réel, SMS simulé).
- EF-1406 (plateformes gouvernementales) — briques mutualisées de l'État
  (identité numérique nationale, Open Data) non disponibles.
"""

from __future__ import annotations

import hashlib

from django.db import models

from core.models import ModeleHorodate


class SystemeExterne(models.TextChoices):
    """Systèmes cités par le cahier (M14) — journal prêt à recevoir un
    connecteur réel pour chacun, aucun n'est câblé dans cette passe."""

    CHAINE_JUDICIAIRE = "CHAINE_JUDICIAIRE", "Chaîne judiciaire (Ministère de la Justice)"
    FORCES_SECURITE = "FORCES_SECURITE", "Forces de sécurité (Police/Gendarmerie)"
    TRESOR = "TRESOR", "Trésor public"
    PLATEFORME_GOUVERNEMENTALE = "PLATEFORME_GOUVERNEMENTALE", "Plateforme gouvernementale"
    AUTRE = "AUTRE", "Autre"


class DirectionEchange(models.TextChoices):
    SORTANT = "SORTANT", "Sortant"
    ENTRANT = "ENTRANT", "Entrant"


class StatutEchange(models.TextChoices):
    SUCCES = "SUCCES", "Succès"
    ECHEC = "ECHEC", "Échec"


class EchangeExterne(ModeleHorodate):
    """Journal des échanges externes (EF-1401) — trace qui/quoi/quand pour
    toute interaction avec un système tiers, câblée ou manuelle. L'empreinte
    SHA-256 de la charge échangée est conservée pour l'intégrité, jamais le
    contenu lui-même (peut être sensible selon le système)."""

    systeme = models.CharField(max_length=30, choices=SystemeExterne.choices)
    direction = models.CharField(max_length=10, choices=DirectionEchange.choices)
    type_echange = models.CharField(
        max_length=150, help_text="Ex. « notification d'écrou », « rapprochement quotidien »."
    )
    statut = models.CharField(max_length=10, choices=StatutEchange.choices)
    empreinte_charge = models.CharField(max_length=64, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    acteur = models.ForeignKey(
        "comptes.Utilisateur", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        db_table = "echanges_externes"
        ordering = ["-cree_le"]
        verbose_name = "Échange externe"

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.get_systeme_display()} — {self.type_echange} ({self.statut})"

    @classmethod
    def tracer(
        cls,
        *,
        systeme: str,
        direction: str,
        type_echange: str,
        statut: str,
        charge: str = "",
        detail: dict | None = None,
        acteur=None,
    ) -> EchangeExterne:
        empreinte = hashlib.sha256(charge.encode("utf-8")).hexdigest() if charge else ""
        return cls.objects.create(
            systeme=systeme,
            direction=direction,
            type_echange=type_echange,
            statut=statut,
            empreinte_charge=empreinte,
            detail=detail or {},
            acteur=acteur,
        )
