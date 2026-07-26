from __future__ import annotations

from typing import Any

from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    scopes = serializers.SerializerMethodField()
    perimetres = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "email",
            "nom",
            "prenom",
            "matricule",
            "est_agent_interne",
            "mfa_active",
            "mfa_requis",
            "scopes",
            "perimetres",
        ]
        read_only_fields = fields

    def get_scopes(self, obj: Utilisateur) -> list[str]:
        return sorted(obj.scopes())

    def get_perimetres(self, obj: Utilisateur) -> list[str]:
        return sorted(obj.perimetres_autorises())


class ConnexionSerializer(TokenObtainPairSerializer):
    """Émission de jeton JWT — exige un code TOTP valide pour les comptes internes (§6.3)."""

    code_totp = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        code_totp = attrs.pop("code_totp", "")
        donnees: dict[str, Any] = dict(super().validate(attrs))

        assert (
            self.user is not None
        )  # garanti par TokenObtainPairSerializer.validate en cas de succès

        # Première connexion d'un compte interne : mot de passe valide suffit à obtenir un
        # jeton, mais ce jeton ne donnera accès qu'à /auth/moi et à l'inscription MFA tant
        # que `mfa_active` reste faux (cf. apps.comptes.permissions.MFAConfirmee, consommée
        # par les permissions métier sensibles). Une fois activé, le code TOTP est exigé
        # à chaque connexion.
        if self.user.mfa_requis and self.user.mfa_active:
            dispositif = TOTPDevice.objects.filter(user=self.user, confirmed=True).first()
            if not dispositif or not code_totp or not dispositif.verify_token(code_totp):
                raise serializers.ValidationError(
                    {"mfa": "Code d'authentification à deux facteurs invalide ou manquant."},
                    code="mfa_invalide",
                )

        donnees["utilisateur"] = UtilisateurSerializer(self.user).data
        return donnees


class InscriptionMFAReponseSerializer(serializers.Serializer):
    cle_secrete = serializers.CharField(
        help_text="URI otpauth:// à saisir manuellement dans l'application TOTP."
    )
    qr_code_png_base64 = serializers.CharField(
        help_text="QR code PNG encodé en base64, à afficher côté client."
    )


class ConfirmationMFARequeteSerializer(serializers.Serializer):
    code_totp = serializers.CharField()


class ConfirmationMFAReponseSerializer(serializers.Serializer):
    mfa_active = serializers.BooleanField()
