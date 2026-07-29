from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.comptes.models import Utilisateur
from apps.intranet.permissions import EstAgentInterne
from core.permissions import MFAConfirmee

from .models import (
    AffectationAgent,
    DossierAgent,
    StatutDemandeRH,
    TransitionInvalide,
    TypeDemandeRH,
    actes_visibles_par,
    demandes_visibles_par,
    dossiers_visibles_par,
)
from .pdf import generer_pdf_attestation_travail
from .permissions import (
    PeutConsulterRH,
    PeutGererRH,
    PeutTransitionnerActe,
    PeutTransitionnerDemande,
)
from .serializers import (
    ActeCarriereSerializer,
    AffectationAgentSerializer,
    AnnuaireSerializer,
    DemandeRHSerializer,
    DossierAgentBackofficeSerializer,
    DossierAgentSerializer,
    TransitionActeSerializer,
    TransitionDemandeSerializer,
    UtilisateurSansDossierSerializer,
)


class MonDossierView(APIView):
    """GET /api/v1/rh/mon-dossier — self-service (EF-704)."""

    permission_classes = [MFAConfirmee, EstAgentInterne]

    @extend_schema(responses=DossierAgentSerializer)
    def get(self, request):
        dossier = getattr(request.user, "dossier_rh", None)
        if dossier is None:
            return Response(
                {"detail": "Aucun dossier RH n'est associé à ce compte."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(DossierAgentSerializer(dossier).data)


class AnnuaireListView(ListAPIView):
    """GET /api/v1/rh/annuaire?q= — annuaire interne (EF-706)."""

    permission_classes = [MFAConfirmee, EstAgentInterne]
    serializer_class = AnnuaireSerializer

    def get_queryset(self):
        qs = DossierAgent.objets.filter(utilisateur__est_agent_interne=True).select_related(
            "utilisateur"
        )
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(
                Q(utilisateur__nom__icontains=recherche)
                | Q(utilisateur__prenom__icontains=recherche)
                | Q(corps__icontains=recherche)
                | Q(grade__icontains=recherche)
            )
        return qs.order_by("utilisateur__nom", "utilisateur__prenom")


class DemandeRHListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/rh/demandes — self-service (EF-703) : un agent crée pour
    son propre dossier ; la liste est filtrée par `demandes_visibles_par` (agent :
    ses propres demandes : RH : tout ; validateur : périmètre)."""

    permission_classes = [MFAConfirmee, EstAgentInterne]
    serializer_class = DemandeRHSerializer

    def get_queryset(self):
        return demandes_visibles_par(self.request.user).select_related("dossier__utilisateur")

    def perform_create(self, serializer):
        dossier = getattr(self.request.user, "dossier_rh", None)
        if dossier is None:
            raise ValidationError({"detail": "Aucun dossier RH n'est associé à ce compte."})
        serializer.save(dossier=dossier, cree_par=self.request.user, modifie_par=self.request.user)


class DemandeRHTransitionView(APIView):
    """POST /api/v1/rh/demandes/{id}/transition — `annuler` (le demandeur),
    `valider`/`rejeter` (`rh:valider`, périmètre déjà restreint en amont)."""

    permission_classes = [MFAConfirmee, PeutTransitionnerDemande]

    @extend_schema(request=TransitionDemandeSerializer, responses=DemandeRHSerializer)
    def post(self, request, pk):
        demande = get_object_or_404(demandes_visibles_par(request.user), pk=pk)
        self.check_object_permissions(request, demande)
        serializer = TransitionDemandeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            demande.transitionner(
                serializer.validated_data["action"],
                acteur=request.user,
                motif_rejet=serializer.validated_data.get("motif_rejet", ""),
            )
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(DemandeRHSerializer(demande).data)


class AttestationTravailPdfView(APIView):
    """GET /api/v1/rh/demandes/{id}/attestation — édition PDF, une fois la demande
    validée (EF-703, EF-704)."""

    permission_classes = [MFAConfirmee, EstAgentInterne]

    @extend_schema(responses={200: OpenApiTypes.BINARY})
    def get(self, request, pk):
        demande = get_object_or_404(demandes_visibles_par(request.user), pk=pk)
        if demande.type_demande != TypeDemandeRH.ATTESTATION_TRAVAIL:
            return Response(
                {"detail": "Cette demande n'est pas une attestation de travail."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if demande.statut != StatutDemandeRH.VALIDEE:
            return Response(
                {"detail": "L'attestation n'est disponible qu'une fois la demande validée."},
                status=status.HTTP_409_CONFLICT,
            )
        pdf = generer_pdf_attestation_travail(demande)
        reponse = HttpResponse(pdf, content_type="application/pdf")
        reponse["Content-Disposition"] = f'inline; filename="{demande.numero}.pdf"'
        return reponse


class UtilisateurSansDossierListView(ListAPIView):
    """GET /api/v1/backoffice/rh/utilisateurs-sans-dossier?q= — agents internes
    sans dossier RH, pour en créer un (EF-801)."""

    permission_classes = [MFAConfirmee, PeutGererRH]
    serializer_class = UtilisateurSansDossierSerializer

    def get_queryset(self):
        qs = Utilisateur.objects.filter(est_agent_interne=True, dossier_rh__isnull=True)
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(
                Q(nom__icontains=recherche)
                | Q(prenom__icontains=recherche)
                | Q(email__icontains=recherche)
            )
        return qs.order_by("nom", "prenom")


class DossierAgentListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/rh/dossiers — référentiel du personnel
    (EF-801), scope `rh:gerer`."""

    permission_classes = [MFAConfirmee, PeutGererRH]
    serializer_class = DossierAgentBackofficeSerializer

    def get_queryset(self):
        return (
            dossiers_visibles_par(self.request.user)
            .select_related("utilisateur")
            .prefetch_related("affectations")
        )

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user, modifie_par=self.request.user)


class DossierAgentDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/rh/dossiers/{id}."""

    permission_classes = [MFAConfirmee, PeutGererRH]
    serializer_class = DossierAgentBackofficeSerializer

    def get_queryset(self):
        return DossierAgent.objets.select_related("utilisateur").prefetch_related("affectations")


class AffectationAgentCreationView(APIView):
    """POST /api/v1/backoffice/rh/dossiers/{id}/affectations — nouvelle
    affectation (EF-801) ; ferme l'affectation active précédente le cas échéant."""

    permission_classes = [MFAConfirmee, PeutGererRH]

    @extend_schema(request=AffectationAgentSerializer, responses=DossierAgentBackofficeSerializer)
    def post(self, request, pk):
        dossier = get_object_or_404(DossierAgent.objets, pk=pk)
        serializer = AffectationAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        affectation_active = dossier.affectation_active
        if affectation_active is not None:
            affectation_active.date_fin = serializer.validated_data["date_debut"]
            affectation_active.save(update_fields=["date_fin"])
        AffectationAgent.objects.create(
            dossier=dossier,
            perimetre=serializer.validated_data["perimetre"],
            fonction=serializer.validated_data.get("fonction", ""),
            date_debut=serializer.validated_data["date_debut"],
            date_fin=serializer.validated_data.get("date_fin"),
            cree_par=request.user,
        )
        return Response(
            DossierAgentBackofficeSerializer(dossier).data, status=status.HTTP_201_CREATED
        )


class ActeCarriereListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/rh/actes-carriere?dossier= — actes de carrière
    (EF-802)."""

    serializer_class = ActeCarriereSerializer

    def get_permissions(self):
        classes = [MFAConfirmee, PeutGererRH if self.request.method == "POST" else PeutConsulterRH]
        return [c() for c in classes]

    def get_queryset(self):
        qs = actes_visibles_par(self.request.user).select_related(
            "dossier__utilisateur", "nouveau_perimetre"
        )
        dossier = self.request.query_params.get("dossier")
        if dossier:
            qs = qs.filter(dossier__id=dossier)
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user, modifie_par=self.request.user)


class ActeCarriereDetailView(RetrieveAPIView):
    """GET /api/v1/backoffice/rh/actes-carriere/{id}."""

    permission_classes = [MFAConfirmee, PeutConsulterRH]
    serializer_class = ActeCarriereSerializer

    def get_queryset(self):
        return actes_visibles_par(self.request.user).select_related(
            "dossier__utilisateur", "nouveau_perimetre"
        )


class ActeCarriereTransitionView(APIView):
    """POST /api/v1/backoffice/rh/actes-carriere/{id}/transition — soumission,
    validation (applique l'effet sur le dossier), rejet (EF-802)."""

    permission_classes = [MFAConfirmee, PeutTransitionnerActe]

    @extend_schema(request=TransitionActeSerializer, responses=ActeCarriereSerializer)
    def post(self, request, pk):
        acte = get_object_or_404(actes_visibles_par(request.user), pk=pk)
        serializer = TransitionActeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            acte.transitionner(
                serializer.validated_data["action"],
                acteur=request.user,
                motif_rejet=serializer.validated_data.get("motif_rejet", ""),
            )
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(ActeCarriereSerializer(acte).data)
