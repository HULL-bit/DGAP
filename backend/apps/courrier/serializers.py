from rest_framework import serializers

from .models import AffectationCourrier, CourrierEntrant, CourrierSortant, ReponseCourrier


class AffectationCourrierSerializer(serializers.ModelSerializer):
    perimetre_libelle = serializers.CharField(
        source="perimetre.libelle", read_only=True, default=""
    )
    agent_nom = serializers.SerializerMethodField()
    affecte_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = AffectationCourrier
        fields = [
            "id",
            "perimetre_libelle",
            "agent_nom",
            "instructions",
            "affecte_par_nom",
            "cree_le",
        ]
        read_only_fields = fields

    def get_agent_nom(self, obj: AffectationCourrier) -> str:
        return obj.agent.get_full_name() if obj.agent else ""

    def get_affecte_par_nom(self, obj: AffectationCourrier) -> str:
        return obj.cree_par.get_full_name() if obj.cree_par else ""


class ReponseCourrierSerializer(serializers.ModelSerializer):
    signataire_nom = serializers.SerializerMethodField()

    class Meta:
        model = ReponseCourrier
        fields = [
            "id",
            "courrier",
            "contenu",
            "statut",
            "signataire_nom",
            "date_signature",
            "cree_le",
        ]
        read_only_fields = [
            "id",
            "courrier",
            "statut",
            "signataire_nom",
            "date_signature",
            "cree_le",
        ]

    def get_signataire_nom(self, obj: ReponseCourrier) -> str:
        return obj.signataire.get_full_name() if obj.signataire else ""


class TransitionReponseSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["viser", "valider", "rejeter", "expedier"])


class CourrierEntrantListeSerializer(serializers.ModelSerializer):
    perimetre_affecte_libelle = serializers.CharField(
        source="perimetre_affecte.libelle", read_only=True, default=""
    )
    agent_affecte_nom = serializers.SerializerMethodField()

    class Meta:
        model = CourrierEntrant
        fields = [
            "id",
            "numero",
            "expediteur",
            "objet",
            "date_reception",
            "confidentialite",
            "statut",
            "perimetre_affecte_libelle",
            "agent_affecte_nom",
            "delai_reponse",
            "est_en_retard",
            "cree_le",
        ]
        read_only_fields = fields

    def get_agent_affecte_nom(self, obj: CourrierEntrant) -> str:
        return obj.agent_affecte.get_full_name() if obj.agent_affecte else ""


class CourrierEntrantDetailSerializer(CourrierEntrantListeSerializer):
    fichier_url = serializers.SerializerMethodField()
    affectations = AffectationCourrierSerializer(many=True, read_only=True)
    reponses = ReponseCourrierSerializer(many=True, read_only=True)

    class Meta(CourrierEntrantListeSerializer.Meta):
        fields = [
            *CourrierEntrantListeSerializer.Meta.fields,
            "instructions",
            "fichier_url",
            "affectations",
            "reponses",
        ]
        read_only_fields = fields

    def get_fichier_url(self, obj: CourrierEntrant) -> str:
        return obj.fichier.url if obj.fichier else ""


class CourrierEntrantCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourrierEntrant
        fields = ["id", "expediteur", "objet", "date_reception", "confidentialite", "numero"]
        read_only_fields = ["id", "numero"]


class TransitionCourrierSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["affecter", "reaffecter", "prendre_en_charge", "traiter", "cloturer"]
    )
    perimetre = serializers.UUIDField(required=False, allow_null=True)
    agent = serializers.UUIDField(required=False, allow_null=True)
    instructions = serializers.CharField(required=False, allow_blank=True, default="")


class FichierCourrierUploadSerializer(serializers.Serializer):
    fichier = serializers.FileField()

    def validate_fichier(self, valeur):
        if not valeur.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Seul le format PDF est accepté.")
        taille_max_mo = 15
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class FichierCourrierReponseSerializer(serializers.Serializer):
    fichier_url = serializers.CharField()


class CourrierSortantSerializer(serializers.ModelSerializer):
    fichier_url = serializers.SerializerMethodField()
    perimetre_libelle = serializers.CharField(
        source="perimetre.libelle", read_only=True, default=""
    )

    class Meta:
        model = CourrierSortant
        fields = [
            "id",
            "numero",
            "destinataire",
            "objet",
            "date_envoi",
            "statut",
            "fichier_url",
            "perimetre",
            "perimetre_libelle",
            "reponse_source",
            "cree_le",
        ]
        read_only_fields = ["id", "numero", "fichier_url", "perimetre_libelle", "cree_le"]

    def get_fichier_url(self, obj: CourrierSortant) -> str:
        return obj.fichier.url if obj.fichier else ""
