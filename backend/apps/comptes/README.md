# apps.comptes

Comptes nominatifs, permissions, rôles métier et périmètres organisationnels (RBAC
maison, §6.3). Deux voies d'attribution des droits, cumulatives :

- `Permission` : droit élémentaire (`code`, ex. `visites:instruire`), groupé par
  `categorie` pour l'ergonomie de l'administration.
- `Role` → `permissions` (M2M) : un profil métier cohérent (ex. « greffier »).
  `AffectationRole` attribue ce rôle à un `Utilisateur` sur un `Perimetre` donné —
  c'est la voie normale.
- `AttributionPermission` : attribution **directe** d'une permission à un utilisateur,
  hors rôle, pour les exceptions ponctuelles (délégation temporaire, habilitation
  individuelle) — évite de créer un rôle dédié pour un seul agent.
- `Utilisateur.scopes()` fusionne les deux voies (rôles actifs ∪ attributions
  directes actives) ; `core.permissions.PossedeScope` consomme ce résultat sans
  distinguer d'où vient chaque droit. `Utilisateur.perimetres_autorises()` fait de
  même pour les périmètres.
- `Perimetre` : portée organisationnelle minimale (national/direction/établissement) —
  à relier aux entités réelles (`apps.etablissements`, `apps.referentiels`) au Bloc B.

Endpoints : `POST /api/v1/auth/connexion`, `POST /api/v1/auth/rafraichissement`,
`GET /api/v1/auth/moi`, `POST /api/v1/auth/mfa/inscription`,
`POST /api/v1/auth/mfa/confirmation`.

Tests : `pytest apps/comptes`.
