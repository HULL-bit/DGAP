from rest_framework import serializers

from .models import DocumentPublic


class DocumentPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentPublic
        fields = [
            "id",
            "titre",
            "nature",
            "numero",
            "date_texte",
            "statut",
            "categorie",
            "fichier_url",
        ]
        read_only_fields = fields
