"""Modèles de base à hériter par toutes les apps métier (§5 — règles transverses).

- PK = UUID v7 (core.id.uuid7).
- Horodatage systématique (cree_le, modifie_le, cree_par, modifie_par).
- Suppression logique disponible pour les entités à valeur probante.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

from core.id import uuid7


class ModeleHorodate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-cree_le"]


class ModeleBase(ModeleHorodate):
    """Base standard : identité UUID v7, horodatage, traçabilité de l'acteur."""

    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        editable=False,
    )
    modifie_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        editable=False,
    )

    class Meta(ModeleHorodate.Meta):
        abstract = True


class RequeteAvecSuppressionLogiqueManager(models.Manager):
    """Exclut par défaut les enregistrements supprimés logiquement."""

    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(supprime_le__isnull=True)


class ModeleAvecSuppressionLogique(ModeleBase):
    """À utiliser pour les entités à valeur probante : aucune suppression physique."""

    supprime_le = models.DateTimeField(null=True, blank=True, editable=False)

    objets = RequeteAvecSuppressionLogiqueManager()
    tous_les_objets = models.Manager()

    class Meta(ModeleBase.Meta):
        abstract = True

    def supprimer(self, acteur=None) -> None:
        from django.utils import timezone

        self.supprime_le = timezone.now()
        if acteur is not None:
            self.modifie_par = acteur
        self.save(update_fields=["supprime_le", "modifie_par", "modifie_le"])
