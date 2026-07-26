from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from core.pagination import PaginationParCurseur

from .models import Etablissement
from .serializers import EtablissementSerializer


class EtablissementListView(ListAPIView):
    """GET /api/v1/etablissements?region=&type=&q= — annuaire public (§7.2)."""

    serializer_class = EtablissementSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [AllowAny]

    def get_queryset(self):
        # django-stubs : accès à un manager générique via la classe, faux positif connu.
        qs = Etablissement.objets.select_related(  # type: ignore[misc]
            "type", "direction_regionale", "region"
        ).filter(actif=True)
        region = self.request.query_params.get("region")
        if region:
            qs = qs.filter(region__code=region)
        type_code = self.request.query_params.get("type")
        if type_code:
            qs = qs.filter(type__code=type_code)
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(nom__icontains=recherche)
        return qs


class EtablissementDetailView(RetrieveAPIView):
    """GET /api/v1/etablissements/{id} — fiche établissement, publique."""

    queryset = Etablissement.objets.select_related(  # type: ignore[misc]
        "type", "direction_regionale", "region"
    ).filter(actif=True)
    serializer_class = EtablissementSerializer
    permission_classes = [AllowAny]
