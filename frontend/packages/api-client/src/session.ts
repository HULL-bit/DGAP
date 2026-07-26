/**
 * Gestion des jetons JWT côté client (§6.3 — accès courts, 15 min). Le jeton de
 * rafraîchissement est persisté (reprise de session après rechargement) ; le jeton
 * d'accès reste en mémoire uniquement. Consommé par `requeteApi` pour l'en-tête
 * `Authorization` et le rafraîchissement automatique sur 401.
 */

const CLE_JETON_RAFRAICHISSEMENT = 'dgap-jeton-rafraichissement'

let jetonAcces: string | null = null

export function definirJetons(jetons: { access: string; refresh?: string }): void {
  jetonAcces = jetons.access
  if (jetons.refresh && typeof window !== 'undefined') {
    window.localStorage.setItem(CLE_JETON_RAFRAICHISSEMENT, jetons.refresh)
  }
}

export function effacerJetons(): void {
  jetonAcces = null
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CLE_JETON_RAFRAICHISSEMENT)
  }
}

export function obtenirJetonAcces(): string | null {
  return jetonAcces
}

export function obtenirJetonRafraichissement(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CLE_JETON_RAFRAICHISSEMENT)
}

export function estConnecte(): boolean {
  return Boolean(obtenirJetonRafraichissement())
}
