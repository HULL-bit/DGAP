from django.urls import path

from .views import ContactCreationView, FAQListView

app_name = "demarches"

urlpatterns = [
    path("contacts", ContactCreationView.as_view(), name="contacts"),
    path("faq", FAQListView.as_view(), name="faq"),
]
