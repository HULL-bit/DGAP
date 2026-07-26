# apps.audit

Journal d'actions append-only (§6.3, §9.3) : toute consultation/modification sensible
doit être tracée via `JournalAction.tracer(acteur=..., action=..., ressource_type=..., ressource_id=..., requete=...)`.

- Écriture uniquement — `save()`, `delete()` et `queryset.update()` lèvent `NotImplementedError`
  au-delà de la création initiale.
- Le partitionnement mensuel PostgreSQL (`PARTITION BY RANGE (horodatage)`) est à
  appliquer par migration d'exploitation dédiée — voir `docs/exploitation.md`.

Tests : `pytest apps/audit`.
