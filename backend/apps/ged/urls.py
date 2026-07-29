from django.urls import path

from .views import (
    DocumentDetailView,
    DocumentListCreateView,
    LienPartageCreationView,
    NouvelleVersionView,
    RestaurationVersionView,
    TelechargementPartageView,
    VerrouillageView,
)

app_name = "ged"

urlpatterns = [
    path("backoffice/ged/documents", DocumentListCreateView.as_view(), name="documents-liste"),
    path(
        "backoffice/ged/documents/<uuid:pk>", DocumentDetailView.as_view(), name="documents-detail"
    ),
    path(
        "backoffice/ged/documents/<uuid:pk>/versions",
        NouvelleVersionView.as_view(),
        name="documents-versions",
    ),
    path(
        "backoffice/ged/documents/<uuid:pk>/versions/<int:numero>/restaurer",
        RestaurationVersionView.as_view(),
        name="documents-restaurer",
    ),
    path(
        "backoffice/ged/documents/<uuid:pk>/verrouillage",
        VerrouillageView.as_view(),
        name="documents-verrouillage",
    ),
    path(
        "backoffice/ged/documents/<uuid:pk>/partage",
        LienPartageCreationView.as_view(),
        name="documents-partage",
    ),
    path(
        "backoffice/ged/partage/<str:jeton>",
        TelechargementPartageView.as_view(),
        name="partage-telechargement",
    ),
]
