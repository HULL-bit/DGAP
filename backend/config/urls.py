from django.contrib import admin
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAuthenticated


def sante(request):
    """Sonde de vivacité/disponibilité (orchestration, load balancer) — vérifie
    une vraie connexion DB plutôt qu'une réponse statique, sinon un load
    balancer continue de router du trafic vers une instance dont la base est
    injoignable."""
    try:
        with connection.cursor() as curseur:
            curseur.execute("SELECT 1")
    except Exception:
        return JsonResponse({"statut": "indisponible"}, status=503)
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
    path("api/v1/", include("apps.concours.urls")),
    path("api/v1/", include("apps.boutique.urls")),
    path("api/v1/", include("apps.intranet.urls")),
    path("api/v1/", include("apps.statistiques.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/", include("apps.courrier.urls")),
    path("api/v1/", include("apps.ged.urls")),
    path("api/v1/", include("apps.rh.urls")),
    path("api/v1/", include("apps.audit.urls")),
    path("api/v1/", include("apps.detenus.urls")),
    path("api/v1/", include("apps.interop.urls")),
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
