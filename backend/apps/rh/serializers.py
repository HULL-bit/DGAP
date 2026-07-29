from rest_framework import serializers

from apps.comptes.models import Utilisateur

from .models import ActeCarriere, AffectationAgent, DemandeRH, DossierAgent, SoldeConge


class UtilisateurSansDossierSerializer(serializers.ModelSerializer):
    """Recherche d'un agent sans dossier RH, pour en créer un (EF-801)."""

    nom_complet = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = Utilisateur
        fields = ["id", "nom_complet", "email"]
        read_only_fields = fields


class AffectationAgentSerializer(serializers.ModelSerializer):
    perimetre_libelle = serializers.CharField(source="perimetre.libelle", read_only=True)

    class Meta:
        model = AffectationAgent
        fields = [
            "id",
            "perimetre",
            "perimetre_libelle",
            "fonction",
            "date_debut",
            "date_fin",
            "est_active",
        ]
        read_only_fields = ["id", "perimetre_libelle", "est_active"]


class SoldeCongeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoldeConge
        fields = ["annee", "jours_acquis", "jours_pris", "jours_restants"]
        read_only_fields = fields


class DossierAgentSerializer(serializers.ModelSerializer):
    """Self-service (EF-704) et affichage back-office — lecture seule ici, la
    modification passe par `DossierAgentBackofficeSerializer` (RH) ou par un acte
    de carrière (grade, position administrative)."""

    utilisateur_nom = serializers.CharField(source="utilisateur.get_full_name", read_only=True)
    utilisateur_email = serializers.EmailField(source="utilisateur.email", read_only=True)
    matricule = serializers.CharField(source="utilisateur.matricule", read_only=True)
    affectations = AffectationAgentSerializer(many=True, read_only=True)
    soldes_conge = SoldeCongeSerializer(many=True, read_only=True)

    class Meta:
        model = DossierAgent
        fields = [
            "id",
            "utilisateur_nom",
            "utilisateur_email",
            "matricule",
            "corps",
            "grade",
            "position_administrative",
            "situation_familiale",
            "date_entree_service",
            "diplomes",
            "affectations",
            "soldes_conge",
            "cree_le",
        ]
        read_only_fields = fields


class DossierAgentBackofficeSerializer(serializers.ModelSerializer):
    """CRUD RH (scope `rh:gerer`, EF-801)."""

    utilisateur_nom = serializers.CharField(source="utilisateur.get_full_name", read_only=True)
    utilisateur_email = serializers.EmailField(source="utilisateur.email", read_only=True)
    affectations = AffectationAgentSerializer(many=True, read_only=True)

    class Meta:
        model = DossierAgent
        fields = [
            "id",
            "utilisateur",
            "utilisateur_nom",
            "utilisateur_email",
            "corps",
            "grade",
            "position_administrative",
            "situation_familiale",
            "date_entree_service",
            "diplomes",
            "affectations",
            "cree_le",
        ]
        read_only_fields = ["id", "utilisateur_nom", "utilisateur_email", "affectations", "cree_le"]


class AnnuaireSerializer(serializers.ModelSerializer):
    """Annuaire interne (EF-706) — champs minimaux, jamais la situation familiale,
    les diplômes ou les soldes de congé."""

    nom = serializers.CharField(source="utilisateur.get_full_name", read_only=True)
    email = serializers.EmailField(source="utilisateur.email", read_only=True)
    telephone = serializers.CharField(source="utilisateur.telephone", read_only=True)
    fonction_actuelle = serializers.SerializerMethodField()
    perimetre_actuel_libelle = serializers.SerializerMethodField()

    class Meta:
        model = DossierAgent
        fields = [
            "id",
            "nom",
            "email",
            "telephone",
            "corps",
            "grade",
            "fonction_actuelle",
            "perimetre_actuel_libelle",
        ]
        read_only_fields = fields

    def get_fonction_actuelle(self, obj: DossierAgent) -> str:
        affectation = obj.affectation_active
        return affectation.fonction if affectation else ""

    def get_perimetre_actuel_libelle(self, obj: DossierAgent) -> str:
        affectation = obj.affectation_active
        return affectation.perimetre.libelle if affectation else ""


class ActeCarriereSerializer(serializers.ModelSerializer):
    dossier_nom = serializers.CharField(source="dossier.utilisateur.get_full_name", read_only=True)
    valide_par_nom = serializers.SerializerMethodField()
    nouveau_perimetre_libelle = serializers.CharField(
        source="nouveau_perimetre.libelle", read_only=True, default=""
    )

    class Meta:
        model = ActeCarriere
        fields = [
            "id",
            "numero",
            "dossier",
            "dossier_nom",
            "type_acte",
            "statut",
            "date_effet",
            "motif",
            "nouveau_grade",
            "nouveau_perimetre",
            "nouveau_perimetre_libelle",
            "nouvelle_fonction",
            "valide_par_nom",
            "date_validation",
            "motif_rejet",
            "cree_le",
        ]
        read_only_fields = [
            "id",
            "numero",
            "dossier_nom",
            "statut",
            "nouveau_perimetre_libelle",
            "valide_par_nom",
            "date_validation",
            "motif_rejet",
            "cree_le",
        ]

    def get_valide_par_nom(self, obj: ActeCarriere) -> str:
        return obj.valide_par.get_full_name() if obj.valide_par else ""


class TransitionActeSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["soumettre", "valider", "rejeter"])
    motif_rejet = serializers.CharField(required=False, allow_blank=True, default="")


class DemandeRHSerializer(serializers.ModelSerializer):
    dossier_nom = serializers.CharField(source="dossier.utilisateur.get_full_name", read_only=True)
    valide_par_nom = serializers.SerializerMethodField()
    nombre_jours = serializers.IntegerField(read_only=True)

    class Meta:
        model = DemandeRH
        fields = [
            "id",
            "numero",
            "dossier",
            "dossier_nom",
            "type_demande",
            "statut",
            "date_debut",
            "date_fin",
            "nombre_jours",
            "motif",
            "valide_par_nom",
            "date_validation",
            "motif_rejet",
            "cree_le",
        ]
        read_only_fields = [
            "id",
            "numero",
            "dossier",
            "dossier_nom",
            "statut",
            "nombre_jours",
            "valide_par_nom",
            "date_validation",
            "motif_rejet",
            "cree_le",
        ]

    def get_valide_par_nom(self, obj: DemandeRH) -> str:
        return obj.valide_par.get_full_name() if obj.valide_par else ""


class TransitionDemandeSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["valider", "rejeter", "annuler"])
    motif_rejet = serializers.CharField(required=False, allow_blank=True, default="")
