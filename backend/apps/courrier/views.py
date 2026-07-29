from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Action, JournalAction
from apps.comptes.models import Perimetre, Utilisateur
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import (
    CourrierSortant,
    NiveauConfidentialite,
    ReponseCourrier,
    TransitionInvalide,
    courriers_entrants_visibles_par,
)
from .permissions import PeutConsulterCourrier, PeutGererCourrier, PeutTransitionnerReponse
from .serializers import (
    CourrierEntrantCreationSerializer,
    CourrierEntrantDetailSerializer,
    CourrierEntrantListeSerializer,
    CourrierSortantSerializer,
    FichierCourrierReponseSerializer,
    FichierCourrierUploadSerializer,
    ReponseCourrierSerializer,
    TransitionCourrierSerializer,
    TransitionReponseSerializer,
)


class CourrierEntrantListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/courrier/entrant?numero=&expediteur=&objet=&
    statut=&confidentialite= — registre du courrier entrant (EF-501, EF-506 :
    recherche multicritère). Lecture : `courrier:gerer/viser/valider`, restreinte
    en plus par confidentialité (EF-507). Création : `courrier:gerer`."""

    pagination_class = PaginationParCurseur

    def get_permissions(self):
        classes = [
            MFAConfirmee,
            PeutGererCourrier if self.request.method == "POST" else PeutConsulterCourrier,
        ]
        return [c() for c in classes]

    def get_serializer_class(self):
        return (
            CourrierEntrantCreationSerializer
            if self.request.method == "POST"
            else CourrierEntrantListeSerializer
        )

    def get_queryset(self):
        qs = courriers_entrants_visibles_par(self.request.user)
        for champ, param in [
            ("numero__icontains", "numero"),
            ("expediteur__icontains", "expediteur"),
            ("objet__icontains", "objet"),
            ("statut", "statut"),
            ("confidentialite", "confidentialite"),
        ]:
            valeur = self.request.query_params.get(param)
            if valeur:
                qs = qs.filter(**{champ: valeur})
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user, modifie_par=self.request.user)


class CourrierEntrantDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/courrier/entrant/{id} — la consultation d'un
    courrier confidentiel/secret est journalisée (EF-507)."""

    serializer_class = CourrierEntrantDetailSerializer
    permission_classes = [MFAConfirmee, PeutConsulterCourrier]

    def get_queryset(self):
        return courriers_entrants_visibles_par(self.request.user).prefetch_related(
            "affectations", "reponses"
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.confidentialite != NiveauConfidentialite.NORMAL:
            JournalAction.tracer(
                acteur=request.user,
                action=Action.CONSULTER,
                ressource_type=instance._meta.db_table,
                ressource_id=str(instance.pk),
                requete=request,
                detail={"confidentialite": instance.confidentialite},
            )
        return super().retrieve(request, *args, **kwargs)


class CourrierEntrantTransitionView(APIView):
    """POST /api/v1/backoffice/courrier/entrant/{id}/transition — affectation,
    prise en charge, traitement, clôture (EF-502)."""

    permission_classes = [MFAConfirmee, PeutGererCourrier]

    @extend_schema(request=TransitionCourrierSerializer, responses=CourrierEntrantDetailSerializer)
    def post(self, request, pk):
        courrier = get_object_or_404(courriers_entrants_visibles_par(request.user), pk=pk)
        serializer = TransitionCourrierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data

        perimetre = None
        if donnees.get("perimetre"):
            perimetre = get_object_or_404(Perimetre, pk=donnees["perimetre"])
        agent = None
        if donnees.get("agent"):
            agent = get_object_or_404(Utilisateur, pk=donnees["agent"])

        try:
            courrier.transitionner(
                donnees["action"],
                acteur=request.user,
                perimetre=perimetre,
                agent=agent,
                instructions=donnees.get("instructions", ""),
            )
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(CourrierEntrantDetailSerializer(courrier).data)


class FichierCourrierEntrantUploadView(APIView):
    """POST/DELETE /api/v1/backoffice/courrier/entrant/{id}/fichier."""

    permission_classes = [MFAConfirmee, PeutGererCourrier]

    @extend_schema(
        request=FichierCourrierUploadSerializer, responses=FichierCourrierReponseSerializer
    )
    def post(self, request, pk):
        courrier = get_object_or_404(courriers_entrants_visibles_par(request.user), pk=pk)
        serializer = FichierCourrierUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        courrier.fichier = serializer.validated_data["fichier"]
        courrier.modifie_par = request.user
        courrier.save(update_fields=["fichier", "modifie_par", "modifie_le"])
        return Response({"fichier_url": courrier.fichier.url}, status=status.HTTP_201_CREATED)

    @extend_schema(responses=FichierCourrierReponseSerializer)
    def delete(self, request, pk):
        courrier = get_object_or_404(courriers_entrants_visibles_par(request.user), pk=pk)
        courrier.fichier.delete(save=False)
        courrier.modifie_par = request.user
        courrier.save(update_fields=["fichier", "modifie_par", "modifie_le"])
        return Response({"fichier_url": ""})


class ReponseCourrierListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/courrier/entrant/{courrier_id}/reponses (EF-503)."""

    serializer_class = ReponseCourrierSerializer
    permission_classes = [MFAConfirmee, PeutGererCourrier]

    def get_queryset(self):
        return ReponseCourrier.objects.filter(courrier_id=self.kwargs["courrier_id"])

    def perform_create(self, serializer):
        courrier = get_object_or_404(
            courriers_entrants_visibles_par(self.request.user), pk=self.kwargs["courrier_id"]
        )
        serializer.save(
            courrier=courrier, cree_par=self.request.user, modifie_par=self.request.user
        )


class ReponseCourrierTransitionView(APIView):
    """POST /api/v1/backoffice/courrier/reponses/{id}/transition — visa, validation
    (signataire habilité), expédition (EF-503)."""

    permission_classes = [MFAConfirmee, PeutTransitionnerReponse]

    @extend_schema(request=TransitionReponseSerializer, responses=ReponseCourrierSerializer)
    def post(self, request, pk):
        reponse = get_object_or_404(ReponseCourrier, pk=pk)
        serializer = TransitionReponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reponse.transitionner(serializer.validated_data["action"], acteur=request.user)
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(ReponseCourrierSerializer(reponse).data)


class CourrierSortantListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/courrier/sortant?numero=&destinataire=&objet=
    (EF-504, EF-506)."""

    serializer_class = CourrierSortantSerializer
    permission_classes = [MFAConfirmee, PeutGererCourrier]
    pagination_class = PaginationParCurseur

    def get_queryset(self):
        qs = CourrierSortant.objets.all()
        for champ, param in [
            ("numero__icontains", "numero"),
            ("destinataire__icontains", "destinataire"),
            ("objet__icontains", "objet"),
            ("statut", "statut"),
        ]:
            valeur = self.request.query_params.get(param)
            if valeur:
                qs = qs.filter(**{champ: valeur})
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user, modifie_par=self.request.user)


class CourrierSortantDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/courrier/sortant/{id}."""

    serializer_class = CourrierSortantSerializer
    permission_classes = [MFAConfirmee, PeutGererCourrier]
    queryset = CourrierSortant.objets.all()


class FichierCourrierSortantUploadView(APIView):
    """POST /api/v1/backoffice/courrier/sortant/{id}/fichier."""

    permission_classes = [MFAConfirmee, PeutGererCourrier]

    @extend_schema(
        request=FichierCourrierUploadSerializer, responses=FichierCourrierReponseSerializer
    )
    def post(self, request, pk):
        courrier = get_object_or_404(CourrierSortant.objets, pk=pk)
        serializer = FichierCourrierUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        courrier.fichier = serializer.validated_data["fichier"]
        courrier.modifie_par = request.user
        courrier.save(update_fields=["fichier", "modifie_par", "modifie_le"])
        return Response({"fichier_url": courrier.fichier.url}, status=status.HTTP_201_CREATED)
