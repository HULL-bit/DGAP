from rest_framework.permissions import BasePermission


class PeutConsulterAudit(BasePermission):
    """Consultation du journal d'audit central (EF-1504) : scope `audit:consulter`
    — volontairement distinct de `comptes:gerer` (séparation des tâches : qui
    gère les comptes n'est pas nécessairement qui audite)."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("audit:consulter" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
