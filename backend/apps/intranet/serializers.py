from rest_framework import serializers

from .models import NoteDeService


class NoteDeServiceSerializer(serializers.ModelSerializer):
    """Lecture agent — notes visibles par le périmètre de l'utilisateur courant."""

    perimetre_cible: serializers.SlugRelatedField = serializers.SlugRelatedField(
        slug_field="code", read_only=True
    )
    perimetre_cible_libelle = serializers.CharField(
        source="perimetre_cible.libelle", read_only=True
    )
    lu = serializers.SerializerMethodField()

    class Meta:
        model = NoteDeService
        fields = [
            "id",
            "titre",
            "contenu",
            "perimetre_cible",
            "perimetre_cible_libelle",
            "accuse_lecture_requis",
            "cree_le",
            "lu",
        ]
        read_only_fields = fields

    def get_lu(self, obj: NoteDeService) -> bool:
        utilisateur = self.context["request"].user
        return obj.accuses_lecture.filter(utilisateur=utilisateur).exists()


class NoteDeServiceBackofficeSerializer(serializers.ModelSerializer):
    """CRUD back-office (scope `intranet:publier`)."""

    perimetre_cible_libelle = serializers.CharField(
        source="perimetre_cible.libelle", read_only=True
    )
    nombre_lectures = serializers.IntegerField(source="accuses_lecture.count", read_only=True)

    class Meta:
        model = NoteDeService
        fields = [
            "id",
            "titre",
            "contenu",
            "perimetre_cible",
            "perimetre_cible_libelle",
            "accuse_lecture_requis",
            "publie",
            "nombre_lectures",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = [
            "id",
            "perimetre_cible_libelle",
            "nombre_lectures",
            "cree_le",
            "modifie_le",
        ]
