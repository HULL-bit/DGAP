# ADR 0001 — Rendu SEO du portail public sans Next.js

## Statut

Accepté (Phase 0).

## Contexte

Le cahier des charges impose React (Vite + TypeScript) pour l'ensemble des applications
frontales, mais exige aussi un SEO maximal sur le portail public (ENF/EF-111) — indexation
correcte par les moteurs, temps d'affichage du contenu sans exécution JS préalable,
partage social avec métadonnées correctes. Une SPA React pure, hydratée côté client
uniquement, pénalise ces deux exigences : le contenu n'existe dans le HTML qu'après
exécution du bundle JavaScript.

Le cahier suggérait initialement Next.js (SSR/SSG natif), mais la stack imposée pour ce
chantier reste React + Vite (pas de framework meta-React côté portail).

## Décision

Le portail institutionnel (`frontend/apps/portail`) sera **pré-rendu statiquement au
build** (SSG) : chaque route publique (accueil, rubriques, articles, fiches
établissement, etc.) est générée en HTML complet à la publication/au déploiement, puis
hydratée par React au chargement pour les interactions dynamiques.

Deux options restent ouvertes pour l'implémentation, à trancher au Bloc B lorsque les
pages éditoriales (CMS) existent réellement :

1. **`vite-plugin-ssr`** (ou son successeur `vike`) — génère un build SSG multi-pages à
   partir des routes React existantes, sans changer le modèle de composants.
2. **Prerendering post-build** (`vite-plugin-prerender` / Puppeteer headless au build) —
   plus simple à intégrer sur un existant, moins flexible pour des routes dynamiques
   nombreuses (ex. une fiche par établissement).

Les applications `demarches`, `intranet` et `backoffice` restent des SPA pures (aucune
exigence SEO ni indexation — `noindex` sur les deux dernières, §9.2) : seul le portail
public a besoin de ce traitement.

## Conséquences

- Le build du portail devient un peu plus long (génération HTML par route) et nécessite
  de connaître la liste des routes/contenus au moment du build — donc un appel à l'API
  pendant l'étape de build (ou un export de contenu), à concevoir au Bloc B avec le CMS.
- Les métadonnées (`react-helmet-async`, JSON-LD schema.org) doivent être résolues côté
  serveur/build, pas uniquement injectées après hydratation.
- Le choix précis (option 1 vs 2) sera acté dans une ADR de suivi (`0002-…`) une fois les
  pages éditoriales réelles disponibles, avec mesure effective du LCP/INP (§9.1).
