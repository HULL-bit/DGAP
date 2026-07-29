from rest_framework import serializers

from .models import Document, LienPartage, VersionDocument


class VersionDocumentSerializer(serializers.ModelSerializer):
    fichier_url = serializers.SerializerMethodField()
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = VersionDocument
        fields = [
            "id",
            "numero",
            "fichier_url",
            "empreinte_sha256",
            "commentaire",
            "auteur_nom",
            "cree_le",
        ]
        read_only_fields = fields

    def get_fichier_url(self, obj: VersionDocument) -> str:
        return obj.fichier.url if obj.fichier else ""

    def get_auteur_nom(self, obj: VersionDocument) -> str:
        return obj.cree_par.get_full_name() if obj.cree_par else ""


class DocumentListeSerializer(serializers.ModelSerializer):
    perimetre_libelle = serializers.CharField(
        source="perimetre.libelle", read_only=True, default=""
    )
    verrouille_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "titre",
            "nature",
            "categorie",
            "perimetre_libelle",
            "statut_ocr",
            "statut_cycle_vie",
            "est_verrouille",
            "verrouille_par_nom",
            "empreinte_sha256",
            "cree_le",
        ]
        read_only_fields = fields

    def get_verrouille_par_nom(self, obj: Document) -> str:
        return obj.verrouille_par.get_full_name() if obj.verrouille_par else ""


class DocumentDetailSerializer(DocumentListeSerializer):
    fichier_url = serializers.SerializerMethodField()
    versions = VersionDocumentSerializer(many=True, read_only=True)

    class Meta(DocumentListeSerializer.Meta):
        fields = [
            *DocumentListeSerializer.Meta.fields,
            "contenu_ocr",
            "fichier_url",
            "gel_juridique",
            "duree_conservation_mois",
            "date_destruction_prevue",
            "versions",
        ]
        read_only_fields = fields

    def get_fichier_url(self, obj: Document) -> str:
        return obj.fichier.url if obj.fichier else ""


class DocumentCreationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "titre", "nature", "categorie", "perimetre", "fichier"]
        read_only_fields = ["id"]

    def validate_fichier(self, valeur):
        extensions_autorisees = (".pdf", ".jpg", ".jpeg", ".png")
        if not valeur.name.lower().endswith(extensions_autorisees):
            raise serializers.ValidationError("Formats acceptés : PDF, JPG, PNG.")
        taille_max_mo = 20
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class NouvelleVersionSerializer(serializers.Serializer):
    fichier = serializers.FileField()
    commentaire = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_fichier(self, valeur):
        extensions_autorisees = (".pdf", ".jpg", ".jpeg", ".png")
        if not valeur.name.lower().endswith(extensions_autorisees):
            raise serializers.ValidationError("Formats acceptés : PDF, JPG, PNG.")
        taille_max_mo = 20
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class LienPartageCreationSerializer(serializers.Serializer):
    duree_heures = serializers.IntegerField(min_value=1, max_value=24 * 30, default=72)


class LienPartageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LienPartage
        fields = ["id", "jeton", "expire_le", "est_expire", "cree_le"]
        read_only_fields = fields


class TelechargementPartageSerializer(serializers.Serializer):
    fichier_url = serializers.CharField(read_only=True)
    titre = serializers.CharField(read_only=True)
