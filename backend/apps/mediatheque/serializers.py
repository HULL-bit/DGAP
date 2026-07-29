from rest_framework import serializers

from .models import DocumentPublic, Galerie, MediaGalerie, TypeMedia


class DocumentPublicSerializer(serializers.ModelSerializer):
    fichier_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPublic
        fields = [
            "id",
            "titre",
            "nature",
            "numero",
            "date_texte",
            "statut",
            "categorie",
            "fichier_url",
        ]
        read_only_fields = fields

    def get_fichier_url(self, obj: DocumentPublic) -> str:
        return obj.fichier.url if obj.fichier else ""


class DocumentPublicBackofficeSerializer(serializers.ModelSerializer):
    """CRUD back-office (scope `documents:gerer`) — `fichier_url` est calculée
    (jamais stockée telle quelle) : renseignée par l'action dédiée de téléversement,
    jamais saisie à la main (évite un lien mort ou pointant hors du site)."""

    fichier_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPublic
        fields = [
            "id",
            "titre",
            "nature",
            "numero",
            "date_texte",
            "statut",
            "categorie",
            "fichier_url",
            "publie",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = ["id", "fichier_url", "cree_le", "modifie_le"]

    def get_fichier_url(self, obj: DocumentPublic) -> str:
        return obj.fichier.url if obj.fichier else ""


class FichierDocumentUploadSerializer(serializers.Serializer):
    fichier = serializers.FileField()

    def validate_fichier(self, valeur):
        if not valeur.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Seul le format PDF est accepté.")
        taille_max_mo = 15
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class FichierDocumentReponseSerializer(serializers.Serializer):
    fichier_url = serializers.CharField()


class MediaGalerieSerializer(serializers.ModelSerializer):
    """Écriture back-office : image en multipart (type IMAGE) ou lien (type VIDEO)."""

    class Meta:
        model = MediaGalerie
        fields = ["id", "type", "image", "video_url", "legende", "ordre", "publie", "cree_le"]
        read_only_fields = ["id", "cree_le"]

    def validate(self, attrs):
        type_media = attrs.get("type", getattr(self.instance, "type", None))
        image = attrs.get("image", getattr(self.instance, "image", None))
        video_url = attrs.get("video_url", getattr(self.instance, "video_url", ""))
        if type_media == TypeMedia.IMAGE and not image:
            raise serializers.ValidationError({"image": "Une image est requise."})
        if type_media == TypeMedia.VIDEO and not video_url:
            raise serializers.ValidationError({"video_url": "Un lien vidéo est requis."})
        return attrs

    def validate_image(self, valeur):
        if not valeur:
            return valeur
        extensions_autorisees = (".jpg", ".jpeg", ".png", ".webp")
        if not valeur.name.lower().endswith(extensions_autorisees):
            raise serializers.ValidationError("Formats acceptés : JPG, PNG, WEBP.")
        taille_max_mo = 8
        if valeur.size > taille_max_mo * 1024 * 1024:
            raise serializers.ValidationError(f"Fichier trop volumineux (max {taille_max_mo} Mo).")
        return valeur


class MediaGaleriePubliqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaGalerie
        fields = ["id", "type", "image", "video_url", "legende", "ordre"]
        read_only_fields = fields


class GalerieResumeSerializer(serializers.ModelSerializer):
    """Vignette de galerie pour les grilles publiques (ateliers de réinsertion,
    accueil…) — une couverture et un total plutôt que la liste complète des médias,
    pour ne pas alourdir une requête qui porte sur plusieurs dizaines de galeries."""

    couverture = serializers.SerializerMethodField()
    nombre_medias = serializers.SerializerMethodField()

    class Meta:
        model = Galerie
        fields = ["id", "code", "titre", "description", "couverture", "nombre_medias"]
        read_only_fields = fields

    def get_couverture(self, obj: Galerie) -> str:
        premiere_image = next(
            (m for m in obj.medias.all() if m.publie and m.type == TypeMedia.IMAGE and m.image),
            None,
        )
        return premiere_image.image.url if premiere_image else ""

    def get_nombre_medias(self, obj: Galerie) -> int:
        return sum(1 for m in obj.medias.all() if m.publie)


class GaleriePubliqueSerializer(serializers.ModelSerializer):
    """Lecture publique — uniquement les médias publiés, dans l'ordre."""

    medias = serializers.SerializerMethodField()

    class Meta:
        model = Galerie
        fields = ["id", "code", "titre", "description", "medias"]
        read_only_fields = fields

    def get_medias(self, obj: Galerie) -> list[dict]:
        medias = obj.medias.filter(publie=True).order_by("ordre", "cree_le")
        return list(MediaGaleriePubliqueSerializer(medias, many=True, context=self.context).data)


class GalerieBackofficeSerializer(serializers.ModelSerializer):
    medias = MediaGalerieSerializer(many=True, read_only=True)

    class Meta:
        model = Galerie
        fields = ["id", "code", "titre", "description", "medias", "cree_le", "modifie_le"]
        read_only_fields = ["id", "medias", "cree_le", "modifie_le"]
