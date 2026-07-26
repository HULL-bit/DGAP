# Accessibilité — RGAA 4 / WCAG 2.1 AA

## Approche

L'accessibilité est traitée **dans** les composants du design system
(`@dgap/ui`), pas ajoutée après coup :

- Focus visible systématique (`focus-visible:ring-2 focus-visible:ring-accent`) sur
  tous les éléments interactifs (`Bouton`, liens de navigation, champ de recherche).
- Cibles tactiles ≥ 44 px (`min-h-[44px]` sur `Bouton` taille `md`/`lg` et sur
  `ChampTexte`).
- Étiquettes de formulaire toujours visibles (`ChampTexte` associe `<label>` et
  `htmlFor`), messages d'erreur liés par `aria-describedby` + `role="alert"`, affichés
  **sous** le champ.
- Icônes décoratives `aria-hidden="true"` ; icônes porteuses de sens accompagnées d'un
  libellé texte (`EnTeteEtat`, `CarteAction`).
- Lien d'évitement (« Aller au contenu principal ») présent dans les 4 applications
  (`App.tsx` de chaque app), premier élément focusable de la page.
- Menu mobile accessible au clavier (`aria-expanded`, `aria-controls`,
  `aria-label` dynamique) dans `EnTeteEtat`.
- Contrastes : tous les tokens de couleur (`@dgap/ui/src/styles/tokens.ts`) sont repris
  du Cahier des charges, qui les présente comme vérifiés AA — **à re-vérifier
  formellement avec un outil de contraste dès que les compositions réelles (fonds,
  superpositions) existent**, ce qui n'a pas de sens sur des pages encore vides.
- Animations : tous les presets Framer Motion (`@dgap/ui/src/motion/presets.ts`)
  respectent `prefers-reduced-motion` via `preferesMouvementReduit()` — voir
  `propsApparition()`, utilisé par `Accueil.tsx` du portail.
- Chaque graphique devra avoir une alternative tabulaire (§3.2) — non applicable
  tant qu'aucun graphique réel n'existe (Bloc F, tableaux de bord statistiques).

## Bibliothèque d'icônes

Un seul set, Lucide (`lucide-react`), utilisé partout où une icône apparaît (`Badge`,
`CarteAction`, `EnTeteEtat`). Aucun emoji dans l'interface — voir §16 du cahier des
charges (interdiction explicite), respectée dans tout le code produit à ce stade.

## Tests

- **Automatisés** : Storybook est configuré avec `@storybook/addon-a11y`
  (`a11y: { test: 'error' }` dans `.storybook/preview.ts`) — toute story qui viole une
  règle axe-core fait échouer `pnpm build-storybook`, donc la CI.
- **CI** : le pipeline (`.github/workflows/ci.yml`) prévoit une étape `axe` sur les
  pages construites — à activer une fois qu'il existe des pages réelles à tester
  (au-delà du placeholder actuel), pour éviter un faux sentiment de couverture sur du
  contenu vide.
- **Manuel** : parcours clavier seul + lecteur d'écran (CR-A-08 du cahier) — à mener
  sur le parcours « demande de visite » quand il sera construit (Bloc D). Non
  applicable en Phase 0 (aucun formulaire métier encore livré).

## Déclaration d'accessibilité

À publier sur le portail (`/accessibilite`, lien déjà présent dans `PiedDePage`) une
fois un audit RGAA réel mené sur le contenu du Bloc B. Le lien existe dans le pied de
page dès maintenant ; la page elle-même reste à écrire — ne pas publier de déclaration
de conformité qui ne reflète pas un audit réellement effectué.
