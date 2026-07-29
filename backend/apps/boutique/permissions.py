from rest_framework.permissions import BasePermission


class PeutGererBoutique(BasePermission):
    """Créer/modifier/téléverser un produit de la boutique : scope `boutique:gerer`."""

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and ("boutique:gerer" in utilisateur.scopes() or utilisateur.est_superviseur_national)
        )
