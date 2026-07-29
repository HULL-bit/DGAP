from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import AccuseLectureNote, NoteDeService, notes_visibles_par
from .permissions import EstAgentInterne, PeutPublierNotes
from .serializers import NoteDeServiceBackofficeSerializer, NoteDeServiceSerializer


class NoteDeServiceListView(ListAPIView):
    """GET /api/v1/intranet/notes — notes de service visibles par l'agent courant
    (§6.3 : ciblage national/direction/établissement), les plus récentes d'abord."""

    serializer_class = NoteDeServiceSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [MFAConfirmee, EstAgentInterne]

    def get_queryset(self):
        return notes_visibles_par(self.request.user).select_related("perimetre_cible")


class NoteDeServiceDetailView(RetrieveAPIView):
    """GET /api/v1/intranet/notes/{id}."""

    serializer_class = NoteDeServiceSerializer
    permission_classes = [MFAConfirmee, EstAgentInterne]

    def get_queryset(self):
        return notes_visibles_par(self.request.user).select_related("perimetre_cible")


class AccuseLectureView(APIView):
    """POST /api/v1/intranet/notes/{id}/lecture — enregistre l'accusé de lecture de
    l'agent courant (idempotent : un second appel ne crée pas de doublon)."""

    permission_classes = [MFAConfirmee, EstAgentInterne]

    @extend_schema(request=None, responses=NoteDeServiceSerializer)
    def post(self, request, pk):
        note = get_object_or_404(
            notes_visibles_par(request.user).select_related("perimetre_cible"), pk=pk
        )
        AccuseLectureNote.objects.get_or_create(note=note, utilisateur=request.user)
        return Response(NoteDeServiceSerializer(note, context={"request": request}).data)


class NoteDeServiceBackofficeListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/intranet/notes — gestion (scope `intranet:publier`)."""

    serializer_class = NoteDeServiceBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutPublierNotes]
    pagination_class = PaginationParCurseur
    queryset = NoteDeService.objects.select_related("perimetre_cible")


class NoteDeServiceBackofficeDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/backoffice/intranet/notes/{id}."""

    serializer_class = NoteDeServiceBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutPublierNotes]
    queryset = NoteDeService.objects.select_related("perimetre_cible")
