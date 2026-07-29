from rest_framework.permissions import BasePermission

SCOPES_INTEROP = {"interop:consulter", "interop:gerer"}


class PeutConsulterInterop(BasePermission):
    """Lecture du journal des échanges externes et du rapprochement des
    paiements : `interop:consulter` ou `interop:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and (utilisateur.scopes() & SCOPES_INTEROP or utilisateur.est_superviseur_national)
        )


class PeutGererInterop(BasePermission):
    """Enregistrer manuellement un échange externe : `interop:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("interop:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
