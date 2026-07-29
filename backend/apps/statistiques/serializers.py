from rest_framework import serializers


class RepartitionSerializer(serializers.Serializer):
    cle = serializers.CharField()
    total = serializers.IntegerField()


class RepartitionMensuelleSerializer(serializers.Serializer):
    mois = serializers.CharField(help_text="Format AAAA-MM.")
    total = serializers.IntegerField()


class StatistiquesVisitesSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    par_statut = RepartitionSerializer(many=True)
    par_etablissement = RepartitionSerializer(many=True)
    par_mois = RepartitionMensuelleSerializer(many=True)


class StatistiquesConcoursSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    par_statut = RepartitionSerializer(many=True)
    par_concours = RepartitionSerializer(many=True)
    par_mois = RepartitionMensuelleSerializer(many=True)
