from rest_framework import serializers

from .models import Paiement


class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = ["id", "reference", "montant", "moyen", "statut", "paye_le", "cree_le"]
        read_only_fields = fields
