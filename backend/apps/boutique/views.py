from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import ProduitBoutique
from .permissions import PeutGererBoutique
from .serializers import (
    ImageProduitReponseSerializer,
    ImageProduitUploadSerializer,
    ProduitBoutiqueBackofficeSerializer,
    ProduitBoutiquePubliqueSerializer,
)


class ProduitBoutiqueListView(ListAPIView):
    """GET /api/v1/boutique/produits?categorie= — vitrine des produits disponibles (§7.2)."""

    serializer_class = ProduitBoutiquePubliqueSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = ProduitBoutique.objects.filter(disponible=True)
        categorie = self.request.query_params.get("categorie")
        if categorie:
            qs = qs.filter(categorie=categorie)
        return qs


class ProduitBoutiqueBackofficeListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/boutique/produits — gestion du catalogue
    (scope `boutique:gerer`)."""

    serializer_class = ProduitBoutiqueBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutGererBoutique]
    pagination_class = PaginationParCurseur
    queryset = ProduitBoutique.objects.all()


class ProduitBoutiqueBackofficeDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/backoffice/boutique/produits/{id}."""

    serializer_class = ProduitBoutiqueBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutGererBoutique]
    queryset = ProduitBoutique.objects.all()


class ImageProduitUploadView(APIView):
    """POST/DELETE /api/v1/backoffice/boutique/produits/{id}/image — téléverse ou
    retire la photo du produit. `image` est un `ImageField` réel : l'URL exposée par
    l'API est presignée à la lecture, jamais persistée (voir `ProduitBoutique.image`)."""

    permission_classes = [MFAConfirmee, PeutGererBoutique]

    @extend_schema(request=ImageProduitUploadSerializer, responses=ImageProduitReponseSerializer)
    def post(self, request, pk):
        produit = get_object_or_404(ProduitBoutique, pk=pk)
        serializer = ImageProduitUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        produit.image = serializer.validated_data["image"]
        produit.save(update_fields=["image", "modifie_le"])
        return Response({"image_url": produit.image.url}, status=201)

    @extend_schema(responses=ImageProduitReponseSerializer)
    def delete(self, request, pk):
        produit = get_object_or_404(ProduitBoutique, pk=pk)
        produit.image.delete(save=False)
        produit.save(update_fields=["image", "modifie_le"])
        return Response({"image_url": ""})
