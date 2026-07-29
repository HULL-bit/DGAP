# apps.ged

Gestion électronique des documents (GED, M6) — Bloc G, jamais exposé côté public
(back-office interne uniquement, scopes `ged:*`).

Livré : référentiel documentaire unique avec métadonnées et plan de classement
(EF-601), **OCR français réel** à l'entrée via Tesseract (`tesseract-ocr-fra` +
`poppler-utils`, déjà provisionnés dans l'image Docker — `pytesseract`/
`pdf2image` ajoutés côté Python) avec indexation du texte océrisé (EF-602),
recherche plein texte sur le titre et le contenu océrisé (EF-603), gestion des
versions avec commentaire et restauration + verrouillage check-in/check-out
(EF-604), empreinte SHA-256 calculée à l'entrée et à chaque nouvelle version
(EF-607), partage interne à durée limitée avec traçabilité des consultations via
`apps.audit` (EF-608).

Non couvert dans cette passe — voir le docstring de `models.py` pour le détail :
classement automatique par apprentissage (EF-605, Souhaitable), processus de
destruction contrôlée avec procès-verbal (EF-606 ; les champs de cycle de vie
existent, le workflow de destruction n'est pas construit), vérification
périodique d'intégrité planifiée (EF-607, suppose Celery beat), traitement OCR
asynchrone (synchrone dans cette passe — best-effort, n'empêche jamais
l'enregistrement), comparaison visuelle entre versions (EF-604).
