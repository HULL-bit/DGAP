from django.urls import path

from .views import MouvementCreationView, PersonneDetenueDetailView, PersonneDetenueListCreateView

app_name = "detenus"

urlpatterns = [
    path(
        "backoffice/detenus/personnes",
        PersonneDetenueListCreateView.as_view(),
        name="personnes-liste",
    ),
    path(
        "backoffice/detenus/personnes/<uuid:pk>",
        PersonneDetenueDetailView.as_view(),
        name="personnes-detail",
    ),
    path(
        "backoffice/detenus/personnes/<uuid:pk>/mouvements",
        MouvementCreationView.as_view(),
        name="personnes-mouvements",
    ),
]
