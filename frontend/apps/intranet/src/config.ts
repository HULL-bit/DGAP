/**
 * Base des liens inter-applications (intranet -> back-office). Jamais codée en dur
 * sur le domaine de production : `VITE_BACKOFFICE_URL` vaut `https://admin.localhost`
 * en dev (voir .env.example) et `https://admin.administrationpenitentiaire.sn` une
 * fois déployé.
 */
export const URL_BACKOFFICE = import.meta.env.VITE_BACKOFFICE_URL ?? 'https://admin.localhost'
