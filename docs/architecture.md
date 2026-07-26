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

## Ce qui reste à construire (blocs D à G)

Les dossiers `backend/apps/{visites,concours,paiements,notifications,courrier,ged,
rh,intranet,detenus,statistiques,interop}` existent en scaffolding (`apps.py`,
`migrations/__init__.py`, README expliquant le bloc auquel ils sont rattachés) mais
ne sont **pas** encore ajoutés à `INSTALLED_APPS`. Voir le tableau des blocs dans le
prompt de cadrage — prochaine étape naturelle : **Bloc D (téléservice Visites, M3)**.

## Comptes de démonstration

Voir `docs/comptes-demo.md` — mots de passe de développement, jamais utilisés en
production (§15).

## Décisions d'architecture

Voir `docs/adr/`. La première (`0001-seo-rendering.md`) documente le choix du
prerendering statique pour le portail public (React + Vite, sans Next.js).
