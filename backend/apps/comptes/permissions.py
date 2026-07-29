from rest_framework.permissions import BasePermission


class PeutGererComptes(BasePermission):
    """Console d'administration des comptes, rôles et permissions (EF-1501) :
    scope `comptes:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("comptes:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
