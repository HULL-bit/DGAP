from rest_framework import serializers

from .models import Article, Page, Rubrique, VersionContenu


class RubriqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rubrique
        fields = ["id", "code", "titre", "parent", "ordre"]
        read_only_fields = fields


class ArticleListeSerializer(serializers.ModelSerializer):
    rubrique = RubriqueSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ["id", "titre", "slug", "chapo", "rubrique", "date_publication", "image_url"]
        read_only_fields = fields

    def get_image_url(self, obj: Article) -> str:
        return obj.image.url if obj.image else ""


class ArticleDetailSerializer(serializers.ModelSerializer):
    rubrique = RubriqueSerializer(read_only=True)
    galerie_code: serializers.SlugRelatedField = serializers.SlugRelatedField(
        source="galerie", slug_field="code", read_only=True
    )
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id",
            "titre",
            "slug",
            "chapo",
            "contenu",
            "rubrique",
            "date_publication",
            "image_url",
            "galerie_code",
            "meta_titre",
            "meta_description",
        ]
        read_only_fields = fields

    def get_image_url(self, obj: Article) -> str:
        return obj.image.url if obj.image else ""


class PageDetailSerializer(serializers.ModelSerializer):
    rubrique = RubriqueSerializer(read_only=True)

    class Meta:
        model = Page
        fields = ["id", "titre", "slug", "contenu", "rubrique", "meta_titre", "meta_description"]
        read_only_fields = fields


# --- Back-office (Bloc C) ----------------------------------------------------------


class ArticleBackofficeSerializer(serializers.ModelSerializer):
    """CRUD éditorial complet — auteur/dates en lecture seule, reste modifiable.

    `image_url` est calculée (jamais stockée telle quelle) : voir `Article.image` et
    `ArticleBackofficeViewSet.televerser_image`."""

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "id",
            "titre",
            "slug",
            "chapo",
            "contenu",
            "statut",
            "rubrique",
            "date_publication",
            "image_url",
            "galerie",
            "meta_titre",
            "meta_description",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = [
            "id",
            "statut",
            "date_publication",
            "image_url",
            "cree_le",
            "modifie_le",
        ]

    def get_image_url(self, obj: Article) -> str:
        return obj.image.url if obj.image else ""


class PageBackofficeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = [
            "id",
            "titre",
            "slug",
            "contenu",
            "statut",
            "rubrique",
            "meta_titre",
            "meta_description",
            "cree_le",
            "modifie_le",
        ]
        read_only_fields = ["id", "statut", "cree_le", "modifie_le"]


class TransitionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["soumettre", "valider", "rejeter", "publier", "archiver", "reactiver"]
    )
    commentaire = serializers.CharField(required=False, allow_blank=True, default="")


class VersionContenuSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = VersionContenu
        fields = ["id", "numero", "instantane", "auteur_nom", "commentaire", "cree_le"]
        read_only_fields = fields

    def get_auteur_nom(self, obj: VersionContenu) -> str | None:
        return obj.auteur.get_full_name() if obj.auteur else None
