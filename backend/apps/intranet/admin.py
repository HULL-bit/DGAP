from django.contrib import admin

from .models import AccuseLectureNote, NoteDeService


class AccuseLectureNoteInline(admin.TabularInline):
    model = AccuseLectureNote
    extra = 0
    readonly_fields = ["utilisateur", "cree_le"]


@admin.register(NoteDeService)
class NoteDeServiceAdmin(admin.ModelAdmin):
    list_display = ["titre", "perimetre_cible", "accuse_lecture_requis", "publie", "cree_le"]
    list_filter = ["perimetre_cible", "accuse_lecture_requis", "publie"]
    search_fields = ["titre"]
    inlines = [AccuseLectureNoteInline]
