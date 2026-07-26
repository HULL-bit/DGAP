from django.urls import path

from .views import EtablissementDetailView, EtablissementListView

app_name = "etablissements"

urlpatterns = [
    path("etablissements", EtablissementListView.as_view(), name="liste"),
    path("etablissements/<uuid:pk>", EtablissementDetailView.as_view(), name="detail"),
]
