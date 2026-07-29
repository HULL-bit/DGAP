from rest_framework.permissions import BasePermission

from .models import SCOPE_PAR_ACTION


class PeutInstruireConcours(BasePermission):
    """Accès à la file d'instruction : scope `concours:instruire`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (
                "concours:instruire" in utilisateur.scopes() or utilisateur.est_superviseur_national
            )
        )


class PeutGererConcours(BasePermission):
    """Créer/modifier un avis de concours : scope `concours:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("concours:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )


class PeutTransitionnerCandidature(BasePermission):
    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        if utilisateur.est_superviseur_national:
            return True
        action = request.data.get("action")
        scope_requis = SCOPE_PAR_ACTION.get(action)
        return bool(scope_requis and scope_requis in utilisateur.scopes())
