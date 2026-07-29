from rest_framework.permissions import BasePermission

SCOPES_RH = {"rh:gerer", "rh:valider"}


class PeutGererRH(BasePermission):
    """CRUD du référentiel du personnel, création des actes/demandes pour un
    tiers : scope `rh:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("rh:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )


class PeutConsulterRH(BasePermission):
    """Accès en lecture aux files de validation RH : `rh:gerer` ou `rh:valider`
    (validateur hiérarchique, restreint par périmètre au niveau du queryset)."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (utilisateur.scopes() & SCOPES_RH or utilisateur.est_superviseur_national)
        )


class PeutTransitionnerActe(BasePermission):
    """Scope requis par l'action de transition demandée sur un acte de carrière."""

    def has_permission(self, request, view) -> bool:
        from .models import SCOPE_PAR_ACTION_ACTE

        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        if utilisateur.est_superviseur_national:
            return True
        action = request.data.get("action")
        scope_requis = SCOPE_PAR_ACTION_ACTE.get(action)
        return bool(scope_requis and scope_requis in utilisateur.scopes())


class PeutTransitionnerDemande(BasePermission):
    """`annuler` : réservé au demandeur lui-même (avant toute décision). `valider`/
    `rejeter` : scope `rh:valider` — le périmètre est déjà restreint en amont par
    `demandes_visibles_par` (l'objet n'est atteignable que s'il est visible)."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj) -> bool:
        from .models import SCOPE_PAR_ACTION_DEMANDE

        utilisateur = request.user
        if utilisateur.est_superviseur_national:
            return True
        action = request.data.get("action")
        if action == "annuler":
            return obj.dossier.utilisateur_id == utilisateur.id
        scope_requis = SCOPE_PAR_ACTION_DEMANDE.get(action)
        return bool(scope_requis and scope_requis in utilisateur.scopes())
