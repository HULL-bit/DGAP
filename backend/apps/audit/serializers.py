from rest_framework import serializers

from .models import JournalAction


class JournalActionSerializer(serializers.ModelSerializer):
    acteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = JournalAction
        fields = [
            "id",
            "acteur_nom",
            "action",
            "ressource_type",
            "ressource_id",
            "horodatage",
            "adresse_ip",
            "correlation_id",
            "detail",
        ]
        read_only_fields = fields

    def get_acteur_nom(self, obj: JournalAction) -> str:
        return obj.acteur.get_full_name() if obj.acteur else ""
