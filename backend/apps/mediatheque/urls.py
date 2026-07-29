from django.urls import path

from .views import (
    DocumentPublicBackofficeDetailView,
    DocumentPublicBackofficeListCreateView,
    DocumentPublicListView,
    FichierDocumentUploadView,
    GalerieBackofficeDetailView,
    GalerieBackofficeListCreateView,
    GalerieListePubliqueView,
    GaleriePubliqueView,
    MediaGalerieCreationView,
    MediaGalerieDetailView,
)

app_name = "mediatheque"

urlpatterns = [
    path("documents", DocumentPublicListView.as_view(), name="documents"),
    path(
        "backoffice/documents",
        DocumentPublicBackofficeListCreateView.as_view(),
        name="documents-backoffice-liste",
    ),
    path(
        "backoffice/documents/<uuid:pk>",
        DocumentPublicBackofficeDetailView.as_view(),
        name="documents-backoffice-detail",
    ),
    path(
        "backoffice/documents/<uuid:pk>/fichier",
        FichierDocumentUploadView.as_view(),
        name="documents-backoffice-fichier",
    ),
    path("galeries", GalerieListePubliqueView.as_view(), name="galerie-liste-publique"),
    path("galeries/<str:code>", GaleriePubliqueView.as_view(), name="galerie-publique"),
    path(
        "backoffice/galeries",
        GalerieBackofficeListCreateView.as_view(),
        name="galerie-backoffice-liste",
    ),
    path(
        "backoffice/galeries/<uuid:pk>",
        GalerieBackofficeDetailView.as_view(),
        name="galerie-backoffice-detail",
    ),
    path(
        "backoffice/galeries/<uuid:galerie_id>/medias",
        MediaGalerieCreationView.as_view(),
        name="media-galerie-creation",
    ),
    path(
        "backoffice/medias/<uuid:pk>",
        MediaGalerieDetailView.as_view(),
        name="media-galerie-detail",
    ),
]
