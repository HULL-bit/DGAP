from django.urls import path

from .views import (
    DemandeVisiteCreationView,
    DemandeVisiteInstructionDetailView,
    DemandeVisiteInstructionListView,
    DemandeVisiteStatutView,
    DemandeVisiteTransitionView,
    PermisPDFParNumeroView,
    PermisPDFView,
    PieceJointeCreationView,
    VerificationPermisView,
)

app_name = "visites"

urlpatterns = [
    path("demandes-visite", DemandeVisiteCreationView.as_view(), name="creation"),
    path(
        "demandes-visite/instruction",
        DemandeVisiteInstructionListView.as_view(),
        name="instruction-liste",
    ),
    path(
        "demandes-visite/instruction/<uuid:pk>",
        DemandeVisiteInstructionDetailView.as_view(),
        name="instruction-detail",
    ),
    path(
        "demandes-visite/instruction/<uuid:pk>/transition",
        DemandeVisiteTransitionView.as_view(),
        name="transition",
    ),
    path(
        "demandes-visite/<str:numero_suivi>/statut",
        DemandeVisiteStatutView.as_view(),
        name="statut",
    ),
    path(
        "demandes-visite/<str:numero_suivi>/permis/pdf",
        PermisPDFParNumeroView.as_view(),
        name="permis-pdf-par-numero",
    ),
    path(
        "demandes-visite/<uuid:demande_id>/pieces", PieceJointeCreationView.as_view(), name="pieces"
    ),
    path("permis/<uuid:demande_id>/pdf", PermisPDFView.as_view(), name="permis-pdf"),
    path("permis/verification", VerificationPermisView.as_view(), name="permis-verification"),
]
