/**
 * Design tokens officiels DGAP — source unique de vérité.
 * Repris à l'identique dans le preset Tailwind (@dgap/config) et exportés en JSON
 * pour tout outil externe (maquettes, DesignSync).
 */

export const couleurs = {
  primary: '#0B6E4F',
  primaryHover: '#095C42',
  primaryDark: '#123524',
  accent: '#C9A227',
  accentSoft: '#E9D9A0',
  surfaceWhite: '#FFFFFF',
  surfaceTint: '#F2F7F4',
  surfaceMuted: '#E8EFEA',
  textStrong: '#123524',
  textBody: '#1F2A24',
  textMuted: '#5B6B62',
  border: '#D9E3DC',
  success: '#1B7F3B',
  warning: '#B8860B',
  error: '#B00020',
  info: '#0B5FA5',
  // Rappel héraldique — réservé à l'emblème et aux filets décoratifs, jamais au texte courant.
  snGreen: '#00853F',
  snYellow: '#FDEF42',
  snRed: '#E31B23',
} as const

export const typographie = {
  policeTitres: "'Marianne', 'Public Sans', system-ui, sans-serif",
  policeTexte: "'Inter', 'Source Sans 3', system-ui, sans-serif",
  tailleBaseCorps: '16px',
  interligneCorps: 1.5,
  graisseTitres: [600, 700] as const,
} as const

export const grille = {
  colonnes: 12,
  gouttierePx: 24,
  // Élargi à la demande de la DGAP pour une présence plus généreuse à l'écran
  // (nav, héros, carrousels) — dépasse le 1200px initial du cahier des charges.
  conteneurMaxPx: 1600,
} as const

export const pointsDeRupture = {
  sm: 360,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

export const rayons = {
  carte: '12px',
  bouton: '8px',
} as const

export const ombres = {
  legere: '0 1px 2px rgba(18, 53, 36, 0.08)',
  portee: '0 4px 12px rgba(18, 53, 36, 0.12)',
} as const

export const focus = {
  couleur: couleurs.accent,
  epaisseurPx: 2,
} as const

export const motion = {
  dureeMicroMs: 200,
  dureeSectionMs: 400,
  courbe: 'cubic-bezier(0.16, 1, 0.3, 1)',
  translateYApparitionPx: 12,
  staggerMs: 50,
} as const

export const tokens = {
  couleurs,
  typographie,
  grille,
  pointsDeRupture,
  rayons,
  ombres,
  focus,
  motion,
} as const

export type Tokens = typeof tokens
export default tokens
