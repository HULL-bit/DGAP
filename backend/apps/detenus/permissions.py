from rest_framework.permissions import BasePermission

SCOPES_DETENUS = {"detenus:consulter", "detenus:gerer"}


class PeutConsulterDetenus(BasePermission):
    """Accès en lecture au dossier détenu : `detenus:consulter` ou
    `detenus:gerer` — la restriction par établissement (§6.3) est appliquée en
    plus, au niveau du queryset (`personnes_visibles_par`)."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (utilisateur.scopes() & SCOPES_DETENUS or utilisateur.est_superviseur_national)
        )


class PeutGererDetenus(BasePermission):
    """Écrou, mouvements : scope `detenus:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("detenus:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
