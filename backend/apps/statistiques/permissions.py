from rest_framework.permissions import BasePermission


class PeutLireStatistiques(BasePermission):
    """Consulter les tableaux de bord statistiques : scope `stats:lire`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("stats:lire" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
