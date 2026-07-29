from django.urls import path

from .views import StatistiquesConcoursView, StatistiquesVisitesView

app_name = "statistiques"

urlpatterns = [
    path(
        "backoffice/statistiques/visites",
        StatistiquesVisitesView.as_view(),
        name="statistiques-visites",
    ),
    path(
        "backoffice/statistiques/concours",
        StatistiquesConcoursView.as_view(),
        name="statistiques-concours",
    ),
]
