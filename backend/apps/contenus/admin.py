from django.contrib import admin

from .models import Article, ElementMenu, Menu, Page, Rubrique, VersionContenu


@admin.register(Rubrique)
class RubriqueAdmin(admin.ModelAdmin):
    list_display = ["titre", "code", "parent", "ordre"]
    search_fields = ["titre", "code"]


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["titre", "statut", "rubrique", "date_publication"]
    list_filter = ["statut", "rubrique"]
    search_fields = ["titre", "slug", "chapo"]
    prepopulated_fields = {"slug": ("titre",)}


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ["titre", "statut", "rubrique"]
    list_filter = ["statut", "rubrique"]
    search_fields = ["titre", "slug"]
    prepopulated_fields = {"slug": ("titre",)}


@admin.register(VersionContenu)
class VersionContenuAdmin(admin.ModelAdmin):
    list_display = ["contenu_source", "numero", "auteur", "cree_le", "commentaire"]
    list_filter = ["content_type"]
    readonly_fields = [f.name for f in VersionContenu._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class ElementMenuInline(admin.TabularInline):
    model = ElementMenu
    extra = 1
    fk_name = "menu"


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ["libelle", "code"]
    search_fields = ["libelle", "code"]
    inlines = [ElementMenuInline]
