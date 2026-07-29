from django.urls import path

from .views import JournalActionListView

app_name = "audit"

urlpatterns = [
    path("backoffice/audit/journal", JournalActionListView.as_view(), name="journal-liste"),
]
