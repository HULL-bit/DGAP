from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Action, JournalAction

from .models import FAQ
from .serializers import ContactAccuseSerializer, ContactCreationSerializer, FAQSerializer


class ContactCreationView(APIView):
    """POST /api/v1/contacts — formulaire tracé, accusé automatique avec n° de ticket (§7.2).

    Note d'exploitation : l'envoi de l'accusé par e-mail/SMS est délégué à
    `apps.notifications` (non encore livrée) — la création du ticket est
    fonctionnelle dès maintenant, l'envoi effectif suivra au Bloc B/D.
    """

    permission_classes = [AllowAny]
    throttle_scope = "depot-demande"

    @extend_schema(request=ContactCreationSerializer, responses=ContactAccuseSerializer)
    def post(self, request):
        serializer = ContactCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()

        JournalAction.tracer(
            acteur=request.user,
            action=Action.CREER,
            ressource_type="contact",
            ressource_id=str(contact.id),
            requete=request,
        )
        return Response(ContactAccuseSerializer(contact).data, status=status.HTTP_201_CREATED)


class FAQListView(ListAPIView):
    """GET /api/v1/faq?categorie= — questions fréquentes publiées."""

    serializer_class = FAQSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = FAQ.objects.filter(publie=True)
        categorie = self.request.query_params.get("categorie")
        if categorie:
            qs = qs.filter(categorie=categorie)
        return qs
