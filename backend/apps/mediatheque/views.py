from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contenus.permissions import PeutRedigerContenu
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import DocumentPublic, Galerie, MediaGalerie
from .permissions import PeutGererDocuments
from .serializers import (
    DocumentPublicBackofficeSerializer,
    DocumentPublicSerializer,
    FichierDocumentReponseSerializer,
    FichierDocumentUploadSerializer,
    GalerieBackofficeSerializer,
    GaleriePubliqueSerializer,
    GalerieResumeSerializer,
    MediaGalerieSerializer,
)


class DocumentPublicListView(ListAPIView):
    """GET /api/v1/documents?categorie=&q= — publications officielles (§7.2)."""

    serializer_class = DocumentPublicSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = DocumentPublic.objects.filter(publie=True)
        categorie = self.request.query_params.get("categorie")
        if categorie:
            qs = qs.filter(categorie=categorie)
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(titre__icontains=recherche)
        return qs


class DocumentPublicBackofficeListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/documents — gestion des documents officiels
    (scope `documents:gerer`)."""

    serializer_class = DocumentPublicBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutGererDocuments]
    pagination_class = PaginationParCurseur
    queryset = DocumentPublic.objects.all()


class DocumentPublicBackofficeDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/backoffice/documents/{id}."""

    serializer_class = DocumentPublicBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutGererDocuments]
    queryset = DocumentPublic.objects.all()


class FichierDocumentUploadView(APIView):
    """POST /api/v1/backoffice/documents/{id}/fichier — téléverse le PDF. `fichier`
    est un `FileField` réel : l'URL exposée par l'API est presignée à la lecture,
    jamais persistée (voir `DocumentPublic.fichier`)."""

    permission_classes = [MFAConfirmee, PeutGererDocuments]

    @extend_schema(
        request=FichierDocumentUploadSerializer, responses=FichierDocumentReponseSerializer
    )
    def post(self, request, pk):
        document = get_object_or_404(DocumentPublic, pk=pk)
        serializer = FichierDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document.fichier = serializer.validated_data["fichier"]
        document.save(update_fields=["fichier"])

        return Response({"fichier_url": document.fichier.url}, status=201)


class GalerieListePubliqueView(ListAPIView):
    """GET /api/v1/galeries?prefixe=reinsertion- — vignettes (couverture + total) des
    galeries dont le code commence par `prefixe` : alimente les grilles publiques
    (ateliers de réinsertion sur l'accueil et sur leur page dédiée) sans nécessiter
    treize requêtes séparées. Sans `prefixe`, renvoie toutes les galeries."""

    serializer_class = GalerieResumeSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Galerie.objects.prefetch_related("medias").order_by("titre")
        prefixe = self.request.query_params.get("prefixe")
        if prefixe:
            qs = qs.filter(code__startswith=prefixe)
        return qs


class GaleriePubliqueView(RetrieveAPIView):
    """GET /api/v1/galeries/{code} — médias publiés d'une galerie (carrousel, réinsertion,
    vie des détenus, article) consommés par le portail public."""

    serializer_class = GaleriePubliqueSerializer
    permission_classes = [AllowAny]
    lookup_field = "code"
    lookup_url_kwarg = "code"
    queryset = Galerie.objects.prefetch_related("medias")


class GalerieBackofficeListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/galeries — gestion des galeries (scope `contenus:rediger`)."""

    serializer_class = GalerieBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutRedigerContenu]
    queryset = Galerie.objects.prefetch_related("medias")


class GalerieBackofficeDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/backoffice/galeries/{id}."""

    serializer_class = GalerieBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutRedigerContenu]
    queryset = Galerie.objects.prefetch_related("medias")


class MediaGalerieCreationView(APIView):
    """POST /api/v1/backoffice/galeries/{galerie_id}/medias — ajoute une image (multipart)
    ou un lien vidéo (JSON) à une galerie."""

    permission_classes = [MFAConfirmee, PeutRedigerContenu]

    @extend_schema(request=MediaGalerieSerializer, responses=MediaGalerieSerializer)
    def post(self, request, galerie_id):
        galerie = get_object_or_404(Galerie, pk=galerie_id)
        donnees = request.data.copy()
        # DRF's BooleanField traite un champ absent comme False pour les requêtes
        # multipart (sémantique case à cocher HTML) — sans ce filet, un téléversement
        # d'image qui omet `publie` serait créé dépublié par défaut au lieu du
        # comportement attendu (visible par défaut, comme pour le JSON).
        donnees.setdefault("publie", True)
        serializer = MediaGalerieSerializer(data=donnees)
        serializer.is_valid(raise_exception=True)
        media = serializer.save(galerie=galerie)
        return Response(MediaGalerieSerializer(media).data, status=201)


class MediaGalerieDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/backoffice/medias/{id} — réordonner, légender, dépublier,
    supprimer un média (l'affectation à une galerie ne change jamais après création)."""

    serializer_class = MediaGalerieSerializer
    permission_classes = [MFAConfirmee, PeutRedigerContenu]
    queryset = MediaGalerie.objects.all()
