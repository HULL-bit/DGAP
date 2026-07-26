from django.urls import path

from .views import DirectionRegionaleListView, RegionListView, TypeEtablissementListView

app_name = "referentiels"

urlpatterns = [
    path("referentiels/regions", RegionListView.as_view(), name="regions"),
    path(
        "referentiels/directions-regionales",
        DirectionRegionaleListView.as_view(),
        name="directions-regionales",
    ),
    path(
        "referentiels/types-etablissement",
        TypeEtablissementListView.as_view(),
        name="types-etablissement",
    ),
]
