from rest_framework import serializers

from .models import FAQ, Contact


class ContactCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ["nom", "email", "telephone", "sujet", "message"]

    def validate_message(self, valeur: str) -> str:
        if len(valeur.strip()) < 10:
            raise serializers.ValidationError(
                "Merci de détailler votre message (10 caractères minimum)."
            )
        return valeur


class ContactAccuseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ["numero_ticket", "sujet", "cree_le"]
        read_only_fields = fields


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ["id", "question", "reponse", "categorie", "ordre"]
        read_only_fields = fields
