from django.contrib import admin

from .models import JournalAction


@admin.register(JournalAction)
class JournalActionAdmin(admin.ModelAdmin):
    list_display = (
        "horodatage",
        "acteur",
        "action",
        "ressource_type",
        "ressource_id",
        "adresse_ip",
    )
    list_filter = ("action", "ressource_type")
    search_fields = ("ressource_id", "correlation_id", "acteur__email")
    readonly_fields = [f.name for f in JournalAction._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
