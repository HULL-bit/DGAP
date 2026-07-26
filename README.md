# DGAP — Portail institutionnel & socle SI

Refonte de `administrationpenitentiaire.sn` : portail institutionnel, téléservices
citoyens et socle du système d'information de la **Direction Générale de
l'Administration Pénitentiaire** du Sénégal. Stack imposée : Django (DRF) · React
(Vite + TypeScript) · PostgreSQL 16 · Docker · Nginx.

**État actuel : Phase 0 (cadrage & socle)** — voir `docs/architecture.md` pour le
détail de ce qui est livré et de ce qui reste à construire, bloc par bloc.

## Démarrage — stack complète (Docker)

```bash
cp .env.example .env      # ajuster si besoin (aucun secret réel dans .env.example)
make up                   # génère un certificat TLS de dev + démarre toute la stack
```

Ajouter à `/etc/hosts` (affiché aussi par `make certs`) :

```
127.0.0.1 www.localhost demarches.localhost intranet.localhost admin.localhost
```

Puis ouvrir :

- **Portail** — https://www.localhost
- **Démarches** — https://demarches.localhost
- **Intranet** — https://intranet.localhost (non indexable, réservé VPN en prod)
- **Back-office** — https://admin.localhost (non indexable, réservé en prod)
- **API** — https://www.localhost/api/v1/ · Swagger protégé : `/api/v1/docs/`
- **MinIO console** — http://localhost:9001 · **Mailhog** — http://localhost:8025

Autres commandes utiles : `make down`, `make logs`, `make migrate`, `make test`,
`make lint`, `make openapi`, `make storybook`. Voir `make help` pour la liste complète.

## Démarrage — backend seul, sans Docker

Utile pour itérer vite sur le backend sans reconstruire d'image à chaque changement.
Voir `backend/README.md`. Nécessite un PostgreSQL 16 accessible en TCP (natif ou
conteneurisé) et ses identifiants dans `.env`.

## Démarrage — une app frontend seule, en hot-reload

```bash
cd frontend && pnpm install
pnpm dev:portail      # ou dev:demarches / dev:intranet / dev:backoffice
pnpm storybook        # design system @dgap/ui
```

## Structure du dépôt

```
backend/     Django + DRF — voir backend/README.md
frontend/    Workspace pnpm — 4 apps + design system partagé (@dgap/ui, @dgap/config, …)
nginx/       Configuration multi-sites (4 sous-domaines), TLS de dev, en-têtes de sécurité
docs/        Architecture, sécurité, accessibilité, exploitation, API, ADRs
```

Détail complet de l'arborescence : `docs/architecture.md`.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — vue d'ensemble, ce qui est livré vs. à venir
- [`docs/securite.md`](docs/securite.md) — RBAC, MFA, cloisonnement, en-têtes HTTP
- [`docs/accessibilite.md`](docs/accessibilite.md) — RGAA 4 / WCAG 2.1 AA
- [`docs/exploitation.md`](docs/exploitation.md) — démarrage, sauvegardes, supervision (état réel)
- [`docs/mcd.md`](docs/mcd.md) — modèle de données (diagramme Mermaid)
- [`docs/contenu/inventaire.md`](docs/contenu/inventaire.md) — reprise de contenu de l'ancien site
- [`docs/adr/`](docs/adr/) — décisions d'architecture
- [`docs/api/openapi.yaml`](docs/api/openapi.yaml) — schéma OpenAPI 3.1 (généré, `make openapi`)

## Qualité

CI : `.github/workflows/ci.yml` (GitHub Actions) et `.gitlab-ci.yml` — lint, types,
tests, build, audit de dépendances, scan d'image (Trivy). Backend et frontend
vérifiés localement avant tout commit : `ruff` / `black` / `mypy` / `pytest` côté
Python, `eslint` / `tsc` / `vitest` côté TypeScript.

## Propriété et réversibilité

Code, scripts d'infrastructure et documentation : propriété de l'État du Sénégal.
100 % open source, conteneurisé, aucune dépendance à un fournisseur propriétaire pour
le fonctionnement du socle.
