# apps.statistiques

Tableaux de bord statistiques (M11) — Bloc F.

Livré : tableaux de bord thématiques (EF-1102) pour les domaines déjà en
production — Visites et Concours — calculés à la volée sur les données réelles
(aucun modèle propre : agrégations `Count`/`TruncMonth` sur `apps.visites` et
`apps.concours`, pas de nouvelle table).

Non couvert par cette passe :
- **EF-1101** (tableau de bord national, Obligatoire) — nécessite la population
  carcérale (`apps.detenus`, jamais exposée publiquement, Bloc G non livré) ;
  volontairement hors périmètre tant que ce bloc n'est pas explicitement engagé.
- **EF-1103** (cartographie), **EF-1105** (rapports périodiques automatiques),
  **EF-1107** (analyses de tendances/prévisions), **EF-1108** (contrôles qualité) —
  fonctionnalités substantielles à part entière, non construites.
- **EF-1106** (entrepôt de données décisionnel, schéma en étoile) — projet
  d'infrastructure séparé (ETL, historisation), pas une extension incrémentale des
  vues actuelles.
- Volets courrier/RH/santé/incidents/budget d'EF-1102 : pas de données réelles
  disponibles (apps correspondantes non livrées).
- **EF-1104** (exports) : non implémenté — les tableaux sont consultables via API,
  pas encore exportables en PDF/Excel avec traçabilité.
