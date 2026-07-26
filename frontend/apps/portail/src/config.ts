/**
 * Base des liens inter-applications (portail -> démarches). Jamais codée en dur sur
 * le domaine de production : `VITE_DEMARCHES_URL` vaut `https://demarches.localhost`
 * en dev (voir .env.example) et `https://demarches.administrationpenitentiaire.sn`
 * une fois déployé.
 */
export const URL_DEMARCHES = import.meta.env.VITE_DEMARCHES_URL ?? 'https://demarches.localhost'
