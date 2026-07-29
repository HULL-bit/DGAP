from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.paiements.models import Paiement, StatutPaiement
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import EchangeExterne
from .permissions import PeutConsulterInterop, PeutGererInterop
from .serializers import (
    EchangeExterneCreationSerializer,
    EchangeExterneSerializer,
    RapprochementPaiementsSerializer,
)

#: Au-delà de ce délai, un paiement encore « en attente » est signalé comme une
#: anomalie de rapprochement (EF-1404) — pas de blocage automatique, seulement
#: un signalement à charge de l'agent.
DELAI_ANOMALIE_JOURS = 3


class EchangeExterneListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/interop/echanges?systeme=&direction=&statut=
    — journal des échanges externes (EF-1401) : consultation, et
    enregistrement manuel d'un échange effectué hors connecteur (pour ne
    jamais laisser un échange manuel non tracé)."""

    pagination_class = PaginationParCurseur

    def get_permissions(self):
        classes = [
            MFAConfirmee,
            PeutGererInterop if self.request.method == "POST" else PeutConsulterInterop,
        ]
        return [c() for c in classes]

    def get_serializer_class(self):
        return (
            EchangeExterneCreationSerializer
            if self.request.method == "POST"
            else EchangeExterneSerializer
        )

    def get_queryset(self):
        qs = EchangeExterne.objects.select_related("acteur")
        for champ in ("systeme", "direction", "statut"):
            valeur = self.request.query_params.get(champ)
            if valeur:
                qs = qs.filter(**{champ: valeur})
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        echange = EchangeExterne.tracer(acteur=request.user, **serializer.validated_data)
        return Response(EchangeExterneSerializer(echange).data, status=status.HTTP_201_CREATED)


class RapprochementPaiementsView(APIView):
    """GET /api/v1/backoffice/interop/rapprochement-paiements?depuis=&jusqu_a=
    — état de rapprochement (EF-1404), calculé sur le grand livre mock existant
    d'`apps.paiements` (aucune passerelle réelle intégrée, voir son docstring)."""

    permission_classes = [MFAConfirmee, PeutConsulterInterop]

    @extend_schema(responses=RapprochementPaiementsSerializer)
    def get(self, request):
        qs = Paiement.objects.all()
        depuis = request.query_params.get("depuis")
        if depuis and (date_depuis := parse_date(depuis)):
            qs = qs.filter(cree_le__date__gte=date_depuis)
        jusqu_a = request.query_params.get("jusqu_a")
        if jusqu_a and (date_jusqu_a := parse_date(jusqu_a)):
            qs = qs.filter(cree_le__date__lte=date_jusqu_a)

        totaux_par_statut = {
            ligne["statut"]: ligne["total"] or 0
            for ligne in qs.values("statut").annotate(total=Sum("montant")).order_by()
        }

        par_jour = [
            {
                "jour": ligne["jour"],
                "statut": ligne["statut"],
                "nombre": ligne["nombre"],
                "montant_total": ligne["montant_total"] or 0,
            }
            for ligne in qs.annotate(jour=TruncDate("cree_le"))
            .values("jour", "statut")
            .annotate(nombre=Count("id"), montant_total=Sum("montant"))
            .order_by("jour")
        ]

        seuil_anomalie = timezone.now() - timedelta(days=DELAI_ANOMALIE_JOURS)
        anomalies = qs.filter(
            statut=StatutPaiement.EN_ATTENTE, cree_le__lt=seuil_anomalie
        ).order_by("cree_le")

        return Response(
            {
                "total_paye": totaux_par_statut.get(StatutPaiement.PAYE, 0),
                "total_en_attente": totaux_par_statut.get(StatutPaiement.EN_ATTENTE, 0),
                "total_echec": totaux_par_statut.get(StatutPaiement.ECHEC, 0),
                "par_jour": par_jour,
                "paiements_en_attente_anormalement": [
                    {
                        "reference": p.reference,
                        "montant": p.montant,
                        "moyen": p.moyen,
                        "cree_le": p.cree_le,
                    }
                    for p in anomalies
                ],
            }
        )
