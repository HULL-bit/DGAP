"""Boutique — vitrine des produits fabriqués par les personnes détenues dans le cadre
des ateliers de réinsertion (§7.2). Catalogue de présentation uniquement : aucun
panier, aucun paiement en ligne (décision produit — cf. `apps.paiements` pour le seul
téléservice payant du portail, les concours).
"""

from __future__ import annotations

from django.db import models

from core.models import ModeleHorodate


def chemin_image_produit(instance: ProduitBoutique, nom_fichier: str) -> str:
    return f"boutique/{instance.id}/{nom_fichier}"


class ProduitBoutique(ModeleHorodate):
    nom = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    categorie = models.CharField(
        max_length=80,
        blank=True,
        db_index=True,
        help_text="Regroupement boutique, ex. Jus locaux, Produits d'entretien, Mobilier.",
    )
    description = models.TextField(blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=0, help_text="Montant en FCFA.")
    prix_promotionnel = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        null=True,
        blank=True,
        help_text="Prix réduit affiché à la place de `prix`, si renseigné (FCFA).",
    )
    #: Fichier réel (MinIO) — voir `Article.image` : une URL S3 pré-signée expire et
    #: dépasse la longueur d'un `URLField`, elle n'est donc jamais stockée telle quelle.
    image = models.ImageField(upload_to=chemin_image_produit, blank=True)
    disponible = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "produits_boutique"
        ordering = ["ordre", "nom"]

    def __str__(self) -> str:  # pragma: no cover
        return self.nom
