from django.urls import path

from .views import DocumentPublicListView

app_name = "mediatheque"

urlpatterns = [
    path("documents", DocumentPublicListView.as_view(), name="documents"),
]
