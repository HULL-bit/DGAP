"""Pagination par curseur (§6.1) — evite le COUNT(*) coûteux et les décalages de page
sur des jeux de données volumineux et mouvants (actualités, courriers, notifications).
"""

from rest_framework.pagination import CursorPagination


class PaginationParCurseur(CursorPagination):
    page_size = 20
    max_page_size = 100
    page_size_query_param = "limit"
    cursor_query_param = "cursor"
    ordering = "-cree_le"
