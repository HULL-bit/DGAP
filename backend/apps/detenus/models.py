"""Dossier numérique de la personne détenue — apps.detenus (M10), Bloc G.

================================================================================
ACCÈS RÉSERVÉ — DONNÉES SENSIBLES (cahier §6.3, module M10) : ce module traite
les données les plus sensibles du système. **Jamais routé côté public** —
aucune app frontend publique (portail, démarches) n'importe ni n'appelle ces
endpoints, seul le back-office interne y accède. Accès réservé aux agents
habilités (`detenus:consulter`/`detenus:gerer`), restreint par périmètre
d'établissement, MFA obligatoire (`core.permissions.MFAConfirmee`), et **toute
consultation d'un dossier est journalisée** — pas seulement les cas sensibles
comme dans `apps.courrier` : voir `PersonneDetenueDetailView.get()`.
================================================================================

Portée de cette première passe (EF-1001, EF-1002 — « Obligatoire » ; EF-1009 —
« Obligatoire », restreint à la recherche par numéro d'écrou) :
- Dossier unique avec identité chiffrée applicativement en AES-256-GCM
  (`core.chiffrement`/`core.champs.ChampChiffre`) — `nom`/`prenom` ne sont
  jamais en clair en base, y compris dans les sauvegardes.
- Écrou et mouvements (transfert, extraction, hospitalisation, permission de
  sortir, évasion, réintégration, levée d'écrou) avec pièces justificatives et
  horodatage — historique complet, jamais réécrit.
- Recherche par numéro d'écrou (indexé, en clair par construction — un
  identifiant réglementaire, pas une donnée d'identité).

Non couvert (dépendances non livrées, hors périmètre produit, ou risque
métier/juridique à ne pas assumer sans expertise dédiée) :
- EF-1003, volet « calcul assisté » des dates clés (fin de peine, éligibilités
  aux aménagements) selon les règles statutaires en vigueur — un calcul erroné
  aurait des conséquences réelles sur la liberté d'une personne :
  `date_liberation_prevue` est un champ saisi et mis à jour manuellement par un
  agent habilité, **jamais calculé automatiquement par ce code**. Alertes
  automatiques d'échéances non construites (dépendent de ce calcul).
- EF-1004 (discipline) — procédures disciplinaires (incidents, commissions,
  sanctions, recours) : sous-domaine entier distinct, non construit.
- EF-1005 (santé, accès cloisonné) — nécessite un modèle de données et une
  couche d'accès dédiés, distincts des habilitations établissement déjà en
  place, avec ses propres règles de non-divulgation aux non-soignants : sujet
  sensible à traiter dans une passe dédiée, pas en extension de ce module.
- EF-1006 (activités, travail, formation) — sous-domaine distinct, non
  construit.
- EF-1007 (visites et relations) — `apps.visites.DemandeVisite` a été
  délibérément conçu **sans lien vers une personne détenue réelle** (voir son
  docstring : « aucune confirmation nominative de présence... aucune liaison à
  apps.detenus pour l'instant », §6.3), pour ne jamais confirmer une présence à
  un tiers non habilité. Créer ce lien est une décision produit/sécurité à part
  entière (quoi divulguer, à qui) — non prise ici, non construite.
- EF-1008, volet éditions réglementaires de levée d'écrou — l'événement
  lui-même est tracé (mouvement `LEVEE_ECROU`), pas l'édition du document
  officiel (modèles réglementaires non disponibles).
- EF-1009, volet recherche nominative et éditions de registres conformes aux
  modèles officiels — la recherche nominative supposerait une stratégie de
  hachage déterministe distincte du chiffrement (non construite ici, l'identité
  étant chiffrée avec un nonce aléatoire, donc non indexable telle quelle).
- EF-1010 (mode dégradé hors-ligne) — architecture de synchronisation séparée,
  non construite.
"""

from __future__ import annotations

from django.db import models
from django.utils import timezone

from core.champs import ChampChiffre
from core.models import ModeleAvecSuppressionLogique, ModeleBase


class Sexe(models.TextChoices):
    MASCULIN = "M", "Masculin"
    FEMININ = "F", "Féminin"


class SituationPenale(models.TextChoices):
    PREVENU = "PREVENU", "Prévenu"
    CONDAMNE = "CONDAMNE", "Condamné"
    CONTRAINTE_PAR_CORPS = "CONTRAINTE_PAR_CORPS", "Contrainte par corps"


class RegimeDetention(models.TextChoices):
    ORDINAIRE = "ORDINAIRE", "Ordinaire"
    SEMI_LIBERTE = "SEMI_LIBERTE", "Semi-liberté"
    QUARTIER_HAUTE_SECURITE = "QUARTIER_HAUTE_SECURITE", "Quartier de haute sécurité"


class StatutDossierDetenu(models.TextChoices):
    ECROUE = "ECROUE", "Écroué"
    LIBERE = "LIBERE", "Libéré"
    TRANSFERE = "TRANSFERE", "Transféré"
    EVADE = "EVADE", "Évadé"


def generer_numero_ecrou(etablissement) -> str:
    """Format `<CODE-ÉTABLISSEMENT>-AAAA-XXXXX` (§9.3 : préfixe établissement,
    unique au niveau national)."""
    annee = timezone.now().year
    prefixe = f"{etablissement.code.upper()}-{annee}-"
    compte = PersonneDetenue.tous_les_objets.filter(numero_ecrou__startswith=prefixe).count() + 1
    return f"{prefixe}{compte:05d}"


def chemin_photo_detenu(instance: PersonneDetenue, nom_fichier: str) -> str:
    return f"detenus/{instance.id}/photo/{nom_fichier}"


class PersonneDetenue(ModeleAvecSuppressionLogique):
    numero_ecrou = models.CharField(max_length=30, unique=True, editable=False, db_index=True)
    nom = ChampChiffre()
    prenom = ChampChiffre()
    date_naissance = models.DateField()
    date_naissance_approximative = models.BooleanField(
        default=False, help_text="Coché lorsque la date de naissance n'est pas certaine."
    )
    sexe = models.CharField(max_length=1, choices=Sexe.choices)
    situation_penale = models.CharField(max_length=25, choices=SituationPenale.choices)
    regime = models.CharField(
        max_length=30, choices=RegimeDetention.choices, default=RegimeDetention.ORDINAIRE
    )
    statut_dossier = models.CharField(
        max_length=15, choices=StatutDossierDetenu.choices, default=StatutDossierDetenu.ECROUE
    )
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.PROTECT,
        related_name="personnes_detenues",
    )
    photo = models.ImageField(upload_to=chemin_photo_detenu, blank=True)
    date_ecrou = models.DateField()
    date_liberation_prevue = models.DateField(
        null=True,
        blank=True,
        help_text=(
            "Saisie et mise à jour manuelles par un agent habilité — jamais calculée "
            "automatiquement (voir docstring du module)."
        ),
    )

    class Meta:
        db_table = "personnes_detenues"
        ordering = ["-date_ecrou"]
        verbose_name = "Personne détenue"
        verbose_name_plural = "Personnes détenues"

    def __str__(self) -> str:  # pragma: no cover
        return f"Écrou {self.numero_ecrou}"

    def save(self, *args, **kwargs):
        if not self.numero_ecrou:
            self.numero_ecrou = generer_numero_ecrou(self.etablissement)
        super().save(*args, **kwargs)

    def enregistrer_mouvement(
        self,
        type_mouvement: str,
        *,
        acteur=None,
        etablissement_destination=None,
        motif: str = "",
        piece_justificative=None,
        date_mouvement=None,
    ) -> Mouvement:
        """Historise le mouvement et applique l'effet correspondant sur le dossier
        (EF-1002) — un transfert change l'établissement courant, une levée
        d'écrou/évasion/réintégration change le statut du dossier ; une
        extraction/hospitalisation/permission de sortir sont des absences
        temporaires qui ne changent pas le statut « Écroué »."""
        mouvement = Mouvement.objects.create(
            personne=self,
            type_mouvement=type_mouvement,
            date_mouvement=date_mouvement or timezone.now(),
            etablissement_destination=etablissement_destination,
            motif=motif,
            piece_justificative=piece_justificative or "",
            cree_par=acteur,
        )
        if type_mouvement == TypeMouvement.TRANSFERT and etablissement_destination is not None:
            self.etablissement = etablissement_destination
            self.statut_dossier = StatutDossierDetenu.ECROUE
        elif type_mouvement == TypeMouvement.LEVEE_ECROU:
            self.statut_dossier = StatutDossierDetenu.LIBERE
        elif type_mouvement == TypeMouvement.EVASION:
            self.statut_dossier = StatutDossierDetenu.EVADE
        elif type_mouvement == TypeMouvement.REINTEGRATION:
            self.statut_dossier = StatutDossierDetenu.ECROUE
        self.modifie_par = acteur
        self.save()
        return mouvement


class TypeMouvement(models.TextChoices):
    ECROU = "ECROU", "Écrou"
    LEVEE_ECROU = "LEVEE_ECROU", "Levée d'écrou"
    TRANSFERT = "TRANSFERT", "Transfert"
    EXTRACTION = "EXTRACTION", "Extraction"
    HOSPITALISATION = "HOSPITALISATION", "Hospitalisation"
    PERMISSION_SORTIR = "PERMISSION_SORTIR", "Permission de sortir"
    EVASION = "EVASION", "Évasion"
    REINTEGRATION = "REINTEGRATION", "Réintégration"


def chemin_piece_mouvement(instance: Mouvement, nom_fichier: str) -> str:
    return f"detenus/{instance.personne_id}/mouvements/{instance.id}/{nom_fichier}"


class Mouvement(ModeleBase):
    """Historique tracé des mouvements (EF-1002) — jamais modifié après coup,
    seulement complété par de nouveaux mouvements."""

    personne = models.ForeignKey(
        PersonneDetenue, on_delete=models.CASCADE, related_name="mouvements"
    )
    type_mouvement = models.CharField(max_length=20, choices=TypeMouvement.choices)
    date_mouvement = models.DateTimeField(default=timezone.now)
    etablissement_destination = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
        help_text="Renseigné pour un transfert.",
    )
    motif = models.TextField(blank=True)
    piece_justificative = models.FileField(upload_to=chemin_piece_mouvement, blank=True)

    class Meta:
        db_table = "mouvements_detenus"
        ordering = ["-date_mouvement"]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.personne.numero_ecrou} — {self.get_type_mouvement_display()}"


def personnes_visibles_par(utilisateur) -> models.QuerySet[PersonneDetenue]:
    """Restreint aux établissements couverts par les périmètres de l'agent
    (§6.3 : habilitations fines par établissement) — un superviseur national
    voit tout."""
    if utilisateur.est_superviseur_national:
        return PersonneDetenue.objets.all()
    perimetres = utilisateur.perimetres_autorises()
    return PersonneDetenue.objets.filter(etablissement__code__in=perimetres)
