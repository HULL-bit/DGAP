from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ArticleBackofficeViewSet,
    ArticleDetailView,
    ArticleListView,
    PageBackofficeViewSet,
    PageDetailView,
)

app_name = "contenus"

routeur_backoffice = DefaultRouter(trailing_slash=False)
routeur_backoffice.register(
    "backoffice/articles", ArticleBackofficeViewSet, basename="backoffice-articles"
)
routeur_backoffice.register("backoffice/pages", PageBackofficeViewSet, basename="backoffice-pages")

urlpatterns = [
    path("articles", ArticleListView.as_view(), name="articles-liste"),
    path("articles/<slug:slug>", ArticleDetailView.as_view(), name="articles-detail"),
    path("pages/<slug:slug>", PageDetailView.as_view(), name="pages-detail"),
    path("", include(routeur_backoffice.urls)),
]
