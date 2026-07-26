from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAuthenticated


def sante(request):
    return JsonResponse({"statut": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("sante/", sante, name="sante"),
    path("api/v1/", include("apps.comptes.urls")),
    path("api/v1/", include("apps.referentiels.urls")),
    path("api/v1/", include("apps.etablissements.urls")),
    path("api/v1/", include("apps.contenus.urls")),
    path("api/v1/", include("apps.demarches.urls")),
    path("api/v1/", include("apps.mediatheque.urls")),
    path("api/v1/", include("apps.visites.urls")),
    # Documentation API — protégée (§9.2 : Swagger UI protégé, jamais public en clair).
    path(
        "api/v1/schema/",
        SpectacularAPIView.as_view(permission_classes=[IsAuthenticated]),
        name="schema",
    ),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[IsAuthenticated]),
        name="docs",
    ),
]
