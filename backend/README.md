# Backend DGAP — Django + DRF

Socle technique du système d'information de la Direction Générale de l'Administration
Pénitentiaire. Voir `docs/architecture.md` (racine du monorepo) pour la vue d'ensemble.

## Démarrage local (hors Docker)

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../.env.example ../.env   # à la racine du monorepo
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Voir plutôt `make up` à la racine du monorepo pour la stack complète (Postgres, Redis, MinIO…).

## Structure

- `config/` — réglages Django (`settings/base.py|dev.py|prod.py`), urls, Celery, ASGI/WSGI.
- `core/` — socle transverse : UUID v7 (`core.id`), modèles de base (`core.models`),
  pagination par curseur, gestion d'erreurs RFC 9457, RBAC, corrélation de logs.
- `apps/` — une app Django par module métier (§4.3 du cahier des charges). En Phase 0,
  seules `apps.comptes` (auth/RBAC) et `apps.audit` (journal) sont implémentées ; les
  autres dossiers existent en scaffolding, prêts à recevoir modèles/migrations/API.
- `scripts/` — `seed.py` (jeux de démonstration) et `migrate_assets.py` (reprise des
  médias de l'ancien site WordPress), livrés au Bloc B.

## Qualité

```bash
ruff check .
black --check .
mypy .
pytest
```
