from django.urls import path

from .views import (
    AccuseLectureView,
    NoteDeServiceBackofficeDetailView,
    NoteDeServiceBackofficeListCreateView,
    NoteDeServiceDetailView,
    NoteDeServiceListView,
)

app_name = "intranet"

urlpatterns = [
    path("intranet/notes", NoteDeServiceListView.as_view(), name="notes"),
    path("intranet/notes/<uuid:pk>", NoteDeServiceDetailView.as_view(), name="note-detail"),
    path("intranet/notes/<uuid:pk>/lecture", AccuseLectureView.as_view(), name="note-lecture"),
    path(
        "backoffice/intranet/notes",
        NoteDeServiceBackofficeListCreateView.as_view(),
        name="backoffice-notes",
    ),
    path(
        "backoffice/intranet/notes/<uuid:pk>",
        NoteDeServiceBackofficeDetailView.as_view(),
        name="backoffice-note-detail",
    ),
]
