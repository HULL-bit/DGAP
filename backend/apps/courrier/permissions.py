from rest_framework.permissions import BasePermission

SCOPES_COURRIER = {"courrier:gerer", "courrier:viser", "courrier:valider"}


class PeutConsulterCourrier(BasePermission):
    """Accès en lecture au registre : au moins un scope courrier (gestion, visa ou
    validation) — la restriction de confidentialité (EF-507) est appliquée en plus,
    au niveau du queryset (`courriers_entrants_visibles_par`)."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (utilisateur.scopes() & SCOPES_COURRIER or utilisateur.est_superviseur_national)
        )


class PeutGererCourrier(BasePermission):
    """Enregistrer/affecter/traiter/clôturer un courrier, gérer le courrier
    sortant : scope `courrier:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("courrier:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )


class PeutTransitionnerReponse(BasePermission):
    """Vérifie le scope requis par l'action de transition demandée sur une réponse
    (`courrier:viser` pour viser/rejeter, `courrier:valider` pour valider — signataire
    habilité, séparation des tâches)."""

    def has_permission(self, request, view) -> bool:
        from .models import SCOPE_PAR_ACTION_REPONSE

        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        if utilisateur.est_superviseur_national:
            return True
        action = request.data.get("action")
        scope_requis = SCOPE_PAR_ACTION_REPONSE.get(action)
        return bool(scope_requis and scope_requis in utilisateur.scopes())
