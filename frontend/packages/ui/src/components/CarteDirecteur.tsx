import { Mail, Phone } from 'lucide-react'
import { motion } from 'framer-motion'

export interface CarteDirecteurProps {
  nom: string
  fonction: string
  email?: string
  telephone?: string
}

function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0])
    .join('')
    .toUpperCase()
}

/**
 * Carte d'un directeur (central ou régional) — avatar en initiales (aucune photo
 * institutionnelle disponible en Phase 0, §14.3), nom, fonction, contacts directs.
 */
export function CarteDirecteur({ nom, fonction, email, telephone }: CarteDirecteurProps) {
  return (
    <motion.div
      className="flex flex-col gap-4 rounded-carte border border-border bg-white p-6 shadow-legere
                 transition-shadow duration-200 ease-dgap hover:shadow-portee
                 dark:border-border-dark dark:bg-surface-dark-alt"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        aria-hidden="true"
        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark font-titre text-lg font-bold text-white"
      >
        {initiales(nom)}
      </div>
      <div>
        <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">{nom}</p>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">{fonction}</p>
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4 dark:border-border-dark">
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 font-corps text-sm text-primary hover:underline dark:text-accent-soft"
          >
            <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="truncate">{email}</span>
          </a>
        )}
        {telephone && (
          <a
            href={`tel:${telephone.replace(/[^+\d]/g, '')}`}
            className="inline-flex items-center gap-2 font-corps text-sm text-text-body hover:text-primary dark:text-text-inv-body dark:hover:text-accent-soft"
          >
            <Phone size={16} strokeWidth={1.75} aria-hidden="true" />
            {telephone}
          </a>
        )}
      </div>
    </motion.div>
  )
}
