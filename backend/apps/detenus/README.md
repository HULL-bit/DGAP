# apps.detenus

Dossier numérique de la personne détenue (M10) — Bloc G. **Accès réservé,
données les plus sensibles du système, jamais exposé côté public.**

Voir le docstring de `apps/detenus/models.py` pour le détail de ce qui est
livré (EF-1001, EF-1002, EF-1009 partiel) et de ce qui est explicitement hors
périmètre de cette passe (EF-1003 volet calcul automatique, EF-1004, EF-1005,
EF-1006, EF-1007, EF-1008 volet éditions, EF-1010).

Identité (`nom`, `prenom`) chiffrée applicativement en AES-256-GCM
(`core.chiffrement`, `core.champs.ChampChiffre`) — jamais en clair en base, y
compris dans les sauvegardes. Clé via `CLE_CHIFFREMENT_DONNEES` (voir
`config/settings/base.py`) : la valeur de développement fournie n'est **pas**
sécurisée et doit être remplacée par un secret propre à chaque environnement
réel.
