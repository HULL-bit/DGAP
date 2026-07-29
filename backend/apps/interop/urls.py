from django.urls import path

from .views import EchangeExterneListCreateView, RapprochementPaiementsView

app_name = "interop"

urlpatterns = [
    path(
        "backoffice/interop/echanges",
        EchangeExterneListCreateView.as_view(),
        name="echanges-liste",
    ),
    path(
        "backoffice/interop/rapprochement-paiements",
        RapprochementPaiementsView.as_view(),
        name="rapprochement-paiements",
    ),
]
