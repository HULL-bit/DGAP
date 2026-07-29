from rest_framework.generics import ListAPIView

from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import Notification
from .permissions import PeutLireNotifications
from .serializers import NotificationSerializer


class NotificationListView(ListAPIView):
    """GET /api/v1/backoffice/notifications?canal=&statut= — journal des envois
    (EF-1405 : visibilité des échecs). Aucune réémission automatique construite à ce
    stade (pas de file de réémission) — visibilité seule."""

    serializer_class = NotificationSerializer
    permission_classes = [MFAConfirmee, PeutLireNotifications]
    pagination_class = PaginationParCurseur

    def get_queryset(self):
        qs = Notification.objects.select_related("content_type")
        canal = self.request.query_params.get("canal")
        statut = self.request.query_params.get("statut")
        if canal:
            qs = qs.filter(canal=canal)
        if statut:
            qs = qs.filter(statut=statut)
        return qs
