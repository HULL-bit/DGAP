from django.urls import path

from .views import (
    ImageProduitUploadView,
    ProduitBoutiqueBackofficeDetailView,
    ProduitBoutiqueBackofficeListCreateView,
    ProduitBoutiqueListView,
)

app_name = "boutique"

urlpatterns = [
    path("boutique/produits", ProduitBoutiqueListView.as_view(), name="produits"),
    path(
        "backoffice/boutique/produits",
        ProduitBoutiqueBackofficeListCreateView.as_view(),
        name="backoffice-produits-liste",
    ),
    path(
        "backoffice/boutique/produits/<uuid:pk>",
        ProduitBoutiqueBackofficeDetailView.as_view(),
        name="backoffice-produits-detail",
    ),
    path(
        "backoffice/boutique/produits/<uuid:pk>/image",
        ImageProduitUploadView.as_view(),
        name="backoffice-produits-image",
    ),
]
