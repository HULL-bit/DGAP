from __future__ import annotations

import base64
from io import BytesIO

import qrcode
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django_otp.plugins.otp_totp.models import TOTPDevice
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.audit.models import Action, JournalAction
from apps.notifications.services import notifier_email
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import AffectationRole, AttributionPermission, Perimetre, Permission, Role, Utilisateur
from .permissions import PeutGererComptes
from .serializers import (
    AffectationRoleSerializer,
    AttributionPermissionSerializer,
    ConfirmationMFAReponseSerializer,
    ConfirmationMFARequeteSerializer,
    ConnexionSerializer,
    DemandeReinitialisationMotDePasseSerializer,
    InscriptionMFAReponseSerializer,
    PerimetreSerializer,
    PermissionAdminSerializer,
    ReinitialisationMotDePasseSerializer,
    RoleCreationSerializer,
    RoleSerializer,
    UtilisateurAdminEditSerializer,
    UtilisateurAdminSerializer,
    UtilisateurCreationSerializer,
    UtilisateurSerializer,
)

_generateur_jeton_reinitialisation = PasswordResetTokenGenerator()


class ConnexionView(TokenObtainPairView):
    """POST /api/v1/auth/connexion — émet un jeton JWT, exige MFA pour les comptes internes."""

    serializer_class = ConnexionSerializer

    def post(self, request, *args, **kwargs):
        reponse = super().post(request, *args, **kwargs)
        if reponse.status_code == status.HTTP_200_OK:
            JournalAction.tracer(
                acteur=request.user,
                action=Action.CONSULTER,
                ressource_type="session",
                ressource_id="connexion",
                requete=request,
            )
        return reponse


class MoiView(APIView):
    """GET /api/v1/auth/moi — profil, scopes et périmètres de l'utilisateur courant."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UtilisateurSerializer)
    def get(self, request):
        return Response(UtilisateurSerializer(request.user).data)


class PerimetreListView(ListAPIView):
    """GET /api/v1/perimetres — périmètres organisationnels (national, directions,
    établissements), utilisés notamment pour cibler une note de service (EF-702)."""

    serializer_class = PerimetreSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    queryset = Perimetre.objects.all()


class InscriptionMFAView(APIView):
    """POST /api/v1/auth/mfa/inscription — crée (ou réutilise) un dispositif TOTP non
    confirmé + QR.

    Idempotent tant que l'inscription n'est pas confirmée : un rechargement de page,
    un double appel React (StrictMode) ou une nouvelle visite de l'écran d'inscription
    renvoient le même secret plutôt que d'en générer un nouveau à chaque fois — sinon
    le QR déjà scanné par l'utilisateur devient invalide silencieusement.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=InscriptionMFAReponseSerializer)
    def post(self, request):
        dispositif = TOTPDevice.objects.filter(user=request.user, confirmed=False).first()
        if dispositif is None:
            dispositif = TOTPDevice.objects.create(
                user=request.user, name="dispositif-principal", confirmed=False
            )

        image = qrcode.make(dispositif.config_url)
        tampon = BytesIO()
        image.save(tampon, format="PNG")
        qr_base64 = base64.b64encode(tampon.getvalue()).decode()

        return Response(
            {
                "cle_secrete": dispositif.config_url,
                "qr_code_png_base64": qr_base64,
            },
            status=status.HTTP_201_CREATED,
        )


class ConfirmationMFAView(APIView):
    """POST /api/v1/auth/mfa/confirmation — valide le premier code et active le MFA."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ConfirmationMFARequeteSerializer, responses=ConfirmationMFAReponseSerializer
    )
    def post(self, request):
        code = request.data.get("code_totp", "")
        dispositif = TOTPDevice.objects.filter(user=request.user, confirmed=False).first()
        if not dispositif or not dispositif.verify_token(code):
            return Response(
                {"detail": "Code d'authentification invalide."}, status=status.HTTP_400_BAD_REQUEST
            )

        dispositif.confirmed = True
        dispositif.save(update_fields=["confirmed"])
        request.user.mfa_active = True
        request.user.save(update_fields=["mfa_active"])

        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type="mfa",
            ressource_id=str(request.user.id),
            requete=request,
        )
        return Response({"mfa_active": True})


class DemandeReinitialisationMotDePasseView(APIView):
    """POST /api/v1/auth/mot-de-passe-oublie — envoie un lien de réinitialisation par
    e-mail.

    Le SMS (notifications.services.notifier_sms) n'est que simulé tant que
    l'agrégateur n'est pas souscrit : la réinitialisation passe donc uniquement par
    e-mail pour l'instant. Répond toujours 200 avec un message générique, que
    l'adresse corresponde ou non à un compte existant, pour ne pas permettre
    l'énumération des comptes.
    """

    permission_classes = [AllowAny]

    @extend_schema(request=DemandeReinitialisationMotDePasseSerializer, responses=None)
    def post(self, request):
        serializer = DemandeReinitialisationMotDePasseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        utilisateur = Utilisateur.objects.filter(email__iexact=email, is_active=True).first()
        if utilisateur is not None:
            origine = request.headers.get("Origin", "")
            origines_autorisees = settings.CORS_ALLOWED_ORIGINS
            base_url = origine if origine in origines_autorisees else origines_autorisees[0]
            uid = urlsafe_base64_encode(force_bytes(utilisateur.pk))
            jeton = _generateur_jeton_reinitialisation.make_token(utilisateur)
            lien = f"{base_url}/reinitialiser-mot-de-passe?uid={uid}&jeton={jeton}"
            heures_validite = settings.PASSWORD_RESET_TIMEOUT // 3600
            notifier_email(
                destinataire=utilisateur.email,
                sujet="Réinitialisation de votre mot de passe — DGAP",
                contenu=(
                    f"Bonjour {utilisateur.prenom},\n\n"
                    "Une demande de réinitialisation de mot de passe a été faite pour ce "
                    "compte. Si vous en êtes à l'origine, cliquez sur le lien ci-dessous "
                    f"(valable {heures_validite} heures) :\n\n{lien}\n\n"
                    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : "
                    "votre mot de passe actuel reste valide."
                ),
                objet_source=utilisateur,
            )

        return Response(
            {
                "detail": (
                    "Si cette adresse correspond à un compte, un e-mail de "
                    "réinitialisation a été envoyé."
                )
            }
        )


class ConfirmationReinitialisationMotDePasseView(APIView):
    """POST /api/v1/auth/mot-de-passe-oublie/confirmation — définit un nouveau mot de
    passe à partir du lien reçu par e-mail."""

    permission_classes = [AllowAny]

    @extend_schema(request=ReinitialisationMotDePasseSerializer, responses=None)
    def post(self, request):
        serializer = ReinitialisationMotDePasseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        utilisateur = None
        try:
            pk = urlsafe_base64_decode(serializer.validated_data["uid"]).decode()
            utilisateur = Utilisateur.objects.get(pk=pk, is_active=True)
        except (TypeError, ValueError, OverflowError, Utilisateur.DoesNotExist):
            pass

        jeton_valide = utilisateur is not None and _generateur_jeton_reinitialisation.check_token(
            utilisateur, serializer.validated_data["jeton"]
        )
        if not jeton_valide:
            return Response(
                {"detail": "Ce lien de réinitialisation est invalide ou a expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assert utilisateur is not None  # garanti par jeton_valide ci-dessus

        nouveau_mot_de_passe = serializer.validated_data["nouveau_mot_de_passe"]
        try:
            validate_password(nouveau_mot_de_passe, user=utilisateur)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"nouveau_mot_de_passe": exc.messages}) from exc

        utilisateur.set_password(nouveau_mot_de_passe)
        utilisateur.save(update_fields=["password"])

        JournalAction.tracer(
            acteur=utilisateur,
            action=Action.MODIFIER,
            ressource_type="mot_de_passe",
            ressource_id=str(utilisateur.id),
            requete=request,
        )
        return Response({"detail": "Mot de passe réinitialisé avec succès."})


class PaginationUtilisateurs(PaginationParCurseur):
    ordering = "-date_joined"


class UtilisateurAdminListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/comptes/utilisateurs?q=&est_agent_interne=&
    is_active= — console d'administration des comptes (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]
    pagination_class = PaginationUtilisateurs

    def get_serializer_class(self):
        return (
            UtilisateurCreationSerializer
            if self.request.method == "POST"
            else UtilisateurAdminSerializer
        )

    def get_queryset(self):
        qs = Utilisateur.objects.all()
        recherche = self.request.query_params.get("q")
        if recherche:
            qs = qs.filter(
                Q(nom__icontains=recherche)
                | Q(prenom__icontains=recherche)
                | Q(email__icontains=recherche)
            )
        for champ in ("est_agent_interne", "is_active"):
            valeur = self.request.query_params.get(champ)
            if valeur is not None:
                qs = qs.filter(**{champ: valeur.lower() == "true"})
        return qs

    def perform_create(self, serializer):
        utilisateur = serializer.save()
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.CREER,
            ressource_type="utilisateur",
            ressource_id=str(utilisateur.id),
            requete=self.request,
        )


class UtilisateurAdminDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/comptes/utilisateurs/{id} (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]
    queryset = Utilisateur.objects.prefetch_related(
        "affectations__role", "affectations__perimetre", "attributions_permission"
    )

    def get_serializer_class(self):
        return (
            UtilisateurAdminEditSerializer
            if self.request.method == "PATCH"
            else UtilisateurAdminSerializer
        )

    def perform_update(self, serializer):
        utilisateur = serializer.save()
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.MODIFIER,
            ressource_type="utilisateur",
            ressource_id=str(utilisateur.id),
            requete=self.request,
            detail={"champs": list(serializer.validated_data.keys())},
        )


class ReinitialisationMFAView(APIView):
    """POST /api/v1/backoffice/comptes/utilisateurs/{id}/reinitialiser-mfa —
    supprime le(s) dispositif(s) TOTP du compte et désactive le MFA (perte de
    téléphone, changement d'appareil). Le compte repasse par le parcours de
    bootstrap (§6.3) à sa prochaine connexion : mot de passe seul, puis nouvelle
    inscription MFA obligatoire avant tout accès métier."""

    permission_classes = [MFAConfirmee, PeutGererComptes]

    @extend_schema(request=None, responses=None)
    def post(self, request, pk):
        utilisateur = get_object_or_404(Utilisateur, pk=pk)
        TOTPDevice.objects.filter(user=utilisateur).delete()
        utilisateur.mfa_active = False
        utilisateur.save(update_fields=["mfa_active"])

        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type="mfa",
            ressource_id=str(utilisateur.id),
            requete=request,
            detail={"reinitialise_par_admin": True},
        )
        return Response({"mfa_active": False})


class RoleListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/comptes/roles (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]
    queryset = Role.objects.prefetch_related("permissions")

    def get_serializer_class(self):
        return RoleCreationSerializer if self.request.method == "POST" else RoleSerializer

    def perform_create(self, serializer):
        role = serializer.save()
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.CREER,
            ressource_type="role",
            ressource_id=str(role.id),
            requete=self.request,
        )


class RoleDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/comptes/roles/{id} (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]
    queryset = Role.objects.prefetch_related("permissions")

    def get_serializer_class(self):
        return RoleCreationSerializer if self.request.method == "PATCH" else RoleSerializer

    def perform_update(self, serializer):
        role = serializer.save()
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.MODIFIER,
            ressource_type="role",
            ressource_id=str(role.id),
            requete=self.request,
        )


class PermissionListView(ListAPIView):
    """GET /api/v1/backoffice/comptes/permissions — référentiel en lecture seule
    des permissions définies par les modules (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]
    serializer_class = PermissionAdminSerializer
    pagination_class = None
    queryset = Permission.objects.all()


class AffectationRoleCreationView(APIView):
    """POST /api/v1/backoffice/comptes/affectations-role — attribution d'un rôle
    à un utilisateur, sur un périmètre (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]

    @extend_schema(request=AffectationRoleSerializer, responses=AffectationRoleSerializer)
    def post(self, request):
        serializer = AffectationRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        affectation = serializer.save()
        JournalAction.tracer(
            acteur=request.user,
            action=Action.CREER,
            ressource_type="affectation_role",
            ressource_id=str(affectation.id),
            requete=request,
            detail={"utilisateur": str(affectation.utilisateur_id), "role": affectation.role.code},
        )
        return Response(AffectationRoleSerializer(affectation).data, status=status.HTTP_201_CREATED)


class AffectationRoleRevocationView(APIView):
    """POST /api/v1/backoffice/comptes/affectations-role/{id}/revoquer — jamais de
    suppression physique : `actif=False` préserve l'historique d'habilitation
    (EF-1501, revues périodiques)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]

    @extend_schema(request=None, responses=AffectationRoleSerializer)
    def post(self, request, pk):
        affectation = get_object_or_404(AffectationRole, pk=pk)
        affectation.actif = False
        affectation.save(update_fields=["actif"])
        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type="affectation_role",
            ressource_id=str(affectation.id),
            requete=request,
            detail={"action": "revocation"},
        )
        return Response(AffectationRoleSerializer(affectation).data)


class AttributionPermissionCreationView(APIView):
    """POST /api/v1/backoffice/comptes/attributions-permission — délégation
    temporaire ou habilitation individuelle hors rôle (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]

    @extend_schema(
        request=AttributionPermissionSerializer, responses=AttributionPermissionSerializer
    )
    def post(self, request):
        serializer = AttributionPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attribution = serializer.save()
        JournalAction.tracer(
            acteur=request.user,
            action=Action.CREER,
            ressource_type="attribution_permission",
            ressource_id=str(attribution.id),
            requete=request,
            detail={
                "utilisateur": str(attribution.utilisateur_id),
                "permission": attribution.permission.code,
            },
        )
        return Response(
            AttributionPermissionSerializer(attribution).data, status=status.HTTP_201_CREATED
        )


class AttributionPermissionRevocationView(APIView):
    """POST /api/v1/backoffice/comptes/attributions-permission/{id}/revoquer
    (EF-1501)."""

    permission_classes = [MFAConfirmee, PeutGererComptes]

    @extend_schema(request=None, responses=AttributionPermissionSerializer)
    def post(self, request, pk):
        attribution = get_object_or_404(AttributionPermission, pk=pk)
        attribution.actif = False
        attribution.save(update_fields=["actif"])
        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type="attribution_permission",
            ressource_id=str(attribution.id),
            requete=request,
            detail={"action": "revocation"},
        )
        return Response(AttributionPermissionSerializer(attribution).data)
