from rest_framework import serializers

from apps.etablissements.serializers import EtablissementSerializer

from .models import DemandeVisite, PieceJointeVisite


class DemandeVisiteCreationSerializer(serializers.ModelSerializer):
    """POST public — dépôt initial (§7.3, étapes 1 à 3 du formulaire)."""

    class Meta:
        model = DemandeVisite
        fields = [
            "visiteur_nom",
            "visiteur_prenom",
            "visiteur_email",
            "visiteur_telephone",
            "lien_parente",
            "detenu_nom_declare",
            "detenu_prenom_declare",
            "etablissement",
            "date_souhaitee",
        ]


class DemandeVisiteAccuseSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeVisite
        fields = ["id", "numero_suivi", "code_suivi", "statut", "cree_le"]
        read_only_fields = fields


class PieceJointeVisiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PieceJointeVisite
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


class DemandeVisiteStatutPubliqueSerializer(serializers.ModelSerializer):
    """Suivi public restreint (numéro + code) — aucune donnée sur la personne détenue."""

    etablissement = EtablissementSerializer(read_only=True)

    class Meta:
        model = DemandeVisite
        fields = [
            "numero_suivi",
            "statut",
            "etablissement",
            "date_souhaitee",
            "motif_rejet",
            "cree_le",
        ]
        read_only_fields = fields


class DemandeVisiteInstructionSerializer(serializers.ModelSerializer):
    """Vue complète pour l'instruction back-office (scope `visites:instruire`)."""

    etablissement = EtablissementSerializer(read_only=True)
    pieces = PieceJointeVisiteSerializer(many=True, read_only=True)

    class Meta:
        model = DemandeVisite
        fields = [
            "id",
            "numero_suivi",
            "statut",
            "visiteur_nom",
            "visiteur_prenom",
            "visiteur_email",
            "visiteur_telephone",
            "lien_parente",
            "detenu_nom_declare",
            "detenu_prenom_declare",
            "etablissement",
            "date_souhaitee",
            "motif_rejet",
            "pieces",
            "cree_le",
            "date_instruction",
        ]
        read_only_fields = fields


class TransitionVisiteSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["instruire", "demander_pieces", "valider", "rejeter", "delivrer_permis"]
    )
    motif = serializers.CharField(required=False, allow_blank=True, default="")


class VerificationPermisSerializer(serializers.Serializer):
    jeton = serializers.CharField(help_text="Contenu brut du QR (JWS compact).")


class VerificationPermisReponseSerializer(serializers.Serializer):
    valide = serializers.BooleanField()
    detail = serializers.CharField(required=False)
    charge = serializers.DictField(required=False)
