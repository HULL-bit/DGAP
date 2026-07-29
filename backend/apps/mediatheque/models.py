"""Centre de documents publics — textes juridiques, avis de concours, statistiques
publiées (§5 « documents_publics », §7.2 « Publications officielles »), et galeries
photo/vidéo (carrousel d'accueil, réinsertion, vie des détenus, articles). L'OCR plein
texte (GED) suit à un bloc ultérieur ; ce module couvre le téléchargement de documents
et les galeries de médias attendues par le portail public.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
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


def chemin_document_public(instance: DocumentPublic, nom_fichier: str) -> str:
    return f"documents/{instance.id}/{nom_fichier}"


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
    #: Fichier réel (MinIO) — l'URL exposée par l'API (`fichier_url`) est calculée à
    #: la lecture (`.fichier.url`, presignée), jamais stockée telle quelle : une URL
    #: S3 pré-signée expire et dépasse la longueur d'un `URLField` classique.
    fichier = models.FileField(upload_to=chemin_document_public, blank=True)
    publie = models.BooleanField(default=True)

    class Meta:
        db_table = "documents_publics"
        ordering = ["-date_texte", "-cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.titre


def chemin_media_galerie(instance: MediaGalerie, nom_fichier: str) -> str:
    return f"galeries/{instance.galerie_id}/{nom_fichier}"


class TypeMedia(models.TextChoices):
    IMAGE = "IMAGE", "Image"
    VIDEO = "VIDEO", "Vidéo (lien incorporé)"


class Galerie(ModeleHorodate):
    """Collection nommée de médias, référencée par `code` depuis le front public
    (carrousel d'accueil, réinsertion, vie des détenus, ou associée à un article)."""

    code = models.SlugField(max_length=80, unique=True)
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "galeries"
        ordering = ["titre"]
        verbose_name_plural = "Galeries"

    def __str__(self) -> str:  # pragma: no cover
        return self.titre


class MediaGalerie(ModeleHorodate):
    galerie = models.ForeignKey(Galerie, on_delete=models.CASCADE, related_name="medias")
    type = models.CharField(max_length=10, choices=TypeMedia.choices)
    image = models.ImageField(upload_to=chemin_media_galerie, blank=True)
    #: Lien d'incorporation (YouTube/Vimeo) — pas de téléversement de fichier vidéo :
    #: MinIO n'est pas un CDN vidéo et aucun pipeline de transcodage n'existe (§ décision produit).
    video_url = models.URLField(blank=True)
    legende = models.CharField(max_length=200, blank=True)
    ordre = models.PositiveIntegerField(default=0)
    publie = models.BooleanField(default=True)

    class Meta:
        db_table = "medias_galerie"
        ordering = ["ordre", "cree_le"]

    def __str__(self) -> str:  # pragma: no cover
        return self.legende or f"{self.galerie.titre} #{self.ordre}"

    def clean(self) -> None:
        if self.type == TypeMedia.IMAGE and not self.image:
            raise ValidationError("Une image est requise pour un média de type IMAGE.")
        if self.type == TypeMedia.VIDEO and not self.video_url:
            raise ValidationError("Un lien vidéo est requis pour un média de type VIDEO.")
