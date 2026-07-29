# Architecture

## Vue d'ensemble

Monorepo, backend monolithe modulaire (Django/DRF), quatre applications frontales
déployées séparément mais partageant une charte unique. Voir le schéma et le
raisonnement complet dans le prompt de cadrage (`§4` du Cahier des charges
DGAP-SI-CDC-2026-001) ; ce document se concentre sur ce qui existe réellement dans le
dépôt et sur les décisions prises phase par phase.

```
Nginx (TLS, en-têtes sécurité, rate-limit, routage par sous-domaine)
  www.…            demarches.…            intranet.… (VPN)         admin.…
   │                   │                        │                    │
   ▼                   ▼                        ▼                    ▼
 Portail SSG      Démarches SPA           Intranet SPA         Back-office SPA
   └───────────────────┴──────────┬─────────────┴────────────────────┘
                                   ▼
                     Django + DRF — API unique /api/v1 (OpenAPI 3.1)
                                   │
             ┌───────────────┬─────┴──────────┬───────────────────┐
        PostgreSQL 16     Redis (cache/    MinIO (S3 :          Celery worker/beat
        (comptes,         files/sessions)  médias, docts,       (notifications, PDF,
         audit, …)                          sauvegardes)          OCR — Bloc D+)
```

## Phase 0 — Socle technique

- **`core`** : identifiants UUID v7 (`core.id.uuid7`), modèles de base horodatés/
  traçables/à suppression logique (`core.models`), pagination par curseur
  (`core.pagination`), erreurs API au format RFC 9457 (`core.exceptions`), RBAC par
  scopes + périmètres (`core.permissions`, dont `MFAConfirmee`), corrélation de
  requêtes/logs JSON structurés (`core.correlation`, `core.logging`).
- **`apps.comptes`** : comptes nominatifs par e-mail, rôles → permissions (M2M),
  attributions directes, périmètres organisationnels, JWT courte durée
  (`djangorestframework-simplejwt`), MFA TOTP avec **bootstrap sécurisé** (un compte
  interne peut se connecter une première fois sans code pour atteindre l'inscription
  MFA, mais reste bloqué de tout endpoint métier tant que `mfa_active` est faux).
- **`apps.audit`** : journal d'actions append-only (`JournalAction.tracer(...)`).
- **`@dgap/ui`** : tokens de charte, emblème SVG, design system complet (voir
  composants ci-dessous), presets Framer Motion respectant `prefers-reduced-motion`,
  mode sombre (`ThemeProvider`), Storybook.
- **`@dgap/config`, `@dgap/api-client`, `@dgap/i18n`** : presets Tailwind/ESLint/
  TypeScript partagés ; client fetch RFC 9457 avec gestion des jetons JWT et
  rafraîchissement automatique sur 401 (`session.ts`) ; dictionnaire FR/EN.
- **4 applications frontales** (`portail`, `demarches`, `intranet`, `backoffice`).
- **Nginx** : 4 blocs `server` distincts, TLS local auto-signé (`make certs`), en-têtes
  de sécurité communs, CSP par zone, rate-limiting différencié.
- **`docker-compose.yml`** : `db`, `redis`, `minio`, `mailhog`, `backend`, `worker`,
  `beat`, `frontend-build`, `nginx` ; profil `full` pour `elasticsearch`/`keycloak`.

## Phase 1 — Portail public (Bloc B)

- **`apps.referentiels`** : régions, directions régionales (IRAP) avec leurs
  directeurs réels, types d'établissement.
- **`apps.etablissements`** : annuaire public filtrable (région/type/recherche) avec
  géolocalisation.
- **`apps.contenus`** : articles/pages/rubriques — lecture publique limitée au
  statut `PUBLIE`.
- **`apps.demarches`** : contact tracé (ticket `CTC-AAAA-XXXXXX`), FAQ.
- **`apps.mediatheque`** : documents publics (textes juridiques, avis de concours).
- **Frontend portail** : Accueil (héros média, démarches, actualités, chiffres clés
  marqués « provisoires » §14.3), À propos (directeurs réels), Vie des détenus
  (contenu repris du site officiel), Réinsertion (galerie par atelier), Annuaire
  (carte MapLibre), Actualités, Contact, FAQ. Code-splitting par route (MapLibre
  isolé dans son propre chunk — l'accueil reste ~137 Ko gzippés).
- **SEO** : schema.org (`GovernmentOrganization`), meta descriptions, sitemap.xml,
  robots.txt.
- **`scripts/seed.py`** : jeu de données idempotent (référentiels, établissements,
  articles, FAQ, documents, comptes de démo par rôle).

## Phase 2 — Back-office éditorial (Bloc C)

- **Workflow de contenu** (`ContenuEditorial.transitionner`, `apps/contenus/models.py`) :
  `BROUILLON → RELECTURE → VALIDE → PUBLIE → ARCHIVE`, matrice de transitions
  contrôlée (`TRANSITIONS_AUTORISEES`), scope requis par action
  (`SCOPE_PAR_ACTION` : rédacteur soumet, valideur valide/rejette/publie/archive).
- **Versions** (`VersionContenu`) : instantané append-only à chaque création/
  modification/transition, restauration possible (`restaurer()`), lié par
  `GenericForeignKey` (réutilisable par tout futur type de contenu).
- **Permissions** (`apps/contenus/permissions.py`) : `PeutEditerContenu` (lecture,
  tout scope éditorial), `PeutRedigerContenu` (écriture, `contenus:rediger` seul),
  `PeutTransitionner` (scope précis par action), toutes combinées à `MFAConfirmee`.
- **API back-office** : `ViewSet` DRF (`/api/v1/backoffice/articles`,
  `/api/v1/backoffice/pages`) avec actions `transition`, `versions`,
  `versions/{numero}/restaurer`. Chaque action tracée dans `apps.audit`.
- **Frontend back-office** : connexion JWT+MFA (`auth/AuthContext.tsx`), page
  d'activation MFA obligatoire (`ConfigurerMFA.tsx`, redirection forcée tant que le
  compte interne n'a pas confirmé son TOTP), liste des contenus filtrable par
  statut, éditeur avec boutons de transition contextuels et panneau d'historique.
- Vérifié de bout en bout via l'API réelle (bootstrap → inscription MFA →
  confirmation → reconnexion avec code → CRUD → transitions → versions).

## Phase 3 — Téléservice Visites (Bloc D)

- **`apps.visites`** : machine à états (`SOUMISE → EN_INSTRUCTION → PIECES_MANQUANTES
  → VALIDEE → PERMIS_DELIVRE`, ou `REJETEE`), même patron que `ContenuEditorial`
  (`TRANSITIONS_AUTORISEES`, `SCOPE_PAR_ACTION`, `TransitionInvalide`). La personne
  détenue n'est jamais liée à `apps.detenus` (non construite, Bloc G) — uniquement
  ce que le visiteur déclare (§6.3, cloisonnement).
- **Dépôt public idempotent** (`Idempotency-Key`), numéro de suivi
  (`DGAP-VIS-AAAA-XXXXXX`) + code court, suivi public restreint (numéro + code),
  téléversement de pièces (`PieceJointeVisite`, FileField + validation type/taille),
  renvoi du numéro/code par e-mail en cas d'oubli (réponse générique, anti-énumération).
  Endpoints d'instruction back-office cloisonnés par scope `visites:instruire` +
  `MFAConfirmee`.
- **Permis PDF signé** (`core/qr_signe.py`, JWS HS256) : QR vérifiable hors-ligne,
  génération WeasyPrint, téléchargement authentifié (agent) ou par numéro+code
  (citoyen), vérification à l'entrée (`visites:controler`).
- **Frontend démarches** : formulaire de dépôt en 6 étapes, téléversement de pièce
  d'identité, page de suivi avec téléchargement du permis et renvoi par e-mail.
- **Frontend back-office** : écran d'instruction (liste filtrable, détail, boutons de
  transition contextuels, téléchargement du permis authentifié).
- **Comptes de démonstration** dispensés du MFA (`Utilisateur.compte_demonstration`)
  pour rester utilisables immédiatement par mot de passe seul — les comptes réels
  gardent l'inscription QR+TOTP complète, inchangée.

### Extension Bloc B — Galeries (`apps.mediatheque`)

- **`Galerie`/`MediaGalerie`** : collections de médias nommées par `code`, images
  téléversées (MinIO) ou vidéos en lien incorporé (YouTube/Vimeo — pas de
  téléversement de fichier vidéo, aucun pipeline de transcodage/CDN vidéo). API
  publique de lecture par code, CRUD back-office (scope `contenus:rediger`).
  Galeries connues pré-créées par migration (`accueil-carrousel`, `vie-detenus`, une
  par atelier de réinsertion) pour que le rédacteur n'ait jamais à deviner un `code`.
- **`Article.galerie`** (FK optionnelle) + téléversement/suppression de l'image à la
  une directement dans l'éditeur (`POST .../articles/{id}/image`).
- **Frontend portail** : carrousel d'accueil, galerie de chaque atelier de
  réinsertion, galerie « vie des détenus », galerie de bas d'article — tous
  branchés sur l'API, avec repli sur les dégradés de charte tant qu'aucun média n'a
  été ajouté.
- **`storage.localhost`** (`nginx/conf.d/storage.conf`) : les URLs S3 pré-signées
  générées par le backend (`MINIO_ENDPOINT_URL=https://storage.localhost`) doivent
  rester résolvables par un navigateur, pas seulement par les conteneurs Docker — le
  nom d'hôte utilisé à la signature doit être strictement identique à celui vu par
  MinIO au moment de la requête (`proxy_set_header Host $host`), faute de quoi la
  signature SigV4 est rejetée.

## Phase 4 — Téléservice Concours (Bloc E)

- **`apps.concours`** : même patron que `apps.visites` (Bloc D) — `Concours` (avis,
  dates, conditions, frais), `Candidature` (machine à états `SOUMISE →
  EN_INSTRUCTION → [PIECES_MANQUANTES] → ADMISSIBLE → CONVOQUE → ADMIS`, ou
  `REJETE` à tout stade d'instruction), numéro de suivi `CONC-AAAA-XXXXXX` + code
  court, dépôt public idempotent, suivi restreint, renvoi par e-mail,
  téléversement de pièces (CV/diplôme/attestation).
- **`apps.paiements`** : `Paiement` — mock uniquement (`MoyenPaiement.MOCK`) : aucun
  opérateur réel (Orange Money/Wave) intégré, ces intégrations nécessitant un
  compte marchand et des accords commerciaux hors périmètre de ce chantier. Modèle
  générique (`GenericForeignKey`) pour rester réutilisable par tout futur service
  payant. Un `Paiement` n'est créé que si `Concours.frais_inscription > 0`.
- **Convocation PDF signée** (même mécanique que le permis de visite, Bloc D) :
  QR JWS vérifiable hors-ligne, téléchargement authentifié (agent) ou par
  numéro+code (candidat).
- **Frontend démarches** : liste des concours ouverts, formulaire d'inscription en
  3 étapes, confirmation de paiement mock et téléversement de pièce après dépôt,
  page de suivi (statut, paiement, téléchargement de convocation, renvoi par
  e-mail). Pas d'espace candidat authentifié dans cette passe — le suivi
  numéro+code suffit, cohérent avec le choix déjà fait pour les visites.
- **Frontend back-office** : écran de gestion des avis de concours (création,
  statut), écran d'instruction des candidatures (liste filtrable, détail,
  transitions, téléchargement de convocation).

## Phase 5 — Documents officiels enrichis, boutique et refonte de l'accueil

- **Correctif architectural** : `Article.image_url` et `DocumentPublic.fichier_url`
  étaient des `URLField` — une URL S3 pré-signée dépasse leur longueur et expire de
  toute façon. Convertis en `ImageField`/`FileField` réels (`Article.image`,
  `DocumentPublic.fichier`), l'URL exposée par l'API redevenant un
  `SerializerMethodField` calculé à chaque lecture (`.image.url`/`.fichier.url`),
  jamais stocké — même patron que `MediaGalerie.image` (Bloc B), désormais appliqué
  partout où un fichier est téléversé.
- **`apps.mediatheque`** : `DocumentPublic` passe de 100 % lecture seule à un CRUD
  back-office complet (`documents:gerer`) avec téléversement de PDF ; nouvel
  endpoint `GET /api/v1/galeries?prefixe=` (vignettes couverture + total, sans
  pagination) alimentant les grilles publiques (ateliers de réinsertion sur
  l'accueil et sur `/reinsertion`) sans une requête par galerie.
- **`apps.concours`** : `Concours.document_avis` (FK vers `mediatheque.DocumentPublic`,
  nullable) + action `POST /api/v1/backoffice/concours/{id}/avis` — le
  gestionnaire de concours téléverse l'avis officiel (PDF) directement depuis
  l'écran concours ; le document créé/mis à jour rejoint aussitôt le flux public
  des documents officiels (accueil, `/publications`).
- **`apps.boutique`** (nouveau) : `ProduitBoutique` — vitrine des produits
  fabriqués par les personnes détenues (jus locaux, produits d'entretien,
  mobilier, céréales), **catalogue de présentation uniquement** (décision
  produit : aucun panier, aucun paiement en ligne). CRUD back-office
  (`boutique:gerer`) + API publique filtrable par `categorie`.
- **RBAC** : `est_superviseur_national` est désormais posé sur le compte de
  démonstration `administrateur` — chaque permission applicative (`concours`,
  `contenus`, `mediatheque`, `visites`, `boutique`) accepte déjà ce contournement
  (`... or utilisateur.est_superviseur_national`) ; c'est le mécanisme
  d'« administrateur avec tous les droits », préférable à l'entretien manuel d'une
  liste de scopes qui dériverait au fil des blocs futurs.
- **Frontend portail** : accueil refondu (sections plus hautes, cartes démarches
  pleine largeur, icônes agrandies, actualités branchées sur `/api/v1/articles`
  avec image), nouvelles sections accueil + pages dédiées pour « La Réinsertion »
  (aperçu par atelier), « Documents officiels » (`/publications`) et « Boutique »
  (`/boutique`). Carte de l'annuaire : tuiles `demotiles.maplibre.org` (démo, non
  destinées à la production) remplacées par de vraies tuiles OpenStreetMap.
- **Frontend back-office** : écrans « Documents officiels » et « Boutique »
  (liste filtrable + création inline + édition + téléversement de fichier),
  mêmes conventions que les écrans Concours/Galeries existants.

## Phase 6 — Portail agents (Bloc F, M7)

Le cahier des charges (§3.2) regroupe Visites, Intranet et Statistiques dans un même
Lot 3 — cette phase complète le Lot 3 après Visites (Bloc D), en se limitant aux deux
exigences « Obligatoire » directement livrables sans dépendance à un bloc absent
(RH, GEC) :

- **`apps.intranet`** (nouveau) : `NoteDeService` (EF-702) — diffusion ciblée par
  périmètre (national/direction/établissement, réutilise `comptes.Perimetre` plutôt
  qu'un système de ciblage parallèle) avec accusé de lecture optionnel
  (`AccuseLectureNote`). Visibilité calculée côté serveur
  (`notes_visibles_par(utilisateur)`) : une note nationale est visible par tout
  agent, une note ciblée exige que le périmètre figure parmi les périmètres
  autorisés de l'agent (ou `est_superviseur_national`).
  - Lecture : `GET /api/v1/intranet/notes[/{id}]`, `POST .../lecture` — tout agent
    interne (`EstAgentInterne`, nouvelle permission : agent quel que soit son rôle,
    à la différence des scopes `xxx:yyy` qui portent sur une action précise).
  - Gestion : `GET/POST/PATCH/DELETE /api/v1/backoffice/intranet/notes` — scope
    `intranet:publier` (accordé au rôle `chef-etablissement`), hébergée dans l'app
    intranet elle-même plutôt que dans le back-office CMS (contenu de nature
    intranet, pas portail public).
  - Le ciblage par « corps » (mentionné au cahier) suppose une classification RH
    (`apps.rh`, non livrée) — volontairement hors périmètre de cette passe.
- **`apps.comptes`** : nouvel endpoint `GET /api/v1/perimetres` (liste des
  périmètres organisationnels), nécessaire pour peupler le sélecteur de diffusion
  d'une note — le modèle `Perimetre` existait déjà (RBAC) mais n'était pas exposé.
- **Tableau de bord personnel (EF-701)** : entièrement côté frontend, sans
  endpoint dédié — compose `/auth/moi` (profil), `/intranet/notes?limit=3` (notes
  récentes) et `/articles?limit=3` (actualités, réemploi de l'existant) ; les
  raccourcis métier sont une table statique {scope → lien back-office} filtrée par
  les scopes réels de l'agent, évitant d'inventer une surface API pour une pure
  commodité d'affichage.
- **Frontend intranet** : l'app était scaffoldée sans authentification. Le socle
  auth du back-office (`AuthContext`, `RouteProtegee`, `Connexion`,
  `ConfigurerMFA` — JWT + bootstrap MFA) est répliqué à l'identique (même API
  `/auth/*`, même comptes agents), le tableau de bord et les notes de service
  remplacent les pages placeholder « Phase 0 ».
- **`apps.statistiques`** (nouveau, M11) : tableaux de bord thématiques (EF-1102)
  pour les deux domaines déjà en production — Visites et Concours. Aucun modèle
  propre : agrégations `Count`/`TruncMonth` calculées à la volée sur
  `apps.visites`/`apps.concours` (`.objets`, gestionnaire filtré suppression
  logique), pas d'entrepôt de données. `GET /api/v1/backoffice/statistiques/
  {visites,concours}` — scope `stats:lire` (jusqu'ici présent dans le RBAC de
  démo mais jamais appliqué par aucune vue). Filtres `etablissement`/`concours`.
  Écran back-office « Statistiques » (route déjà présente dans la nav, jusqu'ici
  sans page) : répartition par statut colorée par la palette de statut réservée
  (mêmes tons que les badges `VisitesListe`/`CandidaturesListe`, jamais une
  couleur catégorielle inventée), répartition par établissement/concours en
  barres à teinte unique (comparaison de magnitude, pas d'identité), vue tableau
  alternative repliable.
- **Non couvert** (dépendent de blocs non livrés) : demandes administratives
  (EF-703, RH), dossier agent (EF-704, RH), formation (EF-705, RH), annuaire
  interne (EF-706), calendrier institutionnel (EF-707), messagerie de service
  (EF-708, GEC). Côté statistiques : tableau de bord national EF-1101
  (nécessite la population carcérale, `apps.detenus`, jamais exposée
  publiquement — hors périmètre tant que ce bloc n'est pas explicitement engagé),
  cartographie (EF-1103), rapports périodiques automatiques (EF-1105), entrepôt
  de données décisionnel (EF-1106, projet d'infrastructure séparé), analyses de
  tendances/prévisions (EF-1107), contrôles qualité (EF-1108), exports PDF/Excel
  tracés (EF-1104) — voir `apps/statistiques/README.md`.

## Phase 7 — Notifications (Bloc G, M14 EF-1405 hooké dans EF-302)

`apps.visites` et `apps.concours` sont en production depuis les Blocs D/E mais
n'envoyaient un e-mail que sur demande explicite (renvoi de suivi) — jamais à
l'accusé de réception ni aux changements d'état, contrairement à EF-302
(« notifications automatiques à chaque changement d'état, SMS et e-mail »).

- **`apps.notifications`** (nouveau) : `Notification` (journal générique, relation
  vers l'objet source — même patron que `apps.paiements.Paiement`),
  `services.notifier()` (point d'entrée unique ; un échec d'envoi ne fait jamais
  échouer la transition métier qui le déclenche). E-mail réel (SMTP, MailHog en
  dev — testé de bout en bout : dépôt d'une vraie demande de visite → e-mail reçu
  dans MailHog → transition → second e-mail reçu). **SMS simulé** : aucun
  connecteur opérateur/agrégateur sénégalais réel engagé (EF-1405 suppose un
  contrat opérateur) — même décision produit que le paiement mock
  d'`apps.paiements`, journalisé comme envoyé, jamais transmis.
- **Hooks** : `DemandeVisite.transitionner()` et `Candidature.transitionner()`
  appellent `notifier()` après chaque sauvegarde (`_notifier_changement_statut()`,
  import local pour éviter tout risque d'ordre de chargement inter-apps, même
  convention que `Candidature.paiement()`) ; `DemandeVisiteCreationView`/
  `CandidatureCreationView` envoient l'accusé de réception (numéro + code de
  suivi) au dépôt.
- **Visibilité** : `GET /api/v1/backoffice/notifications?canal=&statut=` — scope
  `notifications:lire`. Écran back-office « Notifications » (filtres canal/statut,
  badge succès/échec).
- **Non couvert** : file de réémission automatique en cas d'échec (EF-1405 le
  mentionne, visibilité seule ici), agrégateur SMS réel.

## Phase 8 — Gestion électronique du courrier (Bloc G, M5)

`apps.courrier` (nouveau), jamais exposé côté public. Cœur « Obligatoire » du
module (EF-501 à EF-504, EF-506, EF-507) — testé de bout en bout via le stack
Docker réel (enregistrement → affectation → réponse → visa → validation, et
restriction de confidentialité entre plusieurs comptes de démo).

- **`CourrierEntrant`** : numérotation chronologique automatique
  (`COUR-E-AAAA-XXXXXX`), fichier réel (`FileField`, même patron que
  `Article.image`), machine à états (`ENREGISTRE→AFFECTE→EN_TRAITEMENT→TRAITE→
  CLOS`, même patron que `apps.visites`/`apps.concours`). `perimetre_affecte`
  réutilise `comptes.Perimetre` plutôt qu'un concept de « service » séparé.
  `est_en_retard` calculé depuis `delai_reponse`.
- **`AffectationCourrier`** : historique append-in-spirit des (ré)affectations,
  `cree_par` (hérité de `ModeleBase`) trace l'auteur — pas de champ redondant.
- **`ReponseCourrier`** : circuit `BROUILLON→VISE→VALIDE→EXPEDIE` séparé du
  courrier lui-même, scopes distincts (`courrier:viser` pour viser/rejeter,
  `courrier:valider` pour la validation — séparation des tâches, le signataire
  habilité n'est pas nécessairement celui qui a visé).
- **`CourrierSortant`** : numérotation séparée (`COUR-S-AAAA-XXXXXX`), géré pour
  l'instant via Django admin uniquement (pas d'écran back-office dédié dans
  cette passe — volume de travail déjà important sur cette phase).
- **Confidentialité (EF-507)** : `courriers_entrants_visibles_par(utilisateur)`
  exclut les courriers `CONFIDENTIEL`/`SECRET` **dès le niveau de la liste** (pas
  seulement du détail) pour qui n'a pas `courrier:confidentiel` — l'existence
  même d'un courrier secret ne doit pas fuiter. La consultation d'un courrier
  non-normal est journalisée via `apps.audit.JournalAction` (déjà établi,
  réutilisé tel quel).
- **Frontend back-office** : écrans « Courrier » (registre + création + recherche
  par objet) et détail (historique d'affectation, actions de transition avec
  sélection de périmètre, réponses avec visa/validation inline, téléversement de
  pièce jointe).
- **Non couvert** (voir le docstring de `apps/courrier/models.py`) : OCR d'aide
  au classement et versement en GED (EF-501/EF-508, dépendent d'`apps.ged` non
  livrée), relances/escalades automatiques (EF-505, suppose Celery beat
  planifié), signature électronique qualifiée (EF-503, explicitement Lot 5 —
  perspective, hors périmètre contractuel ferme), chiffrement renforcé au repos
  (EF-507), export PDF/Excel des registres (EF-506), écran dédié pour le
  courrier sortant et sélection d'agent nominatif à l'affectation (suppose un
  annuaire des agents, EF-706, non livré).

## Phase 9 — Gestion électronique de documents (Bloc G, M6)

`apps.ged` (nouveau), jamais exposé côté public. Cœur « Obligatoire » du module
(EF-601 à EF-604, EF-607, EF-608) — testé de bout en bout via le stack Docker réel
avec de vraies images contenant du texte (OCR Tesseract réel, pas simulé).

- **`Document`** : référentiel avec `nature`/`categorie` (plan de classement
  encodé en chemin, pas de modèle d'arbre séparé pour cette passe), `perimetre`
  (réutilise `comptes.Perimetre`). `traiter_fichier_entrant()` calcule
  l'empreinte SHA-256 (EF-607) et lance l'OCR (EF-602) à l'entrée et à chaque
  nouvelle version — jamais sur une simple modification de métadonnées.
- **OCR réel, pas mocké** : Tesseract + `tesseract-ocr-fra` (déjà provisionné
  dans le Dockerfile) + `poppler-utils`/`pdf2image` pour rasteriser les PDF avant
  reconnaissance — ajoutés cette passe. Contrairement au paiement/SMS (mockés
  car aucun fournisseur souverain réel n'est engagé), l'OCR est une brique
  open-source auto-hébergée déjà disponible : construite pour de vrai,
  conformément au principe de souveraineté. Best-effort : une page illisible ne
  fait jamais échouer l'enregistrement (`statut_ocr=ECHEC`, chaîne vide).
- **`VersionDocument`** : historisation numérotée à chaque remplacement de
  fichier (même patron que `apps.contenus.VersionContenu`) — `nouvelle_version()`
  archive l'ancien fichier avant remplacement, `restaurer_version()` crée une
  nouvelle version plutôt que de revenir en arrière (aucune perte d'historique).
- **Verrouillage (check-in/check-out)** : `verrouille_par`/`verrouille_le` sur
  `Document` — un document verrouillé par un autre agent refuse la dépose de
  nouvelle version (409) ; seul l'auteur du verrou (ou un superviseur national)
  peut le lever (403 sinon).
- **`LienPartage` (EF-608)** : jeton opaque à durée limitée (72h par défaut),
  **jamais anonyme** — consommé par un agent authentifié muni du jeton, jamais
  exposé au public. Chaque consultation via lien est journalisée
  (`apps.audit.JournalAction`, déjà établi, réutilisé tel quel).
- **Frontend back-office** : écran « GED » (dépôt avec sélection de nature/
  catégorie, recherche plein texte sur le titre et le contenu océrisé) et détail
  (contenu océrisé affiché, empreinte SHA-256, historique des versions avec
  restauration, verrouillage/déverrouillage, génération de lien de partage) ;
  page dédiée de consommation d'un lien (`/ged/partage/:jeton`).
- **Non couvert** (voir le docstring de `apps/ged/models.py`) : classement
  automatique par règles/apprentissage (EF-605, suppose un moteur de
  classification), cycle de vie avec destruction contrôlée et procès-verbal
  (EF-606 — les champs `statut_cycle_vie`/`duree_conservation_mois`/
  `date_destruction_prevue`/`gel_juridique` sont posés mais aucun processus n'est
  construit), re-vérification périodique d'intégrité (EF-607 mentionne un
  contrôle périodique — l'empreinte n'est recalculée qu'à l'entrée/nouvelle
  version, pas de tâche planifiée), OCR asynchrone (traité de façon synchrone à
  l'enregistrement — aucune tâche Celery n'existe encore ailleurs dans le projet
  pour amorcer ce patron), comparaison visuelle entre versions (restauration et
  historique sont couverts, pas un différentiel).

## Phase 10 — Ressources humaines (Bloc G, M8 + reste M7)

`apps.rh` (nouveau), jamais exposé côté public. EF-801, EF-802, EF-703 —
« Obligatoire » — et EF-704, EF-706 — « Important »/« Obligatoire », inclus car
quasi gratuits une fois EF-801 livré. Testé de bout en bout via le stack Docker
réel : dépôt d'un congé par un agent → validation par un chef d'établissement
scopé au même périmètre → décompte réel du solde → e-mail réel reçu dans
MailHog ; création d'un acte d'avancement → soumission → validation → grade
effectivement mis à jour sur le dossier.

- **`DossierAgent`** (EF-801) : extension RH de `comptes.Utilisateur`
  (`OneToOneField`) plutôt qu'un doublon d'identité — corps/grade en texte libre
  (aucune nomenclature fixée par le cahier, contrairement à la position
  administrative qui est un statut réglementaire standard : activité,
  détachement, disponibilité, congé de longue durée, retraite).
- **`AffectationAgent`** : historique métier RH des affectations successives —
  distinct de `comptes.AffectationRole` (RBAC, permissions), qui répond à une
  question différente (quels droits, pas quel poste).
- **`ActeCarriere`** (EF-802) : machine à états `BROUILLON→SOUMIS→VALIDE/REJETE`
  (même patron que `apps.courrier`/`apps.visites`) — la validation applique
  l'effet correspondant (`AVANCEMENT` met à jour `grade`, `MUTATION` ferme
  l'affectation active et en ouvre une nouvelle, `DETACHEMENT`/`DISPONIBILITE`/
  `RETRAITE` changent la position administrative).
- **`DemandeRH`** (EF-703) : congé, permission d'absence, attestation de
  travail — circuit `SOUMISE→VALIDEE/REJETEE/ANNULEE`. `annuler` est réservé au
  demandeur (vérifié par permission objet-niveau) ; `valider`/`rejeter` au
  validateur (`rh:valider`) — la visibilité (`demandes_visibles_par`) restreint
  déjà un validateur aux agents de son périmètre, même patron que
  `notes_visibles_par`/`courriers_entrants_visibles_par`. La validation d'un
  congé décrémente `SoldeConge` (compteur par année, alimentation initiale une
  action RH, jamais une valeur légale fabriquée par le code) et notifie l'agent
  par e-mail (`apps.notifications.notifier()`, déjà établi).
- **Attestation de travail** : édition PDF (WeasyPrint, même patron que
  `apps.concours.pdf`/`apps.visites.pdf`) une fois la demande validée —
  document administratif interne, pas de QR ni de signature électronique
  (contrairement aux convocations, qui sont vérifiées à un poste de contrôle).
- **`apps.rh.views.UtilisateurSansDossierListView`** : petite recherche
  d'agents sans dossier pour la création (EF-801), volontairement locale à
  `apps.rh` plutôt qu'une extension d'`apps.comptes`.
- **Frontend** : self-service dans l'app **intranet** (« Mon dossier », « Mes
  demandes », « Annuaire ») — un validateur y voit et traite sa file directement,
  pas besoin d'un écran back-office séparé pour ça. Gestion RH proprement dite
  (CRUD dossiers, affectations, actes de carrière) dans l'app **backoffice**
  (`/rh/dossiers`), scope `rh:gerer`.
- **Non couvert** (voir le docstring de `apps/rh/models.py`) : formation
  (EF-705), volet « organigramme dynamique » d'EF-706 (suppose une hiérarchie
  sur `comptes.Perimetre`, modèle partagé RBAC — décision hors périmètre de
  cette passe), calendrier institutionnel (EF-707), messagerie de service
  interne (EF-708, bien qu'adossable à la GEC désormais livrée), avancements
  automatisés (EF-803), évaluations (EF-804), gestion prévisionnelle (EF-805),
  affectations et mobilité avec vœux/commissions (EF-806), interfaces paie
  (EF-807).

## Phase 11 — Administration transverse : comptes, rôles, permissions, audit (Bloc G, M15)

EF-1501 (« console d'administration des comptes, rôles et permissions ») et
EF-1504 (« journal d'audit central ») — les deux « Obligatoire » de ce module
directement livrables. Aucun nouveau modèle : `apps.comptes` (`Role`,
`Permission`, `AffectationRole`, `AttributionPermission`) et `apps.audit`
(`JournalAction`) existaient déjà, dimensionnés dès la Phase 0 pour ce
cas d'usage — `AttributionPermission` en particulier *est* la « délégation
temporaire » d'EF-1501 (`motif`, `date_debut`/`date_fin`, `actif`) sans qu'il
ait fallu rien ajouter. Cette passe construit la console (API + back-office)
au-dessus, jusqu'ici seulement gérable par Django admin.

- **Comptes** (`/api/v1/backoffice/comptes/utilisateurs`) : création,
  modification, activation/désactivation — **jamais de suppression physique**,
  un compte étant référencé par l'historique (audit, RH, courrier, GED…) dans
  tout le système ; `is_active=False` en tient lieu.
- **Rôles et permissions** : `Role` en CRUD (permissions par identifiants),
  `Permission` en lecture seule (référentiel défini par les modules, pas par
  l'admin). `AffectationRole`/`AttributionPermission` : création + révocation
  (`actif=False`, jamais supprimées — historique des habilitations, revues
  périodiques). Séparation des tâches : `comptes:gerer` (console complète) et
  `audit:consulter` (journal) sont deux scopes distincts.
- **Journal d'audit** (`/api/v1/backoffice/audit/journal`, EF-1504) — lecture
  seule sur `JournalAction` (déjà append-only par construction). Filtres
  acteur/action/type de ressource/plage de dates.
- **Bug latent corrigé en construisant cette passe** :
  `AffectationRole.date_debut`/`AttributionPermission.date_debut` étaient des
  `DateField` avec `default=timezone.now` (un `datetime`, pas un `date`) —
  invisible tant que rien ne sérialisait un objet fraîchement créé sans
  rechargement DB entre-temps ; changé en `default=timezone.localdate`
  (migration `comptes.0003`).
- **Frontend back-office** : « Comptes » (liste/création + détail avec gestion
  des rôles/délégations et scopes effectifs), « Rôles » (liste + édition des
  permissions par catégorie), « Journal d'audit » (lecture seule, filtres).
- **Non couvert** : délégations temporaires avec expiration automatique
  planifiée (EF-1501 mentionne des délégations « temporaires » — les champs
  existent (`date_fin`), rien ne les désactive automatiquement à l'échéance,
  aucune tâche Celery ne existe encore pour ce patron), revues périodiques
  d'habilitations outillées (EF-1501, suppose un workflow de campagne dédié),
  référentiels partagés versionnés (EF-1502, structures/motifs/nomenclatures —
  sous-domaine distinct), paramétrage métier sans développement (EF-1503),
  export du journal à des fins d'enquête (EF-1504 le mentionne).

## Phase 12 — Dossier numérique de la personne détenue (Bloc G, M10)

`apps.detenus` (nouveau) — **module le plus sensible du système** (§6.3).
Démarré sur confirmation explicite après discussion de sa portée et de son
isolement (le découplage initialement prévu avec `apps.interop` s'est avéré
prématuré : le principal apport d'`apps.interop`, les échanges avec la chaîne
judiciaire (EF-1402), suppose justement des données détenu réelles). Scope
EF-1001, EF-1002 — « Obligatoire » — et EF-1009 restreint à la recherche par
numéro d'écrou.

- **Chiffrement applicatif réel** (pas simulé) : `nom`/`prenom` en AES-256-GCM
  via `core.chiffrement` + `core.champs.ChampChiffre` (nouveau champ Django
  réutilisable — `BinaryField` transparent en chaîne côté Python, nonce
  aléatoire préfixé au texte chiffré). Vérifié en base réelle : la colonne
  `nom` ne contient que des octets opaques, jamais le texte en clair, y
  compris dans les sauvegardes. Clé via `CLE_CHIFFREMENT_DONNEES` — la valeur
  de dev fournie n'est pas sécurisée, à remplacer en environnement réel.
  Conséquence assumée : pas de recherche nominative (EF-1009), un DRF
  `ModelSerializer` ne peut pas non plus auto-générer de champ pour ce type
  personnalisé — `nom`/`prenom` sont déclarés explicitement en `CharField`
  dans chaque sérialiseur (sinon DRF retombe sur le champ binaire par défaut
  de `BinaryField`, qui casse au rendu).
- **`PersonneDetenue`** (EF-1001) : `numero_ecrou` préfixé par le code de
  l'établissement (`MAC-XXX-AAAA-NNNNN`), `statut_dossier`
  (Écroué/Libéré/Transféré/Évadé). `date_liberation_prevue` est **saisie et
  mise à jour manuellement par un agent habilité, jamais calculée** — un
  calcul erroné des dates clés (EF-1003) aurait des conséquences réelles sur
  la liberté d'une personne, hors périmètre d'expertise assumable ici.
- **`Mouvement`** (EF-1002) : écrou, levée d'écrou, transfert, extraction,
  hospitalisation, permission de sortir, évasion, réintégration — historique
  append-in-spirit, `enregistrer_mouvement()` applique l'effet correspondant
  (transfert change l'établissement, levée d'écrou/évasion/réintégration
  changent le statut ; extraction/hospitalisation/permission sont des
  absences temporaires qui ne changent pas le statut « Écroué »).
- **Habilitation par établissement + journalisation intégrale** :
  `personnes_visibles_par(utilisateur)` restreint aux établissements des
  périmètres de l'agent (même patron que `notes_visibles_par`/
  `courriers_entrants_visibles_par`) ; **toute consultation** d'un dossier est
  journalisée sans exception (contrairement à `apps.courrier`, où seuls les
  niveaux confidentiels le sont) — `PersonneDetenueDetailView.get_object()`.
- **Isolement réseau, au-delà du RBAC applicatif** : en auditant ce module, le
  fait que `www.conf`/`demarches.conf` proxyaient un `/api/v1/backoffice/`
  générique vers le backend a été relevé — ces zones publiques n'appelaient
  jamais ces chemins côté frontend, mais rien ne les en empêchait au niveau
  nginx, la seule protection étant le RBAC Django. Ajouté : un blocage
  `location /api/v1/backoffice/ { return 404; }` sur `www.conf`/`demarches.conf`
  (zones publiques/citoyennes, aucun usage légitime), et un blocage plus ciblé
  `/api/v1/backoffice/detenus/` sur `intranet.conf` (qui garde légitimement
  accès à `/api/v1/backoffice/intranet/notes` pour sa propre gestion des notes
  de service). L'isolement réseau *au sens infrastructure* (VLAN/segment
  dédié) reste une décision de déploiement — `admin.conf`/`intranet.conf`
  portent déjà un allow-list VPN commenté (`allow 10.0.0.0/8; deny all;`),
  prêt à activer en préproduction/production.
- **Frontend back-office uniquement** (`/detenus`, scope `detenus:consulter`/
  `detenus:gerer`) — pas d'exposition intranet, contrairement à RH : il n'y a
  pas de notion de self-service pertinente ici.
- **Non couvert** (voir le docstring de `apps/detenus/models.py`) : calcul
  automatique des dates clés (EF-1003), discipline (EF-1004), santé à accès
  cloisonné (EF-1005 — sous-domaine à part entière, règles de non-divulgation
  propres, à traiter dans une passe dédiée), activités/travail/formation
  (EF-1006), lien avec le module visites (EF-1007 — `apps.visites` a été
  délibérément conçu sans lien vers une personne détenue réelle pour ne
  jamais confirmer une présence à un tiers non habilité ; créer ce lien est
  une décision produit/sécurité à part entière, pas une extension mécanique),
  éditions réglementaires de levée d'écrou (EF-1008), recherche nominative et
  éditions de registres officiels (EF-1009), mode dégradé hors-ligne
  (EF-1010).

## Corrections transverses (hors numérotation de phase)

Deux corrections touchant l'ensemble des applications, trouvées en construisant
les phases ci-dessus :

- **Session JWT prématurément expirée** : `REFRESH_TOKEN_LIFETIME` est à 24h
  avec rotation (`ROTATE_REFRESH_TOKENS=True`) depuis toujours, mais
  `rest_framework_simplejwt.token_blacklist` n'était pas dans
  `INSTALLED_APPS` — `BLACKLIST_AFTER_ROTATION=True` ne faisait donc rien.
  Côté frontend, `rafraichirSession()` (`packages/api-client`) ne persistait
  que le nouvel access token, jamais le refresh token pourtant rotaté à
  chaque appel. Les deux bouts corrigés ensemble : le blacklist est
  maintenant réellement actif (vérifié en direct : réutiliser un refresh
  token déjà rotaté renvoie 401 « jeton banni ») et le frontend persiste
  systématiquement le refresh token rotaté — une session active reste donc
  valide indéfiniment (rotation continue), et seuls la déconnexion explicite,
  l'effacement du stockage local, ou plus de 24h d'inactivité totale y
  mettent fin.
- **Navigation filtrée par habilitation** : les liens de navigation du
  back-office n'étaient auparavant filtrés qu'au niveau de la route (un agent
  sans le scope voyait le lien, cliquait, et recevait un message d'erreur).
  `possedeScope()` (dans `AuthContext`, back-office et intranet) court-circuite
  désormais aussi sur `est_superviseur_national` (déjà exposé par
  `UtilisateurSerializer`, mais pas encore consommé côté frontend), et
  `liensNav` (back-office) est filtré par ce même `possedeScope()` avant
  affichage — un agent ne voit plus que les sections que son rôle et ses
  permissions autorisent ; un superviseur national (administrateur) voit tout,
  y compris le dossier détenu.

## Phase 13 — Interconnexion (Bloc G, M14)

`apps.interop` (nouveau) — scope volontairement réduit : la plupart d'EF-1401
à EF-1406 suppose des contreparties externes réelles (systèmes du Ministère de
la Justice, conventions Police/Gendarmerie, briques mutualisées de l'État)
hors de portée d'un projet sans accès à ces systèmes, ou est déjà couverte
ailleurs. Voir le docstring d'`apps/interop/models.py` pour le détail complet.

- **`EchangeExterne`** (EF-1401, « socle d'API sécurisées documentées pour
  tous les échanges externes, sans échange de fichiers manuels non tracés ») —
  journal générique (système, direction, type, statut, empreinte SHA-256 de la
  charge — jamais le contenu lui-même, potentiellement sensible selon le
  système), prêt à recevoir un connecteur réel pour chacun des systèmes cités
  par le cahier. Un agent habilité peut aussi y enregistrer manuellement un
  échange effectué hors connecteur (`POST .../interop/echanges`) — l'exigence
  du cahier porte sur l'absence d'échange *non tracé*, pas sur l'absence
  d'échange manuel : tant qu'aucun connecteur réel n'existe, ce point d'entrée
  est ce qui empêche un échange manuel de rester hors du système.
- **Rapprochement des paiements** (`GET .../interop/rapprochement-paiements`,
  volet automatique d'EF-1404) — agrégation pure (même patron que
  `apps.statistiques`, aucun nouveau modèle) sur le grand livre mock déjà
  existant d'`apps.paiements` : totaux par statut, répartition par jour,
  paiements « en attente » depuis plus de 3 jours signalés comme anomalie
  (signalement seul, aucun blocage automatique).
- **Frontend back-office** (`/interop`, scope `interop:consulter`/
  `interop:gerer`) : une page unique combinant le journal (liste + formulaire
  d'enregistrement manuel) et le résumé de rapprochement — module mineur,
  pas de justification à deux écrans séparés.
- **Non couvert** : EF-1402 (chaîne judiciaire), EF-1403 (forces de sécurité),
  EF-1404 volet intégration de passerelle réelle (mobile money, cartes — même
  décision que pour `apps.paiements`, mock uniquement), EF-1405 (déjà livré
  par `apps.notifications`), EF-1406 (plateformes gouvernementales).

## Corrections ponctuelles hors phase

- **Aperçu des concours ouverts absent de l'accueil « Démarches »** — la page
  d'accueil de `apps.demarches` (`pages/Accueil.tsx`) datait du socle Phase 0
  et n'avait jamais été mise à jour après la livraison du Bloc E (concours) :
  elle ne proposait qu'une carte statique « S'inscrire à un concours » vers
  `/concours`, sans jamais interroger l'API. Un citoyen créant un concours de
  test ne le voyait donc nulle part avant de cliquer sur ce lien. Ajout d'un
  aperçu en direct (`GET /concours?limit=3`, déjà filtré côté serveur sur les
  concours `OUVERT`) affiché directement sur l'accueil, avec lien vers la
  liste complète.

## Phase 14 — Durcissement production

Toutes les briques métier étant livrées (Phases 0-13), cette passe audite ce
qui existait déjà côté production/CI (`config/settings/prod.py`,
`.github/workflows/ci.yml`, `backend/Dockerfile` — plus mature qu'attendu :
en-têtes de sécurité, cookies stricts, HSTS, `pip-audit`/`npm audit`/scan
Trivy déjà en place) et corrige ce qui restait concrètement faillible.

- **Secrets de développement utilisables silencieusement en production** —
  `config.settings.base` fournit des valeurs de repli pour tourner sans `.env`
  en dev (`SECRET_KEY`, `CLE_CHIFFREMENT_DONNEES`, mot de passe Postgres, clé
  secrète MinIO). Rien n'empêchait `config.settings.prod` de démarrer avec ces
  mêmes valeurs si l'exploitant oubliait de les redéfinir — la plus grave
  étant `CLE_CHIFFREMENT_DONNEES`, dont la valeur de repli figure en clair
  dans l'historique Git : le chiffrement de l'identité des personnes détenues
  (Phase 12) n'aurait alors protégé personne. `prod.py` échoue désormais au
  démarrage (`ImproperlyConfigured`) si l'une de ces valeurs est restée à son
  défaut de développement — vérifié dans les deux sens (échec avec les
  défauts, démarrage propre avec de vrais secrets, `manage.py check --deploy`
  ne remonte plus aucun problème une fois ces variables renseignées).
- **Sonde `/sante/` factice** — répondait `{"statut": "ok"}` sans vérifier
  quoi que ce soit, y compris avec la base de données injoignable : un load
  balancer aurait continué à router du trafic vers une instance cassée.
  Vérifie désormais une vraie connexion DB (`SELECT 1`), renvoie 503 sinon.
- **`worker`/`beat` en boucle de redémarrage silencieuse** — `docker compose
  build backend` (fait en construisant `apps.detenus`, pour la dépendance
  `cryptography`) ne reconstruit que l'image du service `backend` ; `worker`
  et `beat` définissent chacun leur propre image (même Dockerfile, contexte
  commun, mais trois images distinctes en l'absence d'un tag `image:` partagé)
  et n'avaient jamais été reconstruits — `ModuleNotFoundError: No module named
  'cryptography'` à chaque tentative de démarrage dès qu'`apps.detenus` a
  rejoint `INSTALLED_APPS`, en boucle infinie et silencieuse (aucune tâche de
  fond, aucun Celery beat, ne tournait plus depuis). Corrigé en reconstruisant
  les deux images séparément ; `docker compose ps` confirme les deux services
  stables.
- **`nginx` démarrait sans attendre un backend réellement prêt** —
  dépendait de `backend` avec `condition: service_started` (processus lancé,
  pas nécessairement apte à répondre) faute de `healthcheck` déclaré sur ce
  service. Ajouté un `healthcheck` (`curl -f .../sante/`) sur `backend`,
  `nginx` dépend maintenant de `condition: service_healthy`.
- **`sentry-sdk` installé mais jamais initialisé** — dépendance présente
  depuis l'origine du projet, aucun appel à `sentry_sdk.init()` nulle part :
  une exception en production ne remontait que dans les logs du conteneur,
  aucune agrégation ni alerte centralisée. Initialisé dans
  `config.settings.prod` uniquement, conditionné à `SENTRY_DSN` (vide =
  désactivé, aucun appel réseau) ; `send_default_pii=False` explicite — ce
  système journalise l'identité de personnes détenues et des courriers
  confidentiels, jamais à envoyer à un tiers de supervision par défaut.
  Vérifié dans les deux sens (DSN vide : aucune initialisation ; DSN fourni :
  client Sentry actif).

**Gap documenté, non traité dans cette passe** : les dépendances Python
(`pyproject.toml`) utilisent des bornes basses (`>=`) sans fichier de verrou
(`pip-tools`/`uv`/`poetry` absent) — une build reconstruite plus tard peut
résoudre des versions transitoires différentes. Non corrigé ici : introduire
un outil de verrouillage change l'outillage de tout le flux `pip install -e .`
déjà utilisé dans ce dépôt (dev comme CI), une décision d'équipe plutôt qu'une
correction locale.

## Ce qui reste à construire

Toutes les briques métier listées dans le prompt de cadrage (Blocs B à G)
sont livrées. Les seuls éléments hors périmètre sont ceux documentés comme
« non couvert » dans chaque section de phase ci-dessus (Phases 0 à 13) —
principalement des fonctionnalités dépendant de contreparties externes
réelles (chaîne judiciaire, forces de sécurité, passerelles de paiement
réelles, plateformes gouvernementales), ou explicitement classées
« Lot 5 — perspectives » par le cahier des charges (IA, application mobile,
Open Data, signature électronique qualifiée). Côté infrastructure,
l'isolement réseau physique (VLAN/segment dédié pour `apps.detenus`) reste
une décision de déploiement — les allow-lists VPN sont déjà présentes,
commentées, dans `admin.conf`/`intranet.conf`, prêtes à activer.

## Comptes de démonstration

Voir `docs/comptes-demo.md` — mots de passe de développement, jamais utilisés en
production (§15).

## Décisions d'architecture

Voir `docs/adr/`. La première (`0001-seo-rendering.md`) documente le choix du
prerendering statique pour le portail public (React + Vite, sans Next.js).
