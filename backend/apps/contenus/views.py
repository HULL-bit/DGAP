from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.audit.models import Action, JournalAction
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import Article, Page, StatutContenu, TransitionInvalide
from .permissions import PeutEditerContenu, PeutRedigerContenu, PeutTransitionner
from .serializers import (
    ArticleBackofficeSerializer,
    ArticleDetailSerializer,
    ArticleListeSerializer,
    PageBackofficeSerializer,
    PageDetailSerializer,
    TransitionSerializer,
    VersionContenuSerializer,
)

EXTENSIONS_IMAGE_AUTORISEES = (".jpg", ".jpeg", ".png", ".webp")
TAILLE_IMAGE_MAX_OCTETS = 8 * 1024 * 1024


class ImageArticleUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

    def validate_image(self, valeur):
        if not valeur.name.lower().endswith(EXTENSIONS_IMAGE_AUTORISEES):
            raise serializers.ValidationError("Formats acceptés : JPG, PNG, WEBP.")
        if valeur.size > TAILLE_IMAGE_MAX_OCTETS:
            raise serializers.ValidationError("Fichier trop volumineux (max 8 Mo).")
        return valeur


class ImageArticleReponseSerializer(serializers.Serializer):
    image_url = serializers.CharField()


class ArticleListView(ListAPIView):
    """GET /api/v1/articles?rubrique=&q= — actualités publiées uniquement (§7.2)."""

    serializer_class = ArticleListeSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Article.objets.publies().select_related("rubrique")
        rubrique = self.request.query_params.get("rubrique")
        if rubrique:
            qs = qs.filter(rubrique__code=rubrique)
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(titre__icontains=recherche)
        return qs


class ArticleDetailView(RetrieveAPIView):
    """GET /api/v1/articles/{slug} — publique, uniquement les articles publiés."""

    queryset = Article.objets.publies().select_related("rubrique")
    serializer_class = ArticleDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


class PageDetailView(RetrieveAPIView):
    """GET /api/v1/pages/{slug} — pages institutionnelles publiées (À propos, Historique…)."""

    queryset = Page.objets.filter(statut=StatutContenu.PUBLIE).select_related("rubrique")
    serializer_class = PageDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"


# --- Back-office (Bloc C) ----------------------------------------------------------


class ContenuEditorialViewSetMixin(viewsets.GenericViewSet):
    """Actions communes de workflow/versions pour les ViewSets Article/Page back-office.

    Le `queryset` de chaque sous-classe concrète pointe déjà sur `tous_les_objets`
    (tous statuts confondus) : le back-office doit voir les brouillons et contenus
    en relecture, contrairement à l'API publique (Bloc B) limitée aux publiés.
    """

    permission_classes = [MFAConfirmee, PeutEditerContenu]
    pagination_class = PaginationParCurseur

    #: Actions réservées aux rédacteurs (création/modification/suppression du contenu).
    actions_redaction = {"create", "update", "partial_update", "destroy", "restaurer"}

    def get_permissions(self):
        if self.action in self.actions_redaction:
            return [MFAConfirmee(), PeutRedigerContenu()]
        if self.action == "transition":
            return [MFAConfirmee(), PeutEditerContenu(), PeutTransitionner()]
        return [MFAConfirmee(), PeutEditerContenu()]

    def perform_create(self, serializer):
        instance = serializer.save(cree_par=self.request.user, modifie_par=self.request.user)
        instance.creer_version(acteur=self.request.user, commentaire="Création")
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.CREER,
            ressource_type=instance._meta.db_table,
            ressource_id=str(instance.pk),
            requete=self.request,
        )

    def perform_update(self, serializer):
        instance = serializer.save(modifie_par=self.request.user)
        instance.creer_version(acteur=self.request.user, commentaire="Modification")
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.MODIFIER,
            ressource_type=instance._meta.db_table,
            ressource_id=str(instance.pk),
            requete=self.request,
        )

    @extend_schema(request=TransitionSerializer, responses=None)
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        """POST .../{id}/transition — {"action": "soumettre|valider|..."}.

        Actions possibles : soumettre, valider, rejeter, publier, archiver, reactiver.
        Voir `TRANSITIONS_AUTORISEES` (models.py) pour la matrice complète.
        """
        serializeur = TransitionSerializer(data=request.data)
        serializeur.is_valid(raise_exception=True)
        instance = self.get_object()
        try:
            instance.transitionner(
                serializeur.validated_data["action"],
                acteur=request.user,
                commentaire=serializeur.validated_data.get("commentaire", ""),
            )
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        JournalAction.tracer(
            acteur=request.user,
            action=Action.VALIDER,
            ressource_type=instance._meta.db_table,
            ressource_id=str(instance.pk),
            requete=request,
            detail={"transition": serializeur.validated_data["action"]},
        )
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        instance = self.get_object()
        return Response(VersionContenuSerializer(instance.versions(), many=True).data)

    @action(detail=True, methods=["post"], url_path="versions/(?P<numero>[0-9]+)/restaurer")
    def restaurer(self, request, pk=None, numero=None):
        instance = self.get_object()
        version = instance.versions().filter(numero=numero).first()
        if version is None:
            return Response({"detail": "Version introuvable."}, status=status.HTTP_404_NOT_FOUND)
        instance.restaurer(version, acteur=request.user)
        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type=instance._meta.db_table,
            ressource_id=str(instance.pk),
            requete=request,
            detail={"restauration_version": int(numero)},
        )
        return Response(self.get_serializer(instance).data)


class ArticleBackofficeViewSet(ContenuEditorialViewSetMixin, viewsets.ModelViewSet):
    """CRUD + workflow éditorial des articles — `/api/v1/backoffice/articles`."""

    queryset = Article.tous_les_objets.select_related("rubrique").all()
    serializer_class = ArticleBackofficeSerializer

    @extend_schema(request=ImageArticleUploadSerializer, responses=ImageArticleReponseSerializer)
    @action(detail=True, methods=["post", "delete"], url_path="image")
    def televerser_image(self, request, pk=None):
        """POST .../{id}/image — téléverse l'image à la une. DELETE .../{id}/image —
        la retire. `image` est un `ImageField` réel (jamais un `image_url` stocké en
        base) : l'URL exposée par l'API est presignée à la lecture, jamais persistée."""
        article = self.get_object()

        if request.method == "DELETE":
            article.image.delete(save=False)
            article.modifie_par = request.user
            article.save(update_fields=["image", "modifie_par", "modifie_le"])
            JournalAction.tracer(
                acteur=request.user,
                action=Action.MODIFIER,
                ressource_type=article._meta.db_table,
                ressource_id=str(article.pk),
                requete=request,
                detail={"image_supprimee": True},
            )
            return Response({"image_url": ""})

        serializer = ImageArticleUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        article.image = serializer.validated_data["image"]
        article.modifie_par = request.user
        article.save(update_fields=["image", "modifie_par", "modifie_le"])

        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type=article._meta.db_table,
            ressource_id=str(article.pk),
            requete=request,
            detail={"image_televersee": True},
        )
        return Response({"image_url": article.image.url}, status=status.HTTP_201_CREATED)


class PageBackofficeViewSet(ContenuEditorialViewSetMixin, viewsets.ModelViewSet):
    """CRUD + workflow éditorial des pages — `/api/v1/backoffice/pages`."""

    queryset = Page.tous_les_objets.select_related("rubrique").all()
    serializer_class = PageBackofficeSerializer
