from django.contrib import admin

from .models import FAQ, Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["numero_ticket", "nom", "sujet", "statut", "cree_le"]
    list_filter = ["statut"]
    search_fields = ["numero_ticket", "nom", "email", "sujet"]
    readonly_fields = ["numero_ticket"]


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ["question", "categorie", "ordre", "publie"]
    list_filter = ["categorie", "publie"]
    search_fields = ["question", "reponse"]
