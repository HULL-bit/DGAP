from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import Action, JournalAction
from apps.etablissements.models import Etablissement
from core.permissions import MFAConfirmee

from .models import TypeMouvement, personnes_visibles_par
from .permissions import PeutConsulterDetenus, PeutGererDetenus
from .serializers import (
    MouvementCreationSerializer,
    PersonneDetenueCreationSerializer,
    PersonneDetenueDetailSerializer,
    PersonneDetenueEditSerializer,
    PersonneDetenueListeSerializer,
)


class PersonneDetenueListCreateView(ListCreateAPIView):
    """GET/POST /api/v1/backoffice/detenus/personnes?numero_ecrou=&etablissement=
    &statut_dossier= — dossier unique (EF-1001), écrou (EF-1002), recherche par
    numéro d'écrou (EF-1009)."""

    def get_permissions(self):
        classes = [
            MFAConfirmee,
            PeutGererDetenus if self.request.method == "POST" else PeutConsulterDetenus,
        ]
        return [c() for c in classes]

    def get_serializer_class(self):
        return (
            PersonneDetenueCreationSerializer
            if self.request.method == "POST"
            else PersonneDetenueListeSerializer
        )

    def get_queryset(self):
        qs = personnes_visibles_par(self.request.user).select_related("etablissement")
        numero = self.request.query_params.get("numero_ecrou")
        if numero:
            qs = qs.filter(numero_ecrou__icontains=numero)
        for champ in ("etablissement", "statut_dossier"):
            valeur = self.request.query_params.get(champ)
            if valeur:
                qs = qs.filter(**{champ: valeur})
        return qs

    def perform_create(self, serializer):
        personne = serializer.save(cree_par=self.request.user, modifie_par=self.request.user)
        personne.enregistrer_mouvement(TypeMouvement.ECROU, acteur=self.request.user)
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.CREER,
            ressource_type="personne_detenue",
            ressource_id=str(personne.id),
            requete=self.request,
        )


class PersonneDetenueDetailView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/backoffice/detenus/personnes/{id} — toute consultation
    est journalisée, sans exception (§6.3)."""

    permission_classes = [MFAConfirmee, PeutConsulterDetenus]

    def get_serializer_class(self):
        return (
            PersonneDetenueEditSerializer
            if self.request.method == "PATCH"
            else PersonneDetenueDetailSerializer
        )

    def get_queryset(self):
        return (
            personnes_visibles_par(self.request.user)
            .select_related("etablissement")
            .prefetch_related("mouvements__etablissement_destination", "mouvements__cree_par")
        )

    def get_object(self):
        objet = super().get_object()
        if self.request.method == "GET":
            JournalAction.tracer(
                acteur=self.request.user,
                action=Action.CONSULTER,
                ressource_type="personne_detenue",
                ressource_id=str(objet.id),
                requete=self.request,
            )
        return objet

    def perform_update(self, serializer):
        personne = serializer.save(modifie_par=self.request.user)
        JournalAction.tracer(
            acteur=self.request.user,
            action=Action.MODIFIER,
            ressource_type="personne_detenue",
            ressource_id=str(personne.id),
            requete=self.request,
            detail={"champs": list(serializer.validated_data.keys())},
        )


class MouvementCreationView(APIView):
    """POST /api/v1/backoffice/detenus/personnes/{id}/mouvements — transfert,
    extraction, hospitalisation, permission de sortir, évasion, réintégration,
    levée d'écrou (EF-1002)."""

    permission_classes = [MFAConfirmee, PeutGererDetenus]

    @extend_schema(request=MouvementCreationSerializer, responses=PersonneDetenueDetailSerializer)
    def post(self, request, pk):
        personne = get_object_or_404(personnes_visibles_par(request.user), pk=pk)
        serializer = MouvementCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        donnees = serializer.validated_data

        etablissement_destination = None
        if donnees.get("etablissement_destination"):
            etablissement_destination = get_object_or_404(
                Etablissement, pk=donnees["etablissement_destination"]
            )

        personne.enregistrer_mouvement(
            donnees["type_mouvement"],
            acteur=request.user,
            etablissement_destination=etablissement_destination,
            motif=donnees.get("motif", ""),
            piece_justificative=donnees.get("piece_justificative"),
            date_mouvement=donnees.get("date_mouvement"),
        )
        JournalAction.tracer(
            acteur=request.user,
            action=Action.MODIFIER,
            ressource_type="personne_detenue",
            ressource_id=str(personne.id),
            requete=request,
            detail={"mouvement": donnees["type_mouvement"]},
        )
        return Response(
            PersonneDetenueDetailSerializer(personne).data, status=status.HTTP_201_CREATED
        )
