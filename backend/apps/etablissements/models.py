"""Annuaire public des établissements pénitentiaires (§5, §7.2 — Bloc B).

Fiche établissement : coordonnées, géolocalisation, horaires et conditions de
visite. Le volet sensible (situation journalière, effectifs) relève de M9/M10 et
n'est pas modélisé ici.
"""

from __future__ import annotations

from django.db import models

from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement
from core.models import ModeleAvecSuppressionLogique


class Etablissement(ModeleAvecSuppressionLogique):
    nom = models.CharField(max_length=200)
    code = models.SlugField(max_length=80, unique=True)
    type = models.ForeignKey(
        TypeEtablissement, on_delete=models.PROTECT, related_name="etablissements"
    )
    direction_regionale = models.ForeignKey(
        DirectionRegionale, on_delete=models.PROTECT, related_name="etablissements"
    )
    region = models.ForeignKey(
        Region, on_delete=models.PROTECT, related_name="etablissements", null=True, blank=True
    )

    capacite = models.PositiveIntegerField(null=True, blank=True)
    adresse = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)

    horaires_visite = models.CharField(max_length=200, blank=True)
    conditions_visite = models.TextField(
        blank=True, help_text="Pièces et objets autorisés, consignes pratiques."
    )

    actif = models.BooleanField(default=True)

    class Meta:
        db_table = "etablissements"
        ordering = ["nom"]

    def __str__(self) -> str:  # pragma: no cover
        return self.nom
