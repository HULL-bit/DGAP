import type { Variants, Transition } from 'framer-motion'
import { motion as motionTokens } from '../styles/tokens'

/**
 * Detecte prefers-reduced-motion. Utilisé par les composants pour désactiver
 * toute translation/opacité non essentielle (§3.4 — accessibilité obligatoire).
 */
export function preferesMouvementReduit(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const transitionBase: Transition = {
  duration: motionTokens.dureeSectionMs / 1000,
  ease: [0.16, 1, 0.3, 1],
}

/** Fondu + léger translate-y à l'apparition au scroll (whileInView, once: true). */
export const apparitionSection: Variants = {
  hidden: { opacity: 0, y: motionTokens.translateYApparitionPx },
  visible: { opacity: 1, y: 0, transition: transitionBase },
}

/** Réveil séquentiel léger d'une grille de cartes (stagger 40-60ms). */
export function conteneurEnCascade(stagger = motionTokens.staggerMs / 1000) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  } satisfies Variants
}

export const elementEnCascade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: motionTokens.dureeMicroMs / 1000, ease: [0.16, 1, 0.3, 1] } },
}

/** Élévation subtile au survol des cartes (ombre + translate-y -2px). */
export const survolCarte = {
  whileHover: { y: -2, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } },
}

/** Props whileInView prêtes à l'emploi, respectant prefers-reduced-motion. */
export function propsApparition(reduitOverride?: boolean) {
  const reduit = reduitOverride ?? preferesMouvementReduit()
  if (reduit) return { initial: 'visible', animate: 'visible', variants: apparitionSection }
  return {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, margin: '-80px' },
    variants: apparitionSection,
  }
}
