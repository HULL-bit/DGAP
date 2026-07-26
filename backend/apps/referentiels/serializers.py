from rest_framework import serializers

from .models import DirectionRegionale, Region, TypeEtablissement


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "code", "nom"]
        read_only_fields = fields


class DirectionRegionaleSerializer(serializers.ModelSerializer):
    regions = RegionSerializer(many=True, read_only=True)

    class Meta:
        model = DirectionRegionale
        fields = [
            "id",
            "code",
            "nom",
            "regions",
            "directeur_nom",
            "directeur_email",
            "directeur_telephone",
        ]
        read_only_fields = fields


class TypeEtablissementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeEtablissement
        fields = ["id", "code", "libelle"]
        read_only_fields = fields
