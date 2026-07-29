from rest_framework import serializers

from apps.paiements.serializers import PaiementSerializer

from .models import Candidature, Concours, PieceJointeCandidature


class ConcoursSerializer(serializers.ModelSerializer):
    """Lecture publique — avis de concours."""

    document_avis_url = serializers.SerializerMethodField()

    class Meta:
        model = Concours
        fields = [
            "id",
            "titre",
            "code",
            "description",
            "conditions",
            "frais_inscription",
            "date_ouverture",
            "date_cloture",
            "date_concours",
            "places_disponibles",
            "statut",
            "document_avis_url",
        ]
        read_only_fields = fields

    def get_document_avis_url(self, obj: Concours) -> str:
        document = obj.document_avis
        return document.fichier.url if document and document.fichier else ""


class ConcoursBackofficeSerializer(serializers.ModelSerializer):
    """CRUD back-office (scope `concours:gerer`). `document_avis` se renseigne via
    l'action dédiée `televerser_avis` (téléversement direct), jamais en écrivant
    l'identifiant de `DocumentPublic` à la main."""

    document_avis_url = serializers.SerializerMethodField()

    class Meta:
        model = Concours
        fields = [
            "id",
            "titre",
            "code",
            "description",
            "conditions",
            "frais_inscription",
            "date_ouverture",
            "date_cloture",
            "date_concours",
            "places_disponibles",
            "statut",
            "document_avis_url",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = ["id", "document_avis_url", "cree_le", "modifie_le"]

    def get_document_avis_url(self, obj: Concours) -> str:
        document = obj.document_avis
        return document.fichier.url if document and document.fichier else ""


class AvisConcoursUploadSerializer(serializers.Serializer):
    fichier = serializers.FileField()

    def validate_fichier(self, valeur):
        if not valeur.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Seul le format PDF est accepté.")
        taille_max_mo = 15
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class AvisConcoursReponseSerializer(serializers.Serializer):
    document_avis_url = serializers.CharField()


class CandidatureCreationSerializer(serializers.ModelSerializer):
    """POST public — dépôt de candidature (§7.4)."""

    class Meta:
        model = Candidature
        fields = [
            "concours",
            "candidat_nom",
            "candidat_prenom",
            "candidat_email",
            "candidat_telephone",
            "niveau_etude",
            "experience",
        ]

    def validate_concours(self, valeur: Concours) -> Concours:
        if not valeur.est_ouvert():
            raise serializers.ValidationError("Ce concours n'est pas ouvert aux candidatures.")
        return valeur


class CandidatureAccuseSerializer(serializers.ModelSerializer):
    paiement = serializers.SerializerMethodField()

    class Meta:
        model = Candidature
        fields = ["id", "numero_suivi", "code_suivi", "statut", "paiement", "cree_le"]
        read_only_fields = fields

    def get_paiement(self, obj: Candidature) -> dict | None:
        paiement = obj.paiement()
        return PaiementSerializer(paiement).data if paiement else None


class PieceJointeCandidatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PieceJointeCandidature
        fields = ["id", "type_piece", "fichier", "empreinte_sha256", "statut_controle", "cree_le"]
        read_only_fields = ["id", "empreinte_sha256", "statut_controle", "cree_le"]

    def validate_fichier(self, valeur):
        extensions_autorisees = (".jpg", ".jpeg", ".png", ".pdf")
        if not valeur.name.lower().endswith(extensions_autorisees):
            raise serializers.ValidationError("Formats acceptés : JPG, PNG, PDF.")
        taille_max_mo = 8
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class CandidatureStatutPubliqueSerializer(serializers.ModelSerializer):
    """Suivi public restreint (numéro + code)."""

    concours = ConcoursSerializer(read_only=True)
    paiement = serializers.SerializerMethodField()

    class Meta:
        model = Candidature
        fields = ["numero_suivi", "statut", "concours", "motif_rejet", "paiement", "cree_le"]
        read_only_fields = fields

    def get_paiement(self, obj: Candidature) -> dict | None:
        paiement = obj.paiement()
        return PaiementSerializer(paiement).data if paiement else None


class CandidatureInstructionSerializer(serializers.ModelSerializer):
    """Vue complète pour l'instruction back-office (scope `concours:instruire`)."""

    concours = ConcoursSerializer(read_only=True)
    pieces = PieceJointeCandidatureSerializer(many=True, read_only=True)
    paiement = serializers.SerializerMethodField()

    class Meta:
        model = Candidature
        fields = [
            "id",
            "numero_suivi",
            "statut",
            "candidat_nom",
            "candidat_prenom",
            "candidat_email",
            "candidat_telephone",
            "niveau_etude",
            "experience",
            "concours",
            "motif_rejet",
            "pieces",
            "paiement",
            "cree_le",
            "date_instruction",
        ]
        read_only_fields = fields

    def get_paiement(self, obj: Candidature) -> dict | None:
        paiement = obj.paiement()
        return PaiementSerializer(paiement).data if paiement else None


class TransitionCandidatureSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            "instruire",
            "demander_pieces",
            "declarer_admissible",
            "convoquer",
            "admettre",
            "rejeter",
        ]
    )
    motif = serializers.CharField(required=False, allow_blank=True, default="")


class RenvoiSuiviCandidatureSerializer(serializers.Serializer):
    email = serializers.EmailField(
        help_text="Adresse renseignée lors du dépôt — sert à retrouver les candidatures associées."
    )


class RenvoiSuiviCandidatureReponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class ConfirmationPaiementMockSerializer(serializers.Serializer):
    code = serializers.CharField(help_text="Code de suivi de la candidature.")


class VerificationConvocationSerializer(serializers.Serializer):
    jeton = serializers.CharField(help_text="Contenu brut du QR (JWS compact).")


class VerificationConvocationReponseSerializer(serializers.Serializer):
    valide = serializers.BooleanField()
    detail = serializers.CharField(required=False)
    charge = serializers.DictField(required=False)
