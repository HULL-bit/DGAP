from rest_framework import serializers

from apps.referentiels.serializers import (
    DirectionRegionaleSerializer,
    RegionSerializer,
    TypeEtablissementSerializer,
)

from .models import Etablissement


class EtablissementSerializer(serializers.ModelSerializer):
    type = TypeEtablissementSerializer(read_only=True)
    direction_regionale = DirectionRegionaleSerializer(read_only=True)
    region = RegionSerializer(read_only=True)

    class Meta:
        model = Etablissement
        fields = [
            "id",
            "nom",
            "code",
            "type",
            "direction_regionale",
            "region",
            "capacite",
            "adresse",
            "latitude",
            "longitude",
            "telephone",
            "email",
            "horaires_visite",
            "conditions_visite",
        ]
        read_only_fields = fields
