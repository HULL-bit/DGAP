from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AffectationRoleCreationView,
    AffectationRoleRevocationView,
    AttributionPermissionCreationView,
    AttributionPermissionRevocationView,
    ConfirmationMFAView,
    ConnexionView,
    InscriptionMFAView,
    MoiView,
    PerimetreListView,
    PermissionListView,
    RoleDetailView,
    RoleListCreateView,
    UtilisateurAdminDetailView,
    UtilisateurAdminListCreateView,
)

app_name = "comptes"

urlpatterns = [
    path("auth/connexion", ConnexionView.as_view(), name="connexion"),
    path("auth/rafraichissement", TokenRefreshView.as_view(), name="rafraichissement"),
    path("auth/moi", MoiView.as_view(), name="moi"),
    path("auth/mfa/inscription", InscriptionMFAView.as_view(), name="mfa-inscription"),
    path("auth/mfa/confirmation", ConfirmationMFAView.as_view(), name="mfa-confirmation"),
    path("perimetres", PerimetreListView.as_view(), name="perimetres"),
    path(
        "backoffice/comptes/utilisateurs",
        UtilisateurAdminListCreateView.as_view(),
        name="utilisateurs-liste",
    ),
    path(
        "backoffice/comptes/utilisateurs/<uuid:pk>",
        UtilisateurAdminDetailView.as_view(),
        name="utilisateurs-detail",
    ),
    path("backoffice/comptes/roles", RoleListCreateView.as_view(), name="roles-liste"),
    path("backoffice/comptes/roles/<uuid:pk>", RoleDetailView.as_view(), name="roles-detail"),
    path("backoffice/comptes/permissions", PermissionListView.as_view(), name="permissions-liste"),
    path(
        "backoffice/comptes/affectations-role",
        AffectationRoleCreationView.as_view(),
        name="affectations-role-creation",
    ),
    path(
        "backoffice/comptes/affectations-role/<uuid:pk>/revoquer",
        AffectationRoleRevocationView.as_view(),
        name="affectations-role-revocation",
    ),
    path(
        "backoffice/comptes/attributions-permission",
        AttributionPermissionCreationView.as_view(),
        name="attributions-permission-creation",
    ),
    path(
        "backoffice/comptes/attributions-permission/<uuid:pk>/revoquer",
        AttributionPermissionRevocationView.as_view(),
        name="attributions-permission-revocation",
    ),
]
