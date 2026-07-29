from rest_framework.permissions import BasePermission


class EstAgentInterne(BasePermission):
    """Accès à l'intranet : tout compte agent (`est_agent_interne`), quel que soit
    son rôle métier — à la différence des scopes `xxx:yyy`, qui ne portent que sur
    une action précise."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(utilisateur and utilisateur.is_authenticated and utilisateur.est_agent_interne)


class PeutPublierNotes(BasePermission):
    """Créer/modifier une note de service : scope `intranet:publier`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("intranet:publier" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
