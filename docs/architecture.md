# Architecture

## Vue d'ensemble

Monorepo, backend monolithe modulaire (Django/DRF), quatre applications frontales
déployées séparément mais partageant une charte unique. Voir le schéma et le
raisonnement complet dans le prompt de cadrage (`§4` du Cahier des charges
DGAP-SI-CDC-2026-001) ; ce document se concentre sur ce qui existe réellement dans le
dépôt et sur les décisions prises pendant la Phase 0.

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
         audit, …)                          sauvegardes)          OCR — Bloc B+)
```

## Ce qui est livré en Phase 0 (socle)

- **`core`** : identifiants UUID v7 (`core.id.uuid7`), modèles de base horodatés/
  traçables/à suppression logique (`core.models`), pagination par curseur
  (`core.pagination`), erreurs API au format RFC 9457 (`core.exceptions`), RBAC par
  scopes + périmètres (`core.permissions`), corrélation de requêtes/logs JSON
  structurés (`core.correlation`, `core.logging`).
- **`apps.comptes`** : comptes nominatifs par e-mail, MFA TOTP obligatoire pour les
  agents internes, rôles à scopes, périmètres organisationnels, JWT courte durée
  (`djangorestframework-simplejwt`).
- **`apps.audit`** : journal d'actions append-only (`JournalAction.tracer(...)`).
- **`@dgap/ui`** : tokens de charte, emblème SVG (couleur/mono blanc/mono sombre/
  favicon), composants de base (bouton, badge, carte, carte d'action, en-tête État,
  pied de page, compteur animé, champ de formulaire), presets Framer Motion
  respectant `prefers-reduced-motion`, Storybook.
- **`@dgap/config`, `@dgap/api-client`, `@dgap/i18n`** : presets Tailwind/ESLint/
  TypeScript partagés, mutator fetch RFC 9457 + génération orval (à lancer une fois
  l'OpenAPI produit), dictionnaire français de base.
- **4 applications frontales** (`portail`, `demarches`, `intranet`, `backoffice`) :
  layout complet (en-tête, pied de page, routage) + page d'accueil. Le portail
  implémente la structure d'accueil imposée (EF-101) avec des chiffres clés
  explicitement marqués « provisoires » (§14.3 — aucune statistique n'est inventée
  comme si elle était officielle).
- **Nginx** : 4 blocs `server` distincts (un par sous-domaine), TLS local auto-signé
  (`make certs`), en-têtes de sécurité communs, CSP par zone, rate-limiting différencié
  (authentification, dépôt de demande, suivi), redirection HTTP→HTTPS centralisée.
- **`docker-compose.yml`** : `db`, `redis`, `minio`, `mailhog`, `backend`, `worker`,
  `beat`, `frontend-build` (build unique des 4 SPA), `nginx` ; profil `full` additionnel
  pour `elasticsearch`/`keycloak`.

## Ce qui reste à construire (blocs B à G)

Les dossiers `backend/apps/{referentiels,contenus,etablissements,mediatheque,
demarches,visites,concours,paiements,notifications,courrier,ged,rh,intranet,detenus,
statistiques,interop}` existent en scaffolding (`apps.py`, `migrations/__init__.py`,
README expliquant le bloc auquel ils sont rattachés) mais ne sont **pas** encore
ajoutés à `INSTALLED_APPS` : aucun modèle n'y est défini tant que le bloc
correspondant n'est pas engagé. Voir le tableau des blocs dans le prompt de cadrage.

## Décisions d'architecture

Voir `docs/adr/`. La première (`0001-seo-rendering.md`) documente le choix du
prerendering statique pour le portail public (React + Vite, sans Next.js).
