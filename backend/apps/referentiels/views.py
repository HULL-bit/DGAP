from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from .models import DirectionRegionale, Region, TypeEtablissement
from .serializers import DirectionRegionaleSerializer, RegionSerializer, TypeEtablissementSerializer


class PaginationReferentiels(PageNumberPagination):
    """Listes courtes et stables (régions, types) : pagination simple, grande taille de page."""

    page_size = 100


class RegionListView(ListAPIView):
    """GET /api/v1/referentiels/regions — public, alimente les filtres de l'annuaire."""

    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    pagination_class = PaginationReferentiels
    permission_classes = [AllowAny]


class DirectionRegionaleListView(ListAPIView):
    """GET /api/v1/referentiels/directions-regionales — public."""

    queryset = DirectionRegionale.objects.prefetch_related("regions").all()
    serializer_class = DirectionRegionaleSerializer
    pagination_class = PaginationReferentiels
    permission_classes = [AllowAny]


class TypeEtablissementListView(ListAPIView):
    """GET /api/v1/referentiels/types-etablissement — public."""

    queryset = TypeEtablissement.objects.all()
    serializer_class = TypeEtablissementSerializer
    pagination_class = PaginationReferentiels
    permission_classes = [AllowAny]
