from rest_framework import serializers

from .models import ProduitBoutique


class ProduitBoutiquePubliqueSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProduitBoutique
        fields = [
            "id",
            "nom",
            "slug",
            "categorie",
            "description",
            "prix",
            "prix_promotionnel",
            "image_url",
        ]
        read_only_fields = fields

    def get_image_url(self, obj: ProduitBoutique) -> str:
        return obj.image.url if obj.image else ""


class ProduitBoutiqueBackofficeSerializer(serializers.ModelSerializer):
    """CRUD back-office (scope `boutique:gerer`) — `image_url` est calculée (jamais
    stockée telle quelle) : renseignée par l'action dédiée de téléversement."""

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProduitBoutique
        fields = [
            "id",
            "nom",
            "slug",
            "categorie",
            "description",
            "prix",
            "prix_promotionnel",
            "image_url",
            "disponible",
            "ordre",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = ["id", "image_url", "cree_le", "modifie_le"]

    def get_image_url(self, obj: ProduitBoutique) -> str:
        return obj.image.url if obj.image else ""


class ImageProduitUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

    def validate_image(self, valeur):
        extensions_autorisees = (".jpg", ".jpeg", ".png", ".webp")
        if not valeur.name.lower().endswith(extensions_autorisees):
            raise serializers.ValidationError("Formats acceptés : JPG, PNG, WEBP.")
        taille_max_mo = 8
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class ImageProduitReponseSerializer(serializers.Serializer):
    image_url = serializers.CharField()
