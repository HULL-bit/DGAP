from django.contrib import admin

from .models import Document, LienPartage, VersionDocument


class VersionDocumentInline(admin.TabularInline):
    model = VersionDocument
    extra = 0
    readonly_fields = [
        "numero",
        "fichier",
        "empreinte_sha256",
        "commentaire",
        "cree_par",
        "cree_le",
    ]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        "titre",
        "nature",
        "categorie",
        "statut_ocr",
        "statut_cycle_vie",
        "est_verrouille",
    ]
    list_filter = ["nature", "statut_ocr", "statut_cycle_vie", "gel_juridique"]
    search_fields = ["titre", "contenu_ocr", "empreinte_sha256"]
    readonly_fields = ["empreinte_sha256", "contenu_ocr", "statut_ocr"]
    inlines = [VersionDocumentInline]


@admin.register(LienPartage)
class LienPartageAdmin(admin.ModelAdmin):
    list_display = ["document", "jeton", "expire_le", "cree_par"]
    readonly_fields = ["jeton"]
