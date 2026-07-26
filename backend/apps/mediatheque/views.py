from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from core.pagination import PaginationParCurseur

from .models import DocumentPublic
from .serializers import DocumentPublicSerializer


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
