from __future__ import annotations

from typing import Any

from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AffectationRole, AttributionPermission, Perimetre, Permission, Role, Utilisateur


class PerimetreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perimetre
        fields = ["id", "type", "code", "libelle"]
        read_only_fields = fields


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
            "est_superviseur_national",
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


class PermissionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "code", "libelle", "description", "categorie"]
        read_only_fields = fields


class AffectationRoleSerializer(serializers.ModelSerializer):
    role_libelle = serializers.CharField(source="role.libelle", read_only=True)
    perimetre_libelle = serializers.CharField(
        source="perimetre.libelle", read_only=True, default="National"
    )

    class Meta:
        model = AffectationRole
        fields = [
            "id",
            "utilisateur",
            "role",
            "role_libelle",
            "perimetre",
            "perimetre_libelle",
            "actif",
            "date_debut",
            "date_fin",
        ]
        read_only_fields = ["id", "role_libelle", "perimetre_libelle"]


class AttributionPermissionSerializer(serializers.ModelSerializer):
    permission_code = serializers.CharField(source="permission.code", read_only=True)
    perimetre_libelle = serializers.CharField(
        source="perimetre.libelle", read_only=True, default="National"
    )

    class Meta:
        model = AttributionPermission
        fields = [
            "id",
            "utilisateur",
            "permission",
            "permission_code",
            "perimetre",
            "perimetre_libelle",
            "motif",
            "actif",
            "date_debut",
            "date_fin",
        ]
        read_only_fields = ["id", "permission_code", "perimetre_libelle"]


class RoleSerializer(serializers.ModelSerializer):
    """Lecture (liste/détail) — permissions imbriquées."""

    permissions = PermissionAdminSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ["id", "code", "libelle", "description", "permissions", "cree_le"]
        read_only_fields = ["id", "permissions", "cree_le"]


class RoleCreationSerializer(serializers.ModelSerializer):
    """Écriture (création/édition) — permissions par identifiants (EF-1501)."""

    class Meta:
        model = Role
        fields = ["id", "code", "libelle", "description", "permissions"]
        read_only_fields = ["id"]


class UtilisateurAdminSerializer(serializers.ModelSerializer):
    """Console d'administration des comptes (EF-1501) — liste/détail."""

    scopes = serializers.SerializerMethodField()
    affectations_role = AffectationRoleSerializer(source="affectations", many=True, read_only=True)
    attributions_permission = AttributionPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "email",
            "nom",
            "prenom",
            "matricule",
            "telephone",
            "est_agent_interne",
            "est_superviseur_national",
            "mfa_active",
            "is_active",
            "compte_demonstration",
            "scopes",
            "affectations_role",
            "attributions_permission",
            "date_joined",
            "derniere_connexion_reussie",
        ]
        read_only_fields = [
            "id",
            "mfa_active",
            "compte_demonstration",
            "scopes",
            "affectations_role",
            "attributions_permission",
            "date_joined",
            "derniere_connexion_reussie",
        ]

    def get_scopes(self, obj: Utilisateur) -> list[str]:
        return sorted(obj.scopes())


class UtilisateurAdminEditSerializer(serializers.ModelSerializer):
    """Modification d'un compte existant (EF-1501) — jamais de suppression
    physique : `is_active=False` est la seule voie de « suppression », un compte
    étant référencé par l'historique (audit, RH, courrier…) dans tout le système."""

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "nom",
            "prenom",
            "matricule",
            "telephone",
            "est_agent_interne",
            "est_superviseur_national",
            "is_active",
        ]
        read_only_fields = ["id"]


class UtilisateurCreationSerializer(serializers.ModelSerializer):
    mot_de_passe = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "email",
            "nom",
            "prenom",
            "matricule",
            "telephone",
            "est_agent_interne",
            "mot_de_passe",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data: dict) -> Utilisateur:
        mot_de_passe = validated_data.pop("mot_de_passe")
        return Utilisateur.objects.create_user(mot_de_passe=mot_de_passe, **validated_data)


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
