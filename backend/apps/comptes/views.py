from __future__ import annotations

import base64
from io import BytesIO

import qrcode
from django_otp.plugins.otp_totp.models import TOTPDevice
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.audit.models import Action, JournalAction

from .serializers import (
    ConfirmationMFAReponseSerializer,
    ConfirmationMFARequeteSerializer,
    ConnexionSerializer,
    InscriptionMFAReponseSerializer,
    UtilisateurSerializer,
)


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


class InscriptionMFAView(APIView):
    """POST /api/v1/auth/mfa/inscription — crée un dispositif TOTP non confirmé + QR."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=InscriptionMFAReponseSerializer)
    def post(self, request):
        TOTPDevice.objects.filter(user=request.user, confirmed=False).delete()
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
