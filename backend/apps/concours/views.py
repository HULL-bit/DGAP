from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Action, JournalAction
from apps.mediatheque.models import DocumentPublic, NatureDocument
from apps.notifications.services import notifier
from apps.paiements.models import MoyenPaiement, Paiement, StatutPaiement
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee
from core.qr_signe import verifier_charge

from .models import Candidature, Concours, StatutConcours, TransitionInvalide
from .pdf import generer_pdf_convocation
from .permissions import (
    PeutGererConcours,
    PeutInstruireConcours,
    PeutTransitionnerCandidature,
)
from .serializers import (
    AvisConcoursReponseSerializer,
    AvisConcoursUploadSerializer,
    CandidatureAccuseSerializer,
    CandidatureCreationSerializer,
    CandidatureInstructionSerializer,
    CandidatureStatutPubliqueSerializer,
    ConcoursBackofficeSerializer,
    ConcoursSerializer,
    ConfirmationPaiementMockSerializer,
    PieceJointeCandidatureSerializer,
    RenvoiSuiviCandidatureReponseSerializer,
    RenvoiSuiviCandidatureSerializer,
    TransitionCandidatureSerializer,
    VerificationConvocationReponseSerializer,
    VerificationConvocationSerializer,
)

MESSAGE_RENVOI_GENERIQUE = (
    "Si une ou plusieurs candidatures correspondent à cet e-mail, un message vient de "
    "vous être envoyé avec vos numéros et codes de suivi."
)


class ConcoursListView(ListAPIView):
    """GET /api/v1/concours?q= — avis de concours ouverts (§7.4)."""

    serializer_class = ConcoursSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Concours.objets.filter(statut=StatutConcours.OUVERT)
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(titre__icontains=recherche)
        return qs


class ConcoursDetailView(RetrieveAPIView):
    """GET /api/v1/concours/{code} — avis de concours, publique."""

    queryset = Concours.objets.all()
    serializer_class = ConcoursSerializer
    permission_classes = [AllowAny]
    lookup_field = "code"


class CandidatureCreationView(APIView):
    """POST /api/v1/candidatures — dépôt public, idempotent (§7.4).

    Crée aussi le `Paiement` (mock) associé si le concours a des frais d'inscription.
    """

    permission_classes = [AllowAny]
    throttle_scope = "depot-demande"

    @extend_schema(request=CandidatureCreationSerializer, responses=CandidatureAccuseSerializer)
    def post(self, request):
        cle_idempotence = request.headers.get("Idempotency-Key")
        if cle_idempotence:
            existante = Candidature.tous_les_objets.filter(cle_idempotence=cle_idempotence).first()
            if existante:
                return Response(
                    CandidatureAccuseSerializer(existante).data, status=status.HTTP_200_OK
                )

        serializer = CandidatureCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        candidature = serializer.save(cle_idempotence=cle_idempotence or None)

        if candidature.concours.frais_inscription > 0:
            Paiement.objects.create(
                content_type=ContentType.objects.get_for_model(Candidature),
                object_id=candidature.id,
                montant=candidature.concours.frais_inscription,
                moyen=MoyenPaiement.MOCK,
            )

        notifier(
            email=candidature.candidat_email,
            telephone=candidature.candidat_telephone,
            sujet=f"Confirmation de votre candidature {candidature.numero_suivi} — DGAP",
            contenu=(
                "Bonjour,\n\nVotre candidature a été enregistrée sous le numéro "
                f"{candidature.numero_suivi} (code : {candidature.code_suivi}).\n\n"
                "Conservez ces informations pour suivre l'état de votre dossier.\n\n"
                "Ce message est envoyé automatiquement, merci de ne pas y répondre."
            ),
            objet_source=candidature,
        )

        JournalAction.tracer(
            acteur=request.user,
            action=Action.CREER,
            ressource_type="candidature",
            ressource_id=str(candidature.id),
            requete=request,
        )
        return Response(
            CandidatureAccuseSerializer(candidature).data, status=status.HTTP_201_CREATED
        )


class PieceJointeCandidatureCreationView(APIView):
    """POST /api/v1/candidatures/{id}/pieces — téléversement de pièces (§7.4)."""

    permission_classes = [AllowAny]
    throttle_scope = "depot-demande"

    @extend_schema(
        request=PieceJointeCandidatureSerializer, responses=PieceJointeCandidatureSerializer
    )
    def post(self, request, candidature_id):
        candidature = get_object_or_404(Candidature, pk=candidature_id)
        serializer = PieceJointeCandidatureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        piece = serializer.save(candidature=candidature)
        return Response(
            PieceJointeCandidatureSerializer(piece).data, status=status.HTTP_201_CREATED
        )


class CandidatureStatutView(APIView):
    """GET /api/v1/candidatures/{numero}/statut?code=... — suivi public restreint."""

    permission_classes = [AllowAny]
    throttle_scope = "suivi-demande"

    @extend_schema(responses=CandidatureStatutPubliqueSerializer)
    def get(self, request, numero_suivi):
        code = request.query_params.get("code", "")
        candidature = get_object_or_404(Candidature, numero_suivi=numero_suivi, code_suivi=code)
        return Response(CandidatureStatutPubliqueSerializer(candidature).data)


class ConfirmationPaiementMockView(APIView):
    """POST /api/v1/candidatures/{numero}/paiement/confirmer-mock — simule un paiement
    réussi (§ décision produit : aucun opérateur réel intégré)."""

    permission_classes = [AllowAny]
    throttle_scope = "suivi-demande"

    @extend_schema(
        request=ConfirmationPaiementMockSerializer, responses=CandidatureStatutPubliqueSerializer
    )
    def post(self, request, numero_suivi):
        serializer = ConfirmationPaiementMockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        candidature = get_object_or_404(
            Candidature, numero_suivi=numero_suivi, code_suivi=serializer.validated_data["code"]
        )
        paiement = candidature.paiement()
        if paiement is None:
            return Response(
                {"detail": "Aucun paiement attendu pour cette candidature."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if paiement.statut != StatutPaiement.PAYE:
            paiement.marquer_paye()
        return Response(CandidatureStatutPubliqueSerializer(candidature).data)


class RenvoiSuiviCandidatureView(APIView):
    """POST /api/v1/candidatures/renvoi — numéro/code de suivi oublié, par e-mail."""

    permission_classes = [AllowAny]
    throttle_scope = "renvoi-suivi"

    @extend_schema(
        request=RenvoiSuiviCandidatureSerializer, responses=RenvoiSuiviCandidatureReponseSerializer
    )
    def post(self, request):
        serializer = RenvoiSuiviCandidatureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        candidatures = (
            Candidature.objets.select_related("concours")
            .filter(candidat_email__iexact=email)
            .order_by("-cree_le")[:10]
        )
        if candidatures:
            lignes = "\n".join(
                f"- {c.numero_suivi} (code : {c.code_suivi}) — {c.concours.titre}"
                for c in candidatures
            )
            send_mail(
                subject="Vos candidatures aux concours — DGAP",
                message=(
                    "Bonjour,\n\n"
                    "Voici le rappel de vos candidatures déposées auprès de "
                    "l'Administration Pénitentiaire :\n\n"
                    f"{lignes}\n\n"
                    "Utilisez le numéro et le code correspondants sur la page de suivi "
                    "pour consulter l'état de votre candidature.\n\n"
                    "Ce message est envoyé automatiquement, merci de ne pas y répondre."
                ),
                from_email=None,
                recipient_list=[email],
                fail_silently=True,
            )

        return Response({"detail": MESSAGE_RENVOI_GENERIQUE})


class ConcoursBackofficeListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/concours — gestion des avis (scope `concours:gerer`)."""

    serializer_class = ConcoursBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutGererConcours]
    queryset = Concours.tous_les_objets.all()


class ConcoursBackofficeDetailView(RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/backoffice/concours/{id}."""

    serializer_class = ConcoursBackofficeSerializer
    permission_classes = [MFAConfirmee, PeutGererConcours]
    queryset = Concours.tous_les_objets.all()


class AvisConcoursUploadView(APIView):
    """POST /api/v1/backoffice/concours/{id}/avis — téléverse l'avis officiel (PDF).

    Crée ou met à jour le `DocumentPublic` (nature `AVIS_CONCOURS`) lié au concours,
    plutôt que d'exiger un aller-retour manuel par l'écran « Documents officiels » :
    le rédacteur/administrateur reste sur l'écran concours pour joindre l'avis, qui
    devient aussitôt visible dans les documents publics et sur l'accueil."""

    permission_classes = [MFAConfirmee, PeutGererConcours]

    @extend_schema(request=AvisConcoursUploadSerializer, responses=AvisConcoursReponseSerializer)
    def post(self, request, pk):
        concours = get_object_or_404(Concours, pk=pk)
        serializer = AvisConcoursUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = concours.document_avis
        if document is None:
            document = DocumentPublic.objects.create(
                titre=concours.titre,
                nature=NatureDocument.AVIS_CONCOURS,
                categorie="concours",
                publie=True,
            )
            concours.document_avis = document
            concours.save(update_fields=["document_avis"])

        document.fichier = serializer.validated_data["fichier"]
        document.save(update_fields=["fichier"])

        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type=concours._meta.db_table,
            ressource_id=str(concours.pk),
            requete=request,
            detail={"avis_televerse": True},
        )
        return Response({"document_avis_url": document.fichier.url}, status=status.HTTP_201_CREATED)


class CandidatureInstructionListView(ListAPIView):
    """GET /api/v1/candidatures/instruction — file d'instruction (scope `concours:instruire`)."""

    serializer_class = CandidatureInstructionSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [MFAConfirmee, PeutInstruireConcours]

    def get_queryset(self):
        qs = Candidature.tous_les_objets.select_related("concours").prefetch_related("pieces")
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        concours = self.request.query_params.get("concours")
        if concours:
            qs = qs.filter(concours__code=concours)
        return qs


class CandidatureInstructionDetailView(RetrieveAPIView):
    """GET /api/v1/candidatures/instruction/{id} — détail d'instruction."""

    queryset = Candidature.tous_les_objets.select_related("concours").prefetch_related("pieces")
    serializer_class = CandidatureInstructionSerializer
    permission_classes = [MFAConfirmee, PeutInstruireConcours]


class CandidatureTransitionView(APIView):
    """POST /api/v1/candidatures/instruction/{id}/transition — instruction (§7.4)."""

    permission_classes = [MFAConfirmee, PeutInstruireConcours, PeutTransitionnerCandidature]

    @extend_schema(
        request=TransitionCandidatureSerializer, responses=CandidatureInstructionSerializer
    )
    def post(self, request, pk):
        candidature = get_object_or_404(Candidature, pk=pk)
        serializer = TransitionCandidatureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            candidature.transitionner(
                serializer.validated_data["action"],
                acteur=request.user,
                motif=serializer.validated_data.get("motif", ""),
            )
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        JournalAction.tracer(
            acteur=request.user,
            action=Action.VALIDER,
            ressource_type="candidature",
            ressource_id=str(candidature.id),
            requete=request,
            detail={"transition": serializer.validated_data["action"]},
        )
        return Response(CandidatureInstructionSerializer(candidature).data)


def _reponse_pdf_convocation(candidature: Candidature):
    if candidature.statut not in ("CONVOQUE", "ADMIS"):
        return Response(
            {"detail": "La convocation n'a pas encore été émise."},
            status=status.HTTP_409_CONFLICT,
        )
    pdf = generer_pdf_convocation(candidature)
    reponse = HttpResponse(pdf, content_type="application/pdf")
    reponse["Content-Disposition"] = f'inline; filename="{candidature.numero_suivi}.pdf"'
    return reponse


class ConvocationPDFView(APIView):
    """GET /api/v1/convocations/{candidature_id}/pdf — accessible par le candidat
    (numéro+code en requête) ou par un instructeur authentifié."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: OpenApiTypes.BINARY})
    def get(self, request, candidature_id):
        candidature = get_object_or_404(Candidature, pk=candidature_id)

        autorise_instructeur = (
            request.user.is_authenticated
            and (not request.user.mfa_requis or request.user.mfa_active)
            and (
                "concours:instruire" in request.user.scopes()
                or request.user.est_superviseur_national
            )
        )
        if not autorise_instructeur:
            code = request.query_params.get("code", "")
            if not code or code != candidature.code_suivi:
                return Response(
                    {"detail": "Numéro et code de suivi requis pour accéder à la convocation."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return _reponse_pdf_convocation(candidature)


class ConvocationPDFParNumeroView(APIView):
    """GET /api/v1/candidatures/{numero_suivi}/convocation/pdf?code=... — accès public
    par le candidat, sans connaître l'UUID interne."""

    permission_classes = [AllowAny]
    throttle_scope = "suivi-demande"

    @extend_schema(responses={200: OpenApiTypes.BINARY})
    def get(self, request, numero_suivi):
        code = request.query_params.get("code", "")
        candidature = get_object_or_404(Candidature, numero_suivi=numero_suivi, code_suivi=code)
        return _reponse_pdf_convocation(candidature)


class VerificationConvocationView(APIView):
    """POST /api/v1/convocations/verification — contrôle à l'entrée du concours
    (scope `concours:instruire`, hors-ligne toléré)."""

    permission_classes = [MFAConfirmee, PeutInstruireConcours]

    @extend_schema(
        request=VerificationConvocationSerializer,
        responses=VerificationConvocationReponseSerializer,
    )
    def post(self, request):
        serializer = VerificationConvocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        charge = verifier_charge(serializer.validated_data["jeton"])
        if charge is None:
            return Response(
                {"valide": False, "detail": "Signature invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidature = Candidature.tous_les_objets.filter(
            numero_suivi=charge.get("candidature")
        ).first()
        if candidature is None or candidature.statut not in ("CONVOQUE", "ADMIS"):
            return Response(
                {"valide": False, "detail": "Candidature introuvable ou convocation révoquée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        JournalAction.tracer(
            acteur=request.user,
            action=Action.CONSULTER,
            ressource_type="convocation_candidature",
            ressource_id=str(candidature.id),
            requete=request,
            detail={"controle": True},
        )
        return Response({"valide": True, "charge": charge})
