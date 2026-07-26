"""Référentiels partagés — régions, directions régionales (IRAP), types d'établissement
(§5, Bloc B). Base géographique/organisationnelle consommée par `apps.etablissements`.
"""

from __future__ import annotations

from django.db import models

from core.models import ModeleHorodate


class Region(ModeleHorodate):
    code = models.SlugField(max_length=40, unique=True)
    nom = models.CharField(max_length=100)

    class Meta:
        db_table = "regions"
        ordering = ["nom"]

    def __str__(self) -> str:  # pragma: no cover
        return self.nom


class DirectionRegionale(ModeleHorodate):
    """Direction régionale de l'Administration Pénitentiaire (IRAP) — couvre une ou
    plusieurs régions administratives (ex. « Thiès-Diourbel »)."""

    code = models.SlugField(max_length=60, unique=True)
    nom = models.CharField(max_length=150)
    regions = models.ManyToManyField(Region, related_name="directions_regionales", blank=True)

    directeur_nom = models.CharField(max_length=150, blank=True)
    directeur_email = models.EmailField(blank=True)
    directeur_telephone = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = "directions_regionales"
        ordering = ["nom"]
        verbose_name = "Direction régionale (IRAP)"
        verbose_name_plural = "Directions régionales (IRAP)"

    def __str__(self) -> str:  # pragma: no cover
        return self.nom


class TypeEtablissement(ModeleHorodate):
    code = models.SlugField(max_length=60, unique=True)
    libelle = models.CharField(max_length=150)

    class Meta:
        db_table = "types_etablissement"
        ordering = ["libelle"]

    def __str__(self) -> str:  # pragma: no cover
        return self.libelle
