"""RBAC maison : rôles métier x périmètres organisationnels (§6.3).

Principe : la présence d'un scope (ex. "visites:instruire") ne suffit pas — l'accès à
un objet donné exige en plus que son périmètre (établissement/direction) soit dans les
périmètres affectés à l'utilisateur. Le refus doit être journalisé côté vue (cf. app
audit) : voir CR-S-07 dans le cahier des charges.
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission

SEUIL_ALERTE_ACCES_REFUSES = 5


class PossedeScope(BasePermission):
    """Vérifie qu'un des scopes requis figure parmi les affectations actives de l'utilisateur."""

    scopes_requis: tuple[str, ...] = ()

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        scopes_requis = getattr(view, "scopes_requis", self.scopes_requis)
        if not scopes_requis:
            return True
        return bool(utilisateur.scopes().intersection(scopes_requis))


class MFAConfirmee(BasePermission):
    """Bloque l'accès aux endpoints sensibles tant qu'un compte interne n'a pas activé
    le MFA (§6.3). La toute première connexion délivre un jeton restreint qui ne
    permet que `GET /auth/moi` et l'inscription/confirmation MFA — jamais les
    endpoints métier (back-office éditorial, RH, etc.).
    """

    message = "Activez l'authentification à deux facteurs avant de continuer."

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        if not (utilisateur and utilisateur.is_authenticated):
            return False
        return not utilisateur.mfa_requis or utilisateur.mfa_active


class RespectePerimetre(BasePermission):
    """Objet-level : le périmètre de l'objet doit être couvert par les affectations de l'acteur.

    Les vues protégeant une ressource cloisonnée par établissement doivent exposer une
    méthode `perimetre_de(objet)` retournant l'identifiant de périmètre à vérifier.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        utilisateur = request.user
        if getattr(utilisateur, "est_superviseur_national", False):
            return True
        obtenir_perimetre = getattr(view, "perimetre_de", None)
        if obtenir_perimetre is None:
            return True
        perimetre_objet = obtenir_perimetre(obj)
        return perimetre_objet in utilisateur.perimetres_autorises()
