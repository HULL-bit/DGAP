from django.db.models import Count
from django.db.models.functions import TruncMonth
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.concours.models import Candidature
from apps.visites.models import DemandeVisite
from core.permissions import MFAConfirmee

from .permissions import PeutLireStatistiques
from .serializers import StatistiquesConcoursSerializer, StatistiquesVisitesSerializer


def _repartition_par_mois(queryset, champ_date: str) -> list[dict]:
    lignes = (
        queryset.annotate(mois=TruncMonth(champ_date))
        .values("mois")
        .annotate(total=Count("id"))
        .order_by("mois")
    )
    return [{"mois": ligne["mois"].strftime("%Y-%m"), "total": ligne["total"]} for ligne in lignes]


class StatistiquesVisitesView(APIView):
    """GET /api/v1/backoffice/statistiques/visites?region=&etablissement= — tableau
    de bord thématique Visites (EF-1102), calculé à la volée sur les données de
    production (`apps.visites`) — pas d'entrepôt de données (EF-1106) à ce stade."""

    permission_classes = [MFAConfirmee, PeutLireStatistiques]

    @extend_schema(
        parameters=[
            OpenApiParameter("region", str, description="Code région (filtre)."),
            OpenApiParameter("etablissement", str, description="Code établissement (filtre)."),
        ],
        responses=StatistiquesVisitesSerializer,
    )
    def get(self, request):
        qs = DemandeVisite.objets.select_related("etablissement")
        region = request.query_params.get("region")
        etablissement = request.query_params.get("etablissement")
        if region:
            qs = qs.filter(etablissement__region__code=region)
        if etablissement:
            qs = qs.filter(etablissement__code=etablissement)

        par_statut = [
            {"cle": ligne["statut"], "total": ligne["total"]}
            for ligne in qs.values("statut").annotate(total=Count("id")).order_by("-total")
        ]
        par_etablissement = [
            {"cle": ligne["etablissement__nom"], "total": ligne["total"]}
            for ligne in qs.values("etablissement__nom")
            .annotate(total=Count("id"))
            .order_by("-total")
        ]

        return Response(
            {
                "total": qs.count(),
                "par_statut": par_statut,
                "par_etablissement": par_etablissement,
                "par_mois": _repartition_par_mois(qs, "cree_le"),
            }
        )


class StatistiquesConcoursView(APIView):
    """GET /api/v1/backoffice/statistiques/concours?concours= — tableau de bord
    thématique Concours (EF-1102), calculé à la volée sur `apps.concours`."""

    permission_classes = [MFAConfirmee, PeutLireStatistiques]

    @extend_schema(
        parameters=[
            OpenApiParameter("concours", str, description="Code du concours (filtre)."),
        ],
        responses=StatistiquesConcoursSerializer,
    )
    def get(self, request):
        qs = Candidature.objets.select_related("concours")
        concours_code = request.query_params.get("concours")
        if concours_code:
            qs = qs.filter(concours__code=concours_code)

        par_statut = [
            {"cle": ligne["statut"], "total": ligne["total"]}
            for ligne in qs.values("statut").annotate(total=Count("id")).order_by("-total")
        ]
        par_concours = [
            {"cle": ligne["concours__titre"], "total": ligne["total"]}
            for ligne in qs.values("concours__titre").annotate(total=Count("id")).order_by("-total")
        ]

        return Response(
            {
                "total": qs.count(),
                "par_statut": par_statut,
                "par_concours": par_concours,
                "par_mois": _repartition_par_mois(qs, "cree_le"),
            }
        )
