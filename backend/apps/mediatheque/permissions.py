from rest_framework.permissions import BasePermission


class PeutGererDocuments(BasePermission):
    """Créer/modifier/téléverser un document officiel : scope `documents:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("documents:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
