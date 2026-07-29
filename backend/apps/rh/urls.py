from django.urls import path

from .views import (
    ActeCarriereDetailView,
    ActeCarriereListCreateView,
    ActeCarriereTransitionView,
    AffectationAgentCreationView,
    AnnuaireListView,
    AttestationTravailPdfView,
    DemandeRHListCreateView,
    DemandeRHTransitionView,
    DossierAgentDetailView,
    DossierAgentListCreateView,
    MonDossierView,
    UtilisateurSansDossierListView,
)

app_name = "rh"

urlpatterns = [
    path("rh/mon-dossier", MonDossierView.as_view(), name="mon-dossier"),
    path("rh/annuaire", AnnuaireListView.as_view(), name="annuaire"),
    path("rh/demandes", DemandeRHListCreateView.as_view(), name="demandes-liste"),
    path(
        "rh/demandes/<uuid:pk>/transition",
        DemandeRHTransitionView.as_view(),
        name="demandes-transition",
    ),
    path(
        "rh/demandes/<uuid:pk>/attestation",
        AttestationTravailPdfView.as_view(),
        name="demandes-attestation",
    ),
    path(
        "backoffice/rh/utilisateurs-sans-dossier",
        UtilisateurSansDossierListView.as_view(),
        name="utilisateurs-sans-dossier",
    ),
    path("backoffice/rh/dossiers", DossierAgentListCreateView.as_view(), name="dossiers-liste"),
    path(
        "backoffice/rh/dossiers/<uuid:pk>", DossierAgentDetailView.as_view(), name="dossiers-detail"
    ),
    path(
        "backoffice/rh/dossiers/<uuid:pk>/affectations",
        AffectationAgentCreationView.as_view(),
        name="dossiers-affectations",
    ),
    path(
        "backoffice/rh/actes-carriere",
        ActeCarriereListCreateView.as_view(),
        name="actes-liste",
    ),
    path(
        "backoffice/rh/actes-carriere/<uuid:pk>",
        ActeCarriereDetailView.as_view(),
        name="actes-detail",
    ),
    path(
        "backoffice/rh/actes-carriere/<uuid:pk>/transition",
        ActeCarriereTransitionView.as_view(),
        name="actes-transition",
    ),
]
