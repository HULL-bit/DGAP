from django.urls import path

from .views import (
    AvisConcoursUploadView,
    CandidatureCreationView,
    CandidatureInstructionDetailView,
    CandidatureInstructionListView,
    CandidatureStatutView,
    CandidatureTransitionView,
    ConcoursBackofficeDetailView,
    ConcoursBackofficeListCreateView,
    ConcoursDetailView,
    ConcoursListView,
    ConfirmationPaiementMockView,
    ConvocationPDFParNumeroView,
    ConvocationPDFView,
    PieceJointeCandidatureCreationView,
    RenvoiSuiviCandidatureView,
    VerificationConvocationView,
)

app_name = "concours"

urlpatterns = [
    path("concours", ConcoursListView.as_view(), name="liste"),
    path("concours/<slug:code>", ConcoursDetailView.as_view(), name="detail"),
    path(
        "backoffice/concours",
        ConcoursBackofficeListCreateView.as_view(),
        name="backoffice-liste",
    ),
    path(
        "backoffice/concours/<uuid:pk>",
        ConcoursBackofficeDetailView.as_view(),
        name="backoffice-detail",
    ),
    path(
        "backoffice/concours/<uuid:pk>/avis",
        AvisConcoursUploadView.as_view(),
        name="backoffice-avis",
    ),
    path("candidatures", CandidatureCreationView.as_view(), name="creation"),
    path(
        "candidatures/instruction",
        CandidatureInstructionListView.as_view(),
        name="instruction-liste",
    ),
    path(
        "candidatures/instruction/<uuid:pk>",
        CandidatureInstructionDetailView.as_view(),
        name="instruction-detail",
    ),
    path(
        "candidatures/instruction/<uuid:pk>/transition",
        CandidatureTransitionView.as_view(),
        name="transition",
    ),
    path(
        "candidatures/<str:numero_suivi>/statut",
        CandidatureStatutView.as_view(),
        name="statut",
    ),
    path(
        "candidatures/<str:numero_suivi>/paiement/confirmer-mock",
        ConfirmationPaiementMockView.as_view(),
        name="paiement-mock",
    ),
    path(
        "candidatures/<str:numero_suivi>/convocation/pdf",
        ConvocationPDFParNumeroView.as_view(),
        name="convocation-pdf-par-numero",
    ),
    path("candidatures/renvoi", RenvoiSuiviCandidatureView.as_view(), name="renvoi-suivi"),
    path(
        "candidatures/<uuid:candidature_id>/pieces",
        PieceJointeCandidatureCreationView.as_view(),
        name="pieces",
    ),
    path(
        "convocations/<uuid:candidature_id>/pdf",
        ConvocationPDFView.as_view(),
        name="convocation-pdf",
    ),
    path(
        "convocations/verification",
        VerificationConvocationView.as_view(),
        name="convocation-verification",
    ),
]
