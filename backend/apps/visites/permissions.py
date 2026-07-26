from rest_framework.permissions import BasePermission

from .models import SCOPE_PAR_ACTION


class PeutInstruireVisite(BasePermission):
    """Accès à la file d'instruction : scope `visites:instruire`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (
                "visites:instruire" in utilisateur.scopes() or utilisateur.est_superviseur_national
            )
        )


class PeutTransitionnerVisite(BasePermission):
    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        if utilisateur.est_superviseur_national:
            return True
        action = request.data.get("action")
        scope_requis = SCOPE_PAR_ACTION.get(action)
        return bool(scope_requis and scope_requis in utilisateur.scopes())


class PeutControlerPermis(BasePermission):
    """Contrôle à l'entrée d'un établissement : scope `visites:controler`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (
                "visites:controler" in utilisateur.scopes() or utilisateur.est_superviseur_national
            )
        )
