from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Action, JournalAction
from apps.notifications.services import notifier
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee
from core.qr_signe import verifier_charge

from .models import DemandeVisite, PermisVisite, TransitionInvalide
from .pdf import generer_pdf_permis
from .permissions import PeutControlerPermis, PeutInstruireVisite, PeutTransitionnerVisite
from .serializers import (
    DemandeVisiteAccuseSerializer,
    DemandeVisiteCreationSerializer,
    DemandeVisiteInstructionSerializer,
    DemandeVisiteStatutPubliqueSerializer,
    PieceJointeVisiteSerializer,
    RenvoiSuiviReponseSerializer,
    RenvoiSuiviSerializer,
    TransitionVisiteSerializer,
    VerificationPermisReponseSerializer,
    VerificationPermisSerializer,
)

MESSAGE_RENVOI_GENERIQUE = (
    "Si une ou plusieurs demandes correspondent à cet e-mail, un message vient de vous "
    "être envoyé avec vos numéros et codes de suivi."
)


class DemandeVisiteCreationView(APIView):
    """POST /api/v1/demandes-visite — dépôt public, idempotent (§6.1, CR-V-02).

    L'en-tête `Idempotency-Key` évite la création de doublons en cas de double clic
    ou de perte de connexion juste après l'envoi : une seconde requête avec la même
    clé renvoie l'accusé déjà émis au lieu de créer une nouvelle demande.
    """

    permission_classes = [AllowAny]
    throttle_scope = "depot-demande"

    @extend_schema(request=DemandeVisiteCreationSerializer, responses=DemandeVisiteAccuseSerializer)
    def post(self, request):
        cle_idempotence = request.headers.get("Idempotency-Key")
        if cle_idempotence:
            existante = DemandeVisite.tous_les_objets.filter(
                cle_idempotence=cle_idempotence
            ).first()
            if existante:
                return Response(
                    DemandeVisiteAccuseSerializer(existante).data, status=status.HTTP_200_OK
                )

        serializer = DemandeVisiteCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande = serializer.save(cle_idempotence=cle_idempotence or None)

        notifier(
            email=demande.visiteur_email,
            telephone=demande.visiteur_telephone,
            sujet=f"Confirmation de votre demande de visite {demande.numero_suivi} — DGAP",
            contenu=(
                "Bonjour,\n\nVotre demande de visite a été enregistrée sous le numéro "
                f"{demande.numero_suivi} (code : {demande.code_suivi}).\n\n"
                "Conservez ces informations pour suivre l'état de votre dossier.\n\n"
                "Ce message est envoyé automatiquement, merci de ne pas y répondre."
            ),
            objet_source=demande,
        )

        JournalAction.tracer(
            acteur=request.user,
            action=Action.CREER,
            ressource_type="demande_visite",
            ressource_id=str(demande.id),
            requete=request,
        )
        return Response(DemandeVisiteAccuseSerializer(demande).data, status=status.HTTP_201_CREATED)


class PieceJointeCreationView(APIView):
    """POST /api/v1/demandes-visite/{id}/pieces — téléversement de pièces (§7.3, étape 4).

    Accessible sans authentification tant que la demande n'est pas encore passée en
    instruction : l'UUID de la demande (non énumérable) fait office de jeton court
    pour ce dépôt en plusieurs étapes.
    """

    permission_classes = [AllowAny]
    throttle_scope = "depot-demande"

    @extend_schema(request=PieceJointeVisiteSerializer, responses=PieceJointeVisiteSerializer)
    def post(self, request, demande_id):
        demande = get_object_or_404(DemandeVisite, pk=demande_id)
        serializer = PieceJointeVisiteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        piece = serializer.save(demande=demande)
        return Response(PieceJointeVisiteSerializer(piece).data, status=status.HTTP_201_CREATED)


class DemandeVisiteStatutView(APIView):
    """GET /api/v1/demandes-visite/{numero}/statut?code=... — suivi public restreint."""

    permission_classes = [AllowAny]
    throttle_scope = "suivi-demande"

    @extend_schema(responses=DemandeVisiteStatutPubliqueSerializer)
    def get(self, request, numero_suivi):
        code = request.query_params.get("code", "")
        demande = get_object_or_404(DemandeVisite, numero_suivi=numero_suivi, code_suivi=code)
        return Response(DemandeVisiteStatutPubliqueSerializer(demande).data)


class RenvoiSuiviView(APIView):
    """POST /api/v1/demandes-visite/renvoi — un citoyen ayant perdu son numéro ou son
    code de suivi les reçoit par e-mail (§6.2).

    Réponse volontairement identique qu'une correspondance existe ou non, pour ne pas
    laisser deviner si une adresse a déposé une demande (énumération)."""

    permission_classes = [AllowAny]
    throttle_scope = "renvoi-suivi"

    @extend_schema(request=RenvoiSuiviSerializer, responses=RenvoiSuiviReponseSerializer)
    def post(self, request):
        serializer = RenvoiSuiviSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        demandes = (
            DemandeVisite.objets.select_related("etablissement")
            .filter(visiteur_email__iexact=email)
            .order_by("-cree_le")[:10]
        )
        if demandes:
            lignes = "\n".join(
                f"- {d.numero_suivi} (code : {d.code_suivi}) — {d.etablissement.nom}"
                for d in demandes
            )
            send_mail(
                subject="Vos demandes de visite — DGAP",
                message=(
                    "Bonjour,\n\n"
                    "Voici le rappel de vos demandes de visite déposées auprès de "
                    "l'Administration Pénitentiaire :\n\n"
                    f"{lignes}\n\n"
                    "Utilisez le numéro et le code correspondants sur la page de suivi "
                    "pour consulter l'état de votre demande.\n\n"
                    "Ce message est envoyé automatiquement, merci de ne pas y répondre."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[email],
                fail_silently=True,
            )

        return Response({"detail": MESSAGE_RENVOI_GENERIQUE})


class DemandeVisiteInstructionListView(ListAPIView):
    """GET /api/v1/demandes-visite — file d'instruction (scope `visites:instruire`)."""

    serializer_class = DemandeVisiteInstructionSerializer
    pagination_class = PaginationParCurseur
    permission_classes = [MFAConfirmee, PeutInstruireVisite]

    def get_queryset(self):
        qs = DemandeVisite.tous_les_objets.select_related("etablissement").prefetch_related(
            "pieces"
        )
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        return qs


class DemandeVisiteInstructionDetailView(RetrieveAPIView):
    """GET /api/v1/demandes-visite/{id} — détail d'instruction (scope `visites:instruire`)."""

    queryset = DemandeVisite.tous_les_objets.select_related("etablissement").prefetch_related(
        "pieces"
    )
    serializer_class = DemandeVisiteInstructionSerializer
    permission_classes = [MFAConfirmee, PeutInstruireVisite]


class DemandeVisiteTransitionView(APIView):
    """POST /api/v1/demandes-visite/{id}/transition — instruction (§7.3, §6.3)."""

    permission_classes = [MFAConfirmee, PeutInstruireVisite, PeutTransitionnerVisite]

    @extend_schema(request=TransitionVisiteSerializer, responses=DemandeVisiteInstructionSerializer)
    def post(self, request, pk):
        demande = get_object_or_404(DemandeVisite, pk=pk)
        serializer = TransitionVisiteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            demande.transitionner(
                serializer.validated_data["action"],
                acteur=request.user,
                motif=serializer.validated_data.get("motif", ""),
            )
        except TransitionInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        JournalAction.tracer(
            acteur=request.user,
            action=Action.VALIDER,
            ressource_type="demande_visite",
            ressource_id=str(demande.id),
            requete=request,
            detail={"transition": serializer.validated_data["action"]},
        )
        return Response(DemandeVisiteInstructionSerializer(demande).data)


def _reponse_pdf_permis(demande: DemandeVisite) -> Response | HttpResponse:
    if demande.statut != "PERMIS_DELIVRE":
        return Response(
            {"detail": "Le permis n'a pas encore été délivré."}, status=status.HTTP_409_CONFLICT
        )
    pdf = generer_pdf_permis(demande)
    reponse = HttpResponse(pdf, content_type="application/pdf")
    reponse["Content-Disposition"] = f'inline; filename="{demande.numero_suivi}.pdf"'
    return reponse


class PermisPDFView(APIView):
    """GET /api/v1/permis/{demande_id}/pdf — accessible par le demandeur (numéro+code
    en requête) ou par un instructeur authentifié."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: OpenApiTypes.BINARY})
    def get(self, request, demande_id):
        demande = get_object_or_404(DemandeVisite, pk=demande_id)

        autorise_instructeur = (
            request.user.is_authenticated
            and (not request.user.mfa_requis or request.user.mfa_active)
            and (
                "visites:instruire" in request.user.scopes()
                or request.user.est_superviseur_national
            )
        )
        if not autorise_instructeur:
            code = request.query_params.get("code", "")
            if not code or code != demande.code_suivi:
                return Response(
                    {"detail": "Numéro et code de suivi requis pour accéder au permis."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return _reponse_pdf_permis(demande)


class PermisPDFParNumeroView(APIView):
    """GET /api/v1/demandes-visite/{numero_suivi}/permis/pdf?code=... — accès public par le
    demandeur, sans connaître l'UUID interne (§6.2 : le suivi public n'expose que le
    numéro et le code, jamais l'identifiant technique)."""

    permission_classes = [AllowAny]
    throttle_scope = "suivi-demande"

    @extend_schema(responses={200: OpenApiTypes.BINARY})
    def get(self, request, numero_suivi):
        code = request.query_params.get("code", "")
        demande = get_object_or_404(DemandeVisite, numero_suivi=numero_suivi, code_suivi=code)
        return _reponse_pdf_permis(demande)


class VerificationPermisView(APIView):
    """POST /api/v1/permis/verification — contrôle à l'entrée (scope `visites:controler`,
    hors-ligne toléré : la signature JWS se vérifie sans requête réseau tierce)."""

    permission_classes = [MFAConfirmee, PeutControlerPermis]

    @extend_schema(
        request=VerificationPermisSerializer, responses=VerificationPermisReponseSerializer
    )
    def post(self, request):
        serializer = VerificationPermisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        charge = verifier_charge(serializer.validated_data["jeton"])
        if charge is None:
            return Response(
                {"valide": False, "detail": "Signature invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        permis = PermisVisite.objects.filter(numero_permis=charge.get("numero_permis")).first()
        if permis is None or permis.revoque:
            return Response(
                {"valide": False, "detail": "Permis introuvable ou révoqué."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        JournalAction.tracer(
            acteur=request.user,
            action=Action.CONSULTER,
            ressource_type="permis_visite",
            ressource_id=str(permis.id),
            requete=request,
            detail={"controle": True},
        )
        return Response({"valide": True, "charge": charge})
