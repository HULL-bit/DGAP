from rest_framework.permissions import BasePermission

SCOPES_GED = {"ged:consulter", "ged:gerer"}


class PeutConsulterGed(BasePermission):
    """Accès en lecture au référentiel documentaire : `ged:consulter` ou
    `ged:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (utilisateur.scopes() & SCOPES_GED or utilisateur.est_superviseur_national)
        )


class PeutGererGed(BasePermission):
    """Déposer/verrouiller/versionner/partager un document : scope `ged:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("ged:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
