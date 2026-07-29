from django.utils.dateparse import parse_date
from rest_framework.generics import ListAPIView

from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import JournalAction
from .permissions import PeutConsulterAudit
from .serializers import JournalActionSerializer


class PaginationJournalAudit(PaginationParCurseur):
    ordering = "-horodatage"


class JournalActionListView(ListAPIView):
    """GET /api/v1/backoffice/audit/journal?acteur=&action=&ressource_type=&
    depuis=&jusqu_a= — consultation habilitée du journal d'audit central,
    inaltérable (EF-1504)."""

    permission_classes = [MFAConfirmee, PeutConsulterAudit]
    serializer_class = JournalActionSerializer
    pagination_class = PaginationJournalAudit

    def get_queryset(self):
        qs = JournalAction.objets.select_related("acteur")
        for param, champ in [
            ("acteur", "acteur_id"),
            ("action", "action"),
            ("ressource_type", "ressource_type"),
        ]:
            valeur = self.request.query_params.get(param)
            if valeur:
                qs = qs.filter(**{champ: valeur})
        depuis = self.request.query_params.get("depuis")
        if depuis and (date_depuis := parse_date(depuis)):
            qs = qs.filter(horodatage__date__gte=date_depuis)
        jusqu_a = self.request.query_params.get("jusqu_a")
        if jusqu_a and (date_jusqu_a := parse_date(jusqu_a)):
            qs = qs.filter(horodatage__date__lte=date_jusqu_a)
        return qs
