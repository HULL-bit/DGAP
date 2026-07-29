from django.urls import path

from .views import NotificationListView

app_name = "notifications"

urlpatterns = [
    path("backoffice/notifications", NotificationListView.as_view(), name="notifications"),
]
