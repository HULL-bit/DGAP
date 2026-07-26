import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './fr.json'
import en from './en.json'

export const LANGUES_DISPONIBLES = ['fr', 'en'] as const
export type Langue = (typeof LANGUES_DISPONIBLES)[number]

const CLE_STOCKAGE_LANGUE = 'dgap-langue'

function langueInitiale(): Langue {
  if (typeof window === 'undefined') return 'fr'
  const enregistree = window.localStorage.getItem(CLE_STOCKAGE_LANGUE)
  return enregistree === 'en' ? 'en' : 'fr'
}

/**
 * Instance i18next partagée. Chaque application (portail/démarches/intranet/backoffice)
 * l'importe et peut fusionner ses propres namespaces via i18n.addResourceBundle.
 * Français par défaut, socle bilingue FR/EN — langue choisie persistée localement.
 */
export function creerI18n() {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: { fr: { translation: fr }, en: { translation: en } },
      lng: langueInitiale(),
      fallbackLng: 'fr',
      interpolation: { escapeValue: false },
    })
  }
  return i18n
}

export function definirLangue(langue: Langue) {
  i18n.changeLanguage(langue)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CLE_STOCKAGE_LANGUE, langue)
  }
}

export default i18n
export { fr, en }
