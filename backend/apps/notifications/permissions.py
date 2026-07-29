from rest_framework.permissions import BasePermission


class PeutLireNotifications(BasePermission):
    """Consulter le journal des notifications envoyées : scope `notifications:lire`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (
                "notifications:lire" in utilisateur.scopes() or utilisateur.est_superviseur_national
            )
        )
