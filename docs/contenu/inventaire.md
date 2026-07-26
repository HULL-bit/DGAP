# Inventaire de reprise de contenu — ancien site WordPress

Source : `administrationpenitentiaire.sn` (WordPress, thème Ovathemes/Elementor,
2020-2021). Ce document classe le contenu identifié dans le cahier des charges
(§1.3) — **à réellement confirmer avec la DGAP avant migration** : cet inventaire
recense ce qui a été communiqué, pas un audit exhaustif de l'ancien site (que nous
n'avons pas accédé ici).

Statuts : **Reprendre** (contenu à réinjecter en seed, réécrit si besoin) ·
**Réécrire** (fond à garder, forme à moderniser) · **À valider DGAP** (existence/
exactitude à confirmer avant publication) · **Ne pas migrer** (hors périmètre
technique, ex. thème/plugins WordPress eux-mêmes).

## Identité et gouvernance

| Contenu | Statut | Note |
|---|---|---|
| Nom, devise, tutelle, siège, contacts, horaires | Reprendre | Repris tels quels dans `PiedDePage`/`EnTeteEtat` (§1.1) |
| Emblème (bouclier héraldique) | Reprendre | Reconstruit en SVG vectoriel (`frontend/packages/ui/src/assets/brand/`), pas une capture de l'ancien logo |
| Mot du Directeur Général (Aliou CISS) | Reprendre | Cité intégralement dans `Accueil.tsx` du portail (§14.4) |
| Directeurs centraux (Mbaye SARR, Samba DIOUF, Souleymane FAYE) | À valider DGAP | Fonctions à confirmer avant seed (Bloc B) |
| Directeurs régionaux — IRAP (Dakar, Thiès-Diourbel, Ziguinchor-Kolda-Sédhiou, Kaolack-Fatick-Kaffrine, Tambacounda-Matam, Saint-Louis-Louga) | À valider DGAP | Noms à confirmer avant seed |

## Arborescence / rubriques

| Rubrique ancien site | Statut | Application cible |
|---|---|---|
| Accueil | Réécrire | `portail` (structure imposée EF-101, §7.1) |
| À propos (historique, organisation, ENAP, établissements) | Réécrire | `portail` — Bloc B |
| Vie des détenus | Réécrire | `portail` — Bloc B |
| Publications officielles (communiqués, documents, examens/concours, statistiques) | Réécrire | `portail` (médiathèque) + `demarches` (concours) — Bloc B/E |
| Actualité | Réécrire | `portail` — Bloc B |
| La Réinsertion (ateliers, art/culture/sport, production, agriculture, élevage, industriel, formations) | Réécrire | `portail` — Bloc B |
| Boutique (produits des détenus) | Réécrire | `portail` (vitrine, pas de paiement en ligne prévu à ce stade) — Bloc B |
| Contact | Reprendre | `portail` (formulaire tracé, §7.2) — Bloc B |
| SOS Détenus / Donation | À valider DGAP | Périmètre exact à clarifier avec la DGAP avant conception |
| Annuaire de l'AP | Réécrire | `portail` (annuaire établissements + carte) — Bloc B |
| FAQ | Réécrire | `portail`, ≥ 40 questions en seed (§11) — Bloc B |
| DRAPs | À valider DGAP | Signification/contenu à clarifier avec la DGAP |

## Publications identifiées

| Document | Statut |
|---|---|
| Loi 2006-34 modifiant la loi 72-23 | Reprendre (texte à obtenir en source officielle, pas depuis le HTML de l'ancien site) |
| Loi 72-23 du 9 avril 1972 relative au statut du personnel | Reprendre (idem) |
| Avis de concours direct — Agents administratifs | Réécrire (gabarit d'avis à standardiser, Bloc E) |
| Avis de concours direct — Inspecteurs | Réécrire (idem) |

## Actualités identifiées (exemples)

Formation de cadres pénitentiaires de la RDC · Visite du Gouverneur de Dakar Al
Hassan Sall · Visite du DAP à Koutal / IRAP Saint-Louis-Louga / CPFI — **à réécrire
avec date exacte confirmée par la DGAP** avant seed (Bloc B) ; à ce stade, la date
utilisée dans le seed est un placeholder explicite.

## Médias

> Les images de l'ancien site sont récupérables sous
> `https://administrationpenitentiaire.sn/wp-content/uploads/…`. Le script
> `backend/scripts/migrate_assets.py` (aspiration + optimisation WebP/AVIF + dépôt
> MinIO) est **prévu mais non implémenté en Phase 0** — voir le stub dans le script
> lui-même. Rappel impératif (§16) : ne jamais hotlinker l'ancien domaine en
> production, toujours réhéberger.

## Ce qui n'est pas repris

Thème Ovathemes/Elementor, Slider Revolution, jQuery, tout plugin WordPress : hors
périmètre technique (§16 — stack imposée Django/React), aucune tentative de reprise
de code ou de gabarit visuel de l'ancien site.
