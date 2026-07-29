from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Action, JournalAction
from core.pagination import PaginationParCurseur
from core.permissions import MFAConfirmee

from .models import LienPartage, documents_visibles_par
from .permissions import PeutConsulterGed, PeutGererGed
from .serializers import (
    DocumentCreationSerializer,
    DocumentDetailSerializer,
    DocumentListeSerializer,
    LienPartageCreationSerializer,
    LienPartageSerializer,
    NouvelleVersionSerializer,
    TelechargementPartageSerializer,
)


class DocumentListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/ged/documents?q=&nature=&categorie=&
    perimetre=&statut_cycle_vie= — référentiel documentaire (EF-601), recherche
    plein texte sur le titre et le contenu océrisé (EF-602, EF-603)."""

    pagination_class = PaginationParCurseur

    def get_permissions(self):
        classes = [
            MFAConfirmee,
            PeutGererGed if self.request.method == "POST" else PeutConsulterGed,
        ]
        return [c() for c in classes]

    def get_serializer_class(self):
        return (
            DocumentCreationSerializer if self.request.method == "POST" else DocumentListeSerializer
        )

    def get_queryset(self):
        qs = documents_visibles_par(self.request.user).select_related("perimetre")
        recherche = self.request.query_params.get("q")
        if recherche:
            from django.db.models import Q

            qs = qs.filter(Q(titre__icontains=recherche) | Q(contenu_ocr__icontains=recherche))
        for champ, param in [
            ("nature", "nature"),
            ("categorie", "categorie"),
            ("perimetre__code", "perimetre"),
            ("statut_cycle_vie", "statut_cycle_vie"),
        ]:
            valeur = self.request.query_params.get(param)
            if valeur:
                qs = qs.filter(**{champ: valeur})
        return qs

    def perform_create(self, serializer):
        document = serializer.save(cree_par=self.request.user, modifie_par=self.request.user)
        document.traiter_fichier_entrant()
        document.save(update_fields=["empreinte_sha256", "contenu_ocr", "statut_ocr"])


class DocumentDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/ged/documents/{id}."""

    serializer_class = DocumentDetailSerializer
    permission_classes = [MFAConfirmee, PeutConsulterGed]

    def get_queryset(self):
        return (
            documents_visibles_par(self.request.user)
            .select_related("perimetre")
            .prefetch_related("versions")
        )


class NouvelleVersionView(APIView):
    """POST /api/v1/backoffice/ged/documents/{id}/versions — dépose une nouvelle
    version, archive l'ancienne (EF-604). Refusé si le document est verrouillé par
    quelqu'un d'autre (check-in/check-out)."""

    permission_classes = [MFAConfirmee, PeutGererGed]

    @extend_schema(request=NouvelleVersionSerializer, responses=DocumentDetailSerializer)
    def post(self, request, pk):
        document = get_object_or_404(documents_visibles_par(request.user), pk=pk)
        verrou = document.verrouille_par
        if verrou is not None and verrou.id != request.user.id:
            return Response(
                {"detail": f"Document verrouillé par {verrou.get_full_name()}."},
                status=status.HTTP_409_CONFLICT,
            )
        serializer = NouvelleVersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document.nouvelle_version(
            serializer.validated_data["fichier"],
            commentaire=serializer.validated_data.get("commentaire", ""),
            acteur=request.user,
        )
        return Response(DocumentDetailSerializer(document).data, status=status.HTTP_201_CREATED)


class RestaurationVersionView(APIView):
    """POST /api/v1/backoffice/ged/documents/{id}/versions/{numero}/restaurer
    (EF-604)."""

    permission_classes = [MFAConfirmee, PeutGererGed]

    @extend_schema(request=None, responses=DocumentDetailSerializer)
    def post(self, request, pk, numero):
        document = get_object_or_404(documents_visibles_par(request.user), pk=pk)
        version = get_object_or_404(document.versions, numero=numero)
        document.restaurer_version(version, acteur=request.user)
        return Response(DocumentDetailSerializer(document).data)


class VerrouillageView(APIView):
    """POST/DELETE /api/v1/backoffice/ged/documents/{id}/verrouillage —
    check-in/check-out (EF-604). Seul l'auteur du verrou (ou un superviseur
    national) peut le lever."""

    permission_classes = [MFAConfirmee, PeutGererGed]

    @extend_schema(request=None, responses=DocumentDetailSerializer)
    def post(self, request, pk):
        document = get_object_or_404(documents_visibles_par(request.user), pk=pk)
        verrou = document.verrouille_par
        if verrou is not None and verrou.id != request.user.id:
            return Response(
                {"detail": f"Déjà verrouillé par {verrou.get_full_name()}."},
                status=status.HTTP_409_CONFLICT,
            )
        document.verrouiller(request.user)
        return Response(DocumentDetailSerializer(document).data)

    @extend_schema(responses=DocumentDetailSerializer)
    def delete(self, request, pk):
        document = get_object_or_404(documents_visibles_par(request.user), pk=pk)
        verrou = document.verrouille_par
        if (
            verrou is not None
            and verrou.id != request.user.id
            and not request.user.est_superviseur_national
        ):
            return Response(
                {"detail": f"Verrouillé par {verrou.get_full_name()}."},
                status=status.HTTP_403_FORBIDDEN,
            )
        document.deverrouiller()
        return Response(DocumentDetailSerializer(document).data)


class LienPartageCreationView(APIView):
    """POST /api/v1/backoffice/ged/documents/{id}/partage — lien de partage
    interne à durée limitée (EF-608)."""

    permission_classes = [MFAConfirmee, PeutGererGed]

    @extend_schema(request=LienPartageCreationSerializer, responses=LienPartageSerializer)
    def post(self, request, pk):
        document = get_object_or_404(documents_visibles_par(request.user), pk=pk)
        serializer = LienPartageCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lien = LienPartage.objects.create(
            document=document,
            expire_le=timezone.now() + timedelta(hours=serializer.validated_data["duree_heures"]),
            cree_par=request.user,
        )
        return Response(LienPartageSerializer(lien).data, status=status.HTTP_201_CREATED)


class TelechargementPartageView(APIView):
    """GET /api/v1/backoffice/ged/partage/{jeton} — consommation d'un lien de
    partage : réservé aux agents authentifiés (« interne » au sens du cahier),
    jamais anonyme. Chaque consultation est journalisée (EF-608)."""

    permission_classes = [MFAConfirmee, PeutConsulterGed]

    @extend_schema(responses=TelechargementPartageSerializer)
    def get(self, request, jeton):
        lien = get_object_or_404(LienPartage.objects.select_related("document"), jeton=jeton)
        if lien.est_expire:
            return Response({"detail": "Ce lien de partage a expiré."}, status=status.HTTP_410_GONE)

        JournalAction.tracer(
            acteur=request.user,
            action=Action.CONSULTER,
            ressource_type=lien.document._meta.db_table,
            ressource_id=str(lien.document.pk),
            requete=request,
            detail={"via_lien_partage": str(lien.pk)},
        )
        return Response({"fichier_url": lien.document.fichier.url, "titre": lien.document.titre})
