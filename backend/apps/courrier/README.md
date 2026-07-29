# apps.courrier

Gestion électronique du courrier (GEC, M5) — Bloc G, jamais exposé côté public
(back-office interne uniquement, scopes `courrier:*`).

Livré (cœur « Obligatoire ») : registre du courrier entrant avec numérotation
chronologique (EF-501), affectation hiérarchique tracée + corbeilles par
périmètre/agent + calcul des retards (EF-502), projets de réponse avec circuit
visa → validation (signataire habilité) → expédition (EF-503), courrier sortant
numéroté (EF-504), recherche multicritère (EF-506), niveaux de confidentialité
avec restriction d'accès et journalisation des consultations sensibles via
`apps.audit` (EF-507).

Non couvert dans cette passe — voir le docstring de `models.py` pour le détail :
OCR d'aide au classement et versement en GED (EF-508, dépend d'`apps.ged` non
livrée), relances/escalades automatiques (EF-505, suppose Celery beat planifié),
signature électronique qualifiée (EF-503, explicitement Lot 5 — perspective, hors
périmètre contractuel ferme), chiffrement renforcé au repos (EF-507), export
PDF/Excel des registres (EF-506).
