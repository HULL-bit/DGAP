"""Jeu de données de démonstration (§11) — référentiels, établissements, actualités,
publications, FAQ, comptes de démo par rôle.

Idempotent (get_or_create/update_or_create) : peut être relancé sans dupliquer les
données. Lancement : `make seed` → `python manage.py shell -c "import scripts.seed"`.

Données fictives mais réalistes (§11) : les coordonnées géographiques des
établissements sont celles des chefs-lieux de région (placeholder), à remplacer par
les coordonnées précises des établissements réels avant mise en production (§14.3 —
ne jamais présenter une valeur provisoire comme officielle).
"""

from __future__ import annotations

from datetime import date, datetime

from django.utils import timezone

from apps.boutique.models import ProduitBoutique
from apps.comptes.models import AffectationRole, Perimetre, Permission, Role, Utilisateur
from apps.contenus.models import Article, Rubrique, StatutContenu
from apps.demarches.models import FAQ
from apps.etablissements.models import Etablissement
from apps.intranet.models import NoteDeService
from apps.mediatheque.models import DocumentPublic, NatureDocument
from apps.referentiels.models import DirectionRegionale, Region, TypeEtablissement
from apps.rh.models import AffectationAgent, DossierAgent, SoldeConge

MOT_DE_PASSE_DEMO = "DemoDGAP2026!"  # Dev uniquement — jamais utilisé en production (§15).


def seed_referentiels() -> dict[str, DirectionRegionale]:
    regions_data = [
        ("dakar", "Dakar"),
        ("thies", "Thiès"),
        ("diourbel", "Diourbel"),
        ("fatick", "Fatick"),
        ("kaolack", "Kaolack"),
        ("kaffrine", "Kaffrine"),
        ("kolda", "Kolda"),
        ("ziguinchor", "Ziguinchor"),
        ("sedhiou", "Sédhiou"),
        ("saint-louis", "Saint-Louis"),
        ("louga", "Louga"),
        ("matam", "Matam"),
        ("tambacounda", "Tambacounda"),
        ("kedougou", "Kédougou"),
    ]
    regions = {}
    for code, nom in regions_data:
        region, _ = Region.objects.get_or_create(code=code, defaults={"nom": nom})
        regions[code] = region

    for code, libelle in [
        ("maison-arret", "Maison d'arrêt"),
        ("maison-arret-correction", "Maison d'arrêt et de correction"),
        ("camp-penal", "Camp pénal"),
    ]:
        TypeEtablissement.objects.get_or_create(code=code, defaults={"libelle": libelle})

    irap_data = [
        (
            "dakar",
            "IRAP Dakar",
            ["dakar"],
            "Serigne THIAO",
            "serigne.thiao@administrationpenitentiaire.sn",
            "(+221) 33 827 15 19",
        ),
        (
            "thies-diourbel",
            "IRAP Thiès-Diourbel",
            ["thies", "diourbel"],
            "Mandiaye NDIAYE",
            "mandiaye.ndiaye@administrationpenitentiaire.sn",
            "(+221) 33 991 10 64",
        ),
        (
            "ziguinchor-kolda-sedhiou",
            "IRAP Ziguinchor–Kolda–Sédhiou",
            ["ziguinchor", "kolda", "sedhiou"],
            "Cheikh Tidiane SECK",
            "cheikht.seck@administrationpenitentiaire.sn",
            "(+221) 33 951 11 10",
        ),
        (
            "kaolack-fatick-kaffrine",
            "IRAP Kaolack–Fatick–Kaffrine",
            ["kaolack", "fatick", "kaffrine"],
            "Omar DIOP",
            "omar.diop@administrationpenitentiaire.sn",
            "(+221) 33 941 27 79",
        ),
        (
            "tambacounda-matam",
            "IRAP Tambacounda-Matam",
            ["tambacounda", "matam"],
            "Ibrahima SAMB",
            "ibrahima.samb@administrationpenitentiaire.sn",
            "(+221) 33 981 10 89",
        ),
        (
            "saint-louis-louga",
            "IRAP Saint-Louis-Louga",
            ["saint-louis", "louga"],
            "Alioune Badara GUISSE",
            "aliouneb.guisse@administrationpenitentiaire.sn",
            "(+221) 33 961 10 26",
        ),
    ]

    irap: dict[str, DirectionRegionale] = {}
    for code, nom, regions_codes, directeur, email, tel in irap_data:
        direction, _ = DirectionRegionale.objects.get_or_create(
            code=code,
            defaults={
                "nom": nom,
                "directeur_nom": directeur,
                "directeur_email": email,
                "directeur_telephone": tel,
            },
        )
        direction.regions.set([regions[r] for r in regions_codes])
        irap[code] = direction

    return irap


def seed_etablissements(irap: dict[str, DirectionRegionale]) -> None:
    type_mac = TypeEtablissement.objects.get(code="maison-arret-correction")

    # (code IRAP, ville, région, latitude, longitude) — coordonnées du chef-lieu
    # de région (placeholder de démonstration, cf. note de module).
    donnees = [
        ("dakar", "Dakar", "dakar", 14.6928, -17.4467),
        ("thies-diourbel", "Thiès", "thies", 14.7910, -16.9359),
        ("ziguinchor-kolda-sedhiou", "Ziguinchor", "ziguinchor", 12.5665, -16.2733),
        ("kaolack-fatick-kaffrine", "Kaolack", "kaolack", 14.1612, -16.0728),
        ("tambacounda-matam", "Tambacounda", "tambacounda", 13.7707, -13.6673),
        ("saint-louis-louga", "Saint-Louis", "saint-louis", 16.0179, -16.4896),
    ]
    for irap_code, ville, region_code, lat, lng in donnees:
        nom = f"Maison d'Arrêt et de Correction de {ville}"
        Etablissement.tous_les_objets.get_or_create(
            code=f"mac-{region_code}",
            defaults={
                "nom": nom,
                "type": type_mac,
                "direction_regionale": irap[irap_code],
                "region": Region.objects.get(code=region_code),
                "adresse": f"{ville}, Sénégal",
                "latitude": lat,
                "longitude": lng,
                "telephone": "(+221) 33 869 47 80",
                "horaires_visite": "Lun – Ven, 8h – 16h",
                "conditions_visite": (
                    "Permis de communiquer et pièce d'identité obligatoires. "
                    "Denrées non entamées, vêtements et livres autorisés sous contrôle."
                ),
                "actif": True,
            },
        )


def seed_contenus() -> None:
    rubrique_actualites, _ = Rubrique.objects.get_or_create(
        code="actualites", defaults={"titre": "Actualité"}
    )

    articles = [
        (
            "visite-irap-saint-louis-louga",
            "Visite de l'IRAP Saint-Louis-Louga par le Directeur Général",
            "2026-06-18",
        ),
        ("formation-cadres-rdc", "Formation de cadres pénitentiaires de la RDC", "2026-05-30"),
        ("visite-gouverneur-dakar", "Visite du Gouverneur de Dakar, Al Hassan Sall", "2026-05-12"),
        ("visite-dap-koutal", "Visite du DAP à Koutal", "2026-04-28"),
        ("visite-dap-cpfi", "Visite du DAP au CPFI", "2026-04-02"),
    ]
    for slug, titre, date_str in articles:
        Article.tous_les_objets.get_or_create(
            slug=slug,
            defaults={
                "titre": titre,
                "chapo": titre,
                "contenu": f"<p>{titre}.</p>",
                "statut": StatutContenu.PUBLIE,
                "rubrique": rubrique_actualites,
                "date_publication": timezone.make_aware(datetime.strptime(date_str, "%Y-%m-%d")),
            },
        )


def seed_documents() -> None:
    documents = [
        (
            "LOI 2006-34 modifiant la loi 72-23",
            NatureDocument.LOI,
            "2006-34",
            date(2006, 6, 15),
            "textes-juridiques",
        ),
        (
            "LOI 72-23 du 9 avril 1972 relative au statut du personnel",
            NatureDocument.LOI,
            "72-23",
            date(1972, 4, 9),
            "textes-juridiques",
        ),
        (
            "Concours direct — Agents administratifs",
            NatureDocument.AVIS_CONCOURS,
            "",
            date(2024, 11, 14),
            "concours",
        ),
        (
            "Concours direct — Inspecteurs",
            NatureDocument.AVIS_CONCOURS,
            "",
            date(2024, 11, 14),
            "concours",
        ),
        (
            "Concours direct — Contrôleurs",
            NatureDocument.AVIS_CONCOURS,
            "",
            date(2024, 11, 14),
            "concours",
        ),
        (
            "Concours direct — Surveillants",
            NatureDocument.AVIS_CONCOURS,
            "",
            date(2024, 11, 14),
            "concours",
        ),
        (
            "Programme du concours ENAP",
            NatureDocument.AVIS_CONCOURS,
            "",
            date(2021, 9, 23),
            "concours",
        ),
    ]
    for titre, nature, numero, date_texte, categorie in documents:
        DocumentPublic.objects.get_or_create(
            titre=titre,
            defaults={
                "nature": nature,
                "numero": numero,
                "date_texte": date_texte,
                "categorie": categorie,
            },
        )


def seed_boutique() -> None:
    produits = [
        ("jus-bissap-1l", "Jus Bissap 1 Litre", "Jus locaux", 1300, 1200),
        ("jus-de-bouye-1l", "Jus de Bouye 1 Litre", "Jus locaux", 1300, None),
        ("penipro-detergent-1000mg", "PENIPRO Détergent 1000mg", "Produits d'entretien", 850, None),
        ("penipro-lave-vitre", "PENIPRO Lave-Vitre", "Produits d'entretien", 1000, None),
        ("salon-7-places", "Salon 7 places", "Mobilier", 450000, None),
        ("son-de-ble-200g", "Son de Blé 200g", "Céréales locales", 2500, 2250),
    ]
    for i, (slug, nom, categorie, prix, prix_promotionnel) in enumerate(produits):
        ProduitBoutique.objects.get_or_create(
            slug=slug,
            defaults={
                "nom": nom,
                "categorie": categorie,
                "prix": prix,
                "prix_promotionnel": prix_promotionnel,
                "ordre": i,
            },
        )


def seed_intranet() -> None:
    perimetre_national, _ = Perimetre.objects.get_or_create(
        code="national", defaults={"type": Perimetre.TypePerimetre.NATIONAL, "libelle": "National"}
    )
    notes = [
        (
            "Rappel des consignes d'hygiène en établissement",
            "Chaque établissement veille à l'application stricte des consignes "
            "d'hygiène en vigueur, notamment dans les espaces communs et les "
            "quartiers de détention.",
            True,
        ),
        (
            "Mise à jour des procédures de sécurité aux entrées",
            "Les procédures de contrôle à l'entrée des établissements sont mises "
            "à jour ; les chefs d'établissement en assurent la diffusion auprès "
            "de leurs équipes.",
            False,
        ),
    ]
    for titre, contenu, accuse_requis in notes:
        NoteDeService.objects.get_or_create(
            titre=titre,
            defaults={
                "contenu": contenu,
                "perimetre_cible": perimetre_national,
                "accuse_lecture_requis": accuse_requis,
            },
        )


FAQ_DONNEES: list[tuple[str, str, str]] = [
    # (catégorie, question, réponse)
    (
        "visites",
        "Comment demander un permis de visite ?",
        "Déposez une demande en ligne depuis « Vos démarches » ou présentez-vous au greffe de l'établissement avec une pièce d'identité.",
    ),
    (
        "visites",
        "Quels documents dois-je présenter pour une visite ?",
        "Une pièce d'identité en cours de validité et le permis de communiquer délivré par l'établissement.",
    ),
    (
        "visites",
        "Quels sont les horaires de visite ?",
        "En général du lundi au vendredi, de 8h à 16h ; les horaires précis dépendent de chaque établissement.",
    ),
    (
        "visites",
        "Puis-je apporter de la nourriture ?",
        "Les denrées non entamées sont autorisées, sous contrôle du personnel pénitentiaire.",
    ),
    (
        "visites",
        "Combien de temps dure une visite ?",
        "La durée est fixée par le règlement intérieur de chaque établissement, généralement 30 minutes.",
    ),
    (
        "visites",
        "Puis-je visiter un mineur détenu ?",
        "Oui, sous réserve d'autorisation spécifique et de la présence d'un représentant légal si nécessaire.",
    ),
    (
        "visites",
        "Que faire si mon permis de visite est refusé ?",
        "Un recours peut être introduit auprès du chef d'établissement ou de la direction régionale (IRAP).",
    ),
    (
        "visites",
        "Les avocats ont-ils un régime de visite particulier ?",
        "Oui, sur présentation d'un justificatif professionnel et d'une lettre de constitution, sans limitation de fréquence.",
    ),
    (
        "concours",
        "Comment s'inscrire à un concours de la DGAP ?",
        "Consultez les avis publiés dans « Publications officielles » et déposez votre dossier via l'espace démarches.",
    ),
    (
        "concours",
        "Quelles pièces sont nécessaires pour une candidature ?",
        "Acte de naissance, CV, diplômes, certificat de nationalité et casier judiciaire, selon l'avis de concours.",
    ),
    (
        "concours",
        "Comment connaître les résultats d'un concours ?",
        "Les résultats sont publiés dans « Publications officielles » et transmis aux candidats par e-mail.",
    ),
    (
        "concours",
        "Puis-je repasser un concours après un échec ?",
        "Oui, sous réserve de remplir les conditions d'éligibilité de la session suivante.",
    ),
    (
        "concours",
        "Le paiement des frais de concours est-il obligatoire ?",
        "Oui, un paiement (mobile money ou carte) est requis pour finaliser le dépôt de candidature.",
    ),
    (
        "concours",
        "Où sont situés les centres d'examen ?",
        "Les centres d'examen sont précisés dans la convocation transmise à chaque candidat.",
    ),
    (
        "contact",
        "Comment contacter la DGAP ?",
        "Via le formulaire de contact du site, par téléphone au +221 33 869 47 80, ou par e-mail.",
    ),
    (
        "contact",
        "Quel est le délai de réponse à une demande de contact ?",
        "Un accusé de réception est immédiat ; le traitement complet intervient sous quelques jours ouvrés.",
    ),
    (
        "contact",
        "Comment suivre ma demande de contact ?",
        "Le numéro de ticket communiqué à la soumission permet de suivre l'état de votre demande.",
    ),
    (
        "contact",
        "Puis-je contacter directement un établissement ?",
        "Oui, les coordonnées de chaque établissement figurent dans l'annuaire.",
    ),
    (
        "horaires",
        "Quels sont les horaires d'ouverture des bureaux de la DGAP ?",
        "Du lundi au vendredi, de 8h à 18h.",
    ),
    (
        "horaires",
        "Les établissements sont-ils ouverts le week-end ?",
        "Les visites familiales ont lieu du lundi au vendredi ; se renseigner auprès de l'établissement pour les cas particuliers.",
    ),
    (
        "horaires",
        "Y a-t-il des horaires spécifiques en période de fêtes ?",
        "Des aménagements peuvent être annoncés via les communiqués officiels du site.",
    ),
    (
        "pieces",
        "Quelle pièce d'identité est acceptée pour une visite ?",
        "Carte nationale d'identité, passeport ou tout document officiel avec photo en cours de validité.",
    ),
    (
        "pieces",
        "Que faire si je n'ai pas de pièce d'identité valide ?",
        "Un document alternatif délivré par une autorité administrative peut être accepté après vérification.",
    ),
    (
        "pieces",
        "Les pièces jointes aux démarches en ligne ont-elles un format imposé ?",
        "Formats image ou PDF, taille limitée précisée dans chaque formulaire.",
    ),
    (
        "reinsertion",
        "Comment fonctionnent les ateliers de réinsertion ?",
        "Les personnes détenues volontaires participent à des ateliers de formation et de production encadrés.",
    ),
    (
        "reinsertion",
        "Les produits des ateliers sont-ils vendus au public ?",
        "Oui, via la Boutique institutionnelle, qui valorise le travail des personnes détenues.",
    ),
    (
        "reinsertion",
        "Peut-on financer ou soutenir un atelier de réinsertion ?",
        "Les modalités de partenariat sont à discuter directement avec la direction de l'établissement concerné.",
    ),
    (
        "general",
        "Qu'est-ce que la DGAP ?",
        "La Direction Générale de l'Administration Pénitentiaire pilote les établissements pénitentiaires du Sénégal, sous tutelle du Ministère de la Justice.",
    ),
    (
        "general",
        "Où se trouve le siège de la DGAP ?",
        "Liberté 6 Extension, Immeuble Ferdinand Coly, Dakar — Sénégal.",
    ),
    (
        "general",
        "Comment signaler une urgence concernant une personne détenue ?",
        "Utilisez le dispositif « SOS Détenus » accessible depuis le pied de page du site.",
    ),
    (
        "general",
        "La DGAP recrute-t-elle en dehors des concours ?",
        "Le recrutement passe principalement par les concours publiés officiellement.",
    ),
    (
        "general",
        "Comment consulter l'organigramme de la DGAP ?",
        "L'organigramme et la liste des directeurs sont publiés dans la rubrique « À propos ».",
    ),
    (
        "general",
        "Où trouver les textes de loi applicables à l'administration pénitentiaire ?",
        "Dans « Publications officielles », rubrique Lois et textes pénaux.",
    ),
    (
        "annuaire",
        "Comment trouver un établissement pénitentiaire ?",
        "Utilisez l'annuaire des établissements, avec recherche par région ou par type d'établissement.",
    ),
    (
        "annuaire",
        "L'annuaire indique-t-il les horaires de visite par établissement ?",
        "Oui, chaque fiche établissement précise ses horaires et conditions de visite.",
    ),
    (
        "annuaire",
        "Puis-je obtenir un plan d'accès à un établissement ?",
        "Les informations d'adresse et de géolocalisation sont disponibles sur la fiche de l'établissement.",
    ),
    (
        "comptes",
        "Ai-je besoin d'un compte pour déposer une demande de visite ?",
        "Non, le dépôt initial ne nécessite pas de compte ; un suivi par numéro est fourni.",
    ),
    (
        "comptes",
        "Comment créer un espace candidat pour un concours ?",
        "L'espace candidat se crée automatiquement lors du dépôt de votre première candidature.",
    ),
    (
        "comptes",
        "Comment réinitialiser mon mot de passe ?",
        "Utilisez la fonction « mot de passe oublié » sur la page de connexion de l'espace concerné.",
    ),
    (
        "comptes",
        "Les agents doivent-ils activer une double authentification ?",
        "Oui, l'authentification à deux facteurs (MFA) est obligatoire pour tous les comptes internes.",
    ),
    (
        "accessibilite",
        "Le site est-il accessible aux personnes en situation de handicap ?",
        "Le portail vise la conformité RGAA 4 / WCAG 2.1 AA ; une déclaration d'accessibilité est publiée.",
    ),
]


def seed_faq() -> None:
    for i, (categorie, question, reponse) in enumerate(FAQ_DONNEES):
        FAQ.objects.get_or_create(
            question=question,
            defaults={"reponse": reponse, "categorie": categorie, "ordre": i, "publie": True},
        )


ROLES_DEMO = [
    ("citoyen", "Citoyen", [], False),
    ("candidat", "Candidat concours", ["concours:candidater"], False),
    ("agent", "Agent pénitentiaire", ["intranet:consulter"], True),
    (
        "chef-etablissement",
        "Chef d'établissement",
        [
            "visites:instruire",
            "visites:controler",
            "intranet:consulter",
            "intranet:publier",
            "courrier:gerer",
            "courrier:viser",
            "rh:valider",
        ],
        True,
    ),
    (
        "redacteur",
        "Rédacteur éditorial",
        ["contenus:rediger", "documents:gerer", "boutique:gerer"],
        True,
    ),
    ("valideur", "Valideur éditorial", ["contenus:rediger", "contenus:valider"], True),
    (
        "administrateur",
        "Administrateur",
        [
            "contenus:rediger",
            "contenus:valider",
            "contenus:publier",
            "stats:lire",
            "concours:gerer",
            "concours:instruire",
            "documents:gerer",
            "visites:instruire",
            "visites:controler",
            "boutique:gerer",
            "intranet:consulter",
            "intranet:publier",
            "notifications:lire",
            "courrier:gerer",
            "courrier:viser",
            "courrier:valider",
            "courrier:confidentiel",
            "ged:consulter",
            "ged:gerer",
            "rh:gerer",
            "rh:valider",
            "comptes:gerer",
            "audit:consulter",
            "detenus:consulter",
            "detenus:gerer",
            "interop:consulter",
            "interop:gerer",
        ],
        True,
    ),
]


def seed_comptes() -> None:
    perimetre_national, _ = Perimetre.objects.get_or_create(
        code="national", defaults={"type": Perimetre.TypePerimetre.NATIONAL, "libelle": "National"}
    )

    roles: dict[str, Role] = {}
    for code, libelle, permission_codes, _est_interne in ROLES_DEMO:
        role, _ = Role.objects.get_or_create(code=code, defaults={"libelle": libelle})
        permissions = []
        for perm_code in permission_codes:
            permission, _ = Permission.objects.get_or_create(
                code=perm_code,
                defaults={
                    "libelle": perm_code.replace(":", " — "),
                    "categorie": perm_code.split(":")[0],
                },
            )
            permissions.append(permission)
        if permissions:
            role.permissions.set(permissions)
        roles[code] = role

    for code, _libelle, _perms, est_interne in ROLES_DEMO:
        email = f"demo.{code}@administrationpenitentiaire.sn"
        utilisateur, cree = Utilisateur.objects.get_or_create(
            email=email,
            defaults={
                "nom": code.replace("-", " ").title(),
                "prenom": "Démo",
                "est_agent_interne": est_interne,
                "compte_demonstration": True,
            },
        )
        if cree:
            utilisateur.set_password(MOT_DE_PASSE_DEMO)
            utilisateur.save(update_fields=["password"])
        if code == "administrateur" and not utilisateur.est_superviseur_national:
            # Bypass de périmètre ET de scope reconnu par chaque permission applicative
            # (`... or utilisateur.est_superviseur_national`) : l'administrateur doit
            # avoir tous les droits, pas seulement ceux listés ci-dessus qui dériveraient
            # sinon au fil de l'ajout de nouveaux scopes par les blocs futurs.
            utilisateur.est_superviseur_national = True
            utilisateur.save(update_fields=["est_superviseur_national"])
        AffectationRole.objects.get_or_create(
            utilisateur=utilisateur, role=roles[code], perimetre=perimetre_national
        )


DOSSIERS_RH_DEMO = [
    ("agent", "Surveillants", "Surveillant principal", "Agent de terrain"),
    (
        "administrateur",
        "Personnel administratif",
        "Attaché d'administration",
        "Administrateur système",
    ),
]


def seed_rh() -> None:
    perimetre_national, _ = Perimetre.objects.get_or_create(
        code="national", defaults={"type": Perimetre.TypePerimetre.NATIONAL, "libelle": "National"}
    )
    annee_courante = timezone.now().year
    for code, corps, grade, fonction in DOSSIERS_RH_DEMO:
        utilisateur = Utilisateur.objects.filter(
            email=f"demo.{code}@administrationpenitentiaire.sn"
        ).first()
        if utilisateur is None:
            continue
        dossier, _ = DossierAgent.objets.get_or_create(
            utilisateur=utilisateur,
            defaults={
                "corps": corps,
                "grade": grade,
                "date_entree_service": date(2018, 9, 1),
            },
        )
        if not dossier.affectations.exists():
            AffectationAgent.objects.create(
                dossier=dossier,
                perimetre=perimetre_national,
                fonction=fonction,
                date_debut=date(2018, 9, 1),
            )
        SoldeConge.objects.get_or_create(
            dossier=dossier, annee=annee_courante, defaults={"jours_acquis": 24}
        )


def run() -> None:
    irap = seed_referentiels()
    seed_etablissements(irap)
    seed_contenus()
    seed_documents()
    seed_boutique()
    seed_intranet()
    seed_faq()
    seed_comptes()
    seed_rh()
    print("Seed terminé.")
    print(f"Comptes de démo créés (mot de passe : {MOT_DE_PASSE_DEMO}) :")
    for code, _libelle, _perms, est_interne in ROLES_DEMO:
        mention = " — MFA à activer avant connexion" if est_interne else ""
        print(f"  - demo.{code}@administrationpenitentiaire.sn{mention}")


run()
