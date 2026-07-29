"""Passerelle de paiement — mock uniquement (Bloc E). Aucun opérateur réel intégré :
Orange Money/Wave nécessitent un compte marchand et des accords commerciaux hors
périmètre de ce chantier. Le modèle reste réutilisable (`GenericForeignKey`) par
tout futur service payant sans dépendre de `apps.concours` spécifiquement.
"""

from __future__ import annotations

import secrets

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone

from core.models import ModeleHorodate


class MoyenPaiement(models.TextChoices):
    MOCK = "MOCK", "Simulation (aucun opérateur réel)"
    ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
    WAVE = "WAVE", "Wave"


class StatutPaiement(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente"
    PAYE = "PAYE", "Payé"
    ECHEC = "ECHEC", "Échec"


def generer_reference() -> str:
    annee = timezone.now().year
    return f"PAY-{annee}-{secrets.token_hex(4).upper()}"


class Paiement(ModeleHorodate):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    objet_paye = GenericForeignKey("content_type", "object_id")

    reference = models.CharField(max_length=40, unique=True, editable=False)
    montant = models.DecimalField(max_digits=10, decimal_places=0, help_text="Montant en FCFA.")
    moyen = models.CharField(
        max_length=20, choices=MoyenPaiement.choices, default=MoyenPaiement.MOCK
    )
    statut = models.CharField(
        max_length=20, choices=StatutPaiement.choices, default=StatutPaiement.EN_ATTENTE
    )
    paye_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "paiements"
        ordering = ["-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.reference

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generer_reference()
        super().save(*args, **kwargs)

    def marquer_paye(self) -> None:
        self.statut = StatutPaiement.PAYE
        self.paye_le = timezone.now()
        self.save(update_fields=["statut", "paye_le"])
