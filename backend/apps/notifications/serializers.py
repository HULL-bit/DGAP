from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    objet_source_type = serializers.CharField(
        source="content_type.model", read_only=True, default=""
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "canal",
            "destinataire",
            "sujet",
            "contenu",
            "statut",
            "objet_source_type",
            "object_id",
            "cree_le",
        ]
        read_only_fields = fields
