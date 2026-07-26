from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import ConfirmationMFAView, ConnexionView, InscriptionMFAView, MoiView

app_name = "comptes"

urlpatterns = [
    path("auth/connexion", ConnexionView.as_view(), name="connexion"),
    path("auth/rafraichissement", TokenRefreshView.as_view(), name="rafraichissement"),
    path("auth/moi", MoiView.as_view(), name="moi"),
    path("auth/mfa/inscription", InscriptionMFAView.as_view(), name="mfa-inscription"),
    path("auth/mfa/confirmation", ConfirmationMFAView.as_view(), name="mfa-confirmation"),
]
