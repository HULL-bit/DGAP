from django.urls import path

from .views import (
    CourrierEntrantDetailView,
    CourrierEntrantListCreateView,
    CourrierEntrantTransitionView,
    CourrierSortantDetailView,
    CourrierSortantListCreateView,
    FichierCourrierEntrantUploadView,
    FichierCourrierSortantUploadView,
    ReponseCourrierListCreateView,
    ReponseCourrierTransitionView,
)

app_name = "courrier"

urlpatterns = [
    path(
        "backoffice/courrier/entrant", CourrierEntrantListCreateView.as_view(), name="entrant-liste"
    ),
    path(
        "backoffice/courrier/entrant/<uuid:pk>",
        CourrierEntrantDetailView.as_view(),
        name="entrant-detail",
    ),
    path(
        "backoffice/courrier/entrant/<uuid:pk>/transition",
        CourrierEntrantTransitionView.as_view(),
        name="entrant-transition",
    ),
    path(
        "backoffice/courrier/entrant/<uuid:pk>/fichier",
        FichierCourrierEntrantUploadView.as_view(),
        name="entrant-fichier",
    ),
    path(
        "backoffice/courrier/entrant/<uuid:courrier_id>/reponses",
        ReponseCourrierListCreateView.as_view(),
        name="reponses-liste",
    ),
    path(
        "backoffice/courrier/reponses/<uuid:pk>/transition",
        ReponseCourrierTransitionView.as_view(),
        name="reponse-transition",
    ),
    path(
        "backoffice/courrier/sortant", CourrierSortantListCreateView.as_view(), name="sortant-liste"
    ),
    path(
        "backoffice/courrier/sortant/<uuid:pk>",
        CourrierSortantDetailView.as_view(),
        name="sortant-detail",
    ),
    path(
        "backoffice/courrier/sortant/<uuid:pk>/fichier",
        FichierCourrierSortantUploadView.as_view(),
        name="sortant-fichier",
    ),
]
