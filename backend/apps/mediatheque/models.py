"""Centre de documents publics — textes juridiques, avis de concours, statistiques
publiées (§5 « documents_publics », §7.2 « Publications officielles »). La galerie
photo/vidéo et l'OCR plein texte (GED) suivent au Bloc C ; ce module couvre la liste
de téléchargement telle qu'attendue par le portail public dès la Phase 1.
"""

from __future__ import annotations

from django.db import models

from core.models import ModeleHorodate


class NatureDocument(models.TextChoices):
    LOI = "LOI", "Loi"
    DECRET = "DECRET", "Décret"
    ARRETE = "ARRETE", "Arrêté"
    AVIS_CONCOURS = "AVIS_CONCOURS", "Avis de concours"
    COMMUNIQUE = "COMMUNIQUE", "Communiqué"
    RAPPORT = "RAPPORT", "Rapport"


class StatutDocument(models.TextChoices):
    EN_VIGUEUR = "EN_VIGUEUR", "En vigueur"
    ABROGE = "ABROGE", "Abrogé"


class DocumentPublic(ModeleHorodate):
    titre = models.CharField(max_length=250)
    nature = models.CharField(max_length=20, choices=NatureDocument.choices)
    numero = models.CharField(max_length=100, blank=True)
    date_texte = models.DateField(null=True, blank=True)
    statut = models.CharField(
        max_length=20, choices=StatutDocument.choices, default=StatutDocument.EN_VIGUEUR
    )
    categorie = models.CharField(
        max_length=60,
        blank=True,
        db_index=True,
        help_text="Regroupement portail : textes-juridiques, concours, statistiques…",
    )
    fichier_url = models.URLField(blank=True, help_text="Placeholder — stockage MinIO au Bloc B/C.")
    publie = models.BooleanField(default=True)

    class Meta:
        db_table = "documents_publics"
        ordering = ["-date_texte", "-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.titre
