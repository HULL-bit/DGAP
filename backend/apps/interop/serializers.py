from rest_framework import serializers

from .models import DirectionEchange, EchangeExterne, StatutEchange, SystemeExterne


class EchangeExterneSerializer(serializers.ModelSerializer):
    acteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = EchangeExterne
        fields = [
            "id",
            "systeme",
            "direction",
            "type_echange",
            "statut",
            "empreinte_charge",
            "detail",
            "acteur_nom",
            "cree_le",
        ]
        read_only_fields = fields

    def get_acteur_nom(self, obj: EchangeExterne) -> str:
        return obj.acteur.get_full_name() if obj.acteur else ""


class EchangeExterneCreationSerializer(serializers.Serializer):
    """Écriture — validation seule, la création passe par `EchangeExterne.tracer()`
    (calcule l'empreinte de la charge), jamais par un `.save()` de ModelSerializer."""

    systeme = serializers.ChoiceField(choices=SystemeExterne.choices)
    direction = serializers.ChoiceField(choices=DirectionEchange.choices)
    type_echange = serializers.CharField(max_length=150)
    statut = serializers.ChoiceField(choices=StatutEchange.choices)
    charge = serializers.CharField(required=False, allow_blank=True, default="")
    detail = serializers.JSONField(required=False, default=dict)


class LignePaiementJourSerializer(serializers.Serializer):
    jour = serializers.DateField()
    statut = serializers.CharField()
    nombre = serializers.IntegerField()
    montant_total = serializers.DecimalField(max_digits=12, decimal_places=0)


class PaiementAnomalieSerializer(serializers.Serializer):
    reference = serializers.CharField()
    montant = serializers.DecimalField(max_digits=10, decimal_places=0)
    moyen = serializers.CharField()
    cree_le = serializers.DateTimeField()


class RapprochementPaiementsSerializer(serializers.Serializer):
    total_paye = serializers.DecimalField(max_digits=12, decimal_places=0)
    total_en_attente = serializers.DecimalField(max_digits=12, decimal_places=0)
    total_echec = serializers.DecimalField(max_digits=12, decimal_places=0)
    par_jour = LignePaiementJourSerializer(many=True)
    paiements_en_attente_anormalement = PaiementAnomalieSerializer(many=True)
