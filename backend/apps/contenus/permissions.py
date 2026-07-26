from rest_framework.permissions import BasePermission

from .models import SCOPE_PAR_ACTION

SCOPES_EDITORIAUX = {"contenus:rediger", "contenus:valider", "contenus:publier"}


class PeutEditerContenu(BasePermission):
    """Accès au back-office éditorial : au moins un des scopes éditoriaux.

    Un valideur/publieur n'a pas forcément `contenus:rediger` — il doit tout de
    même pouvoir lister/consulter les contenus et atteindre l'action `transition`
    (dont le scope précis est vérifié par `PeutTransitionner`).
    """

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (utilisateur.scopes() & SCOPES_EDITORIAUX or utilisateur.est_superviseur_national)
        )


class PeutRedigerContenu(BasePermission):
    """Créer/modifier/supprimer/restaurer un contenu : scope `contenus:rediger` requis.

    Un valideur/publieur peut lister, consulter et transitionner (`PeutTransitionner`)
    sans pour autant pouvoir réécrire le contenu lui-même — séparation des tâches (§6.3).
    """

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("contenus:rediger" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )


class PeutTransitionner(BasePermission):
    """Vérifie que l'utilisateur porte le scope requis par l'action de transition demandée."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        if utilisateur.est_superviseur_national:
            return True
        action = request.data.get("action")
        scope_requis = SCOPE_PAR_ACTION.get(action)
        return bool(scope_requis and scope_requis in utilisateur.scopes())
