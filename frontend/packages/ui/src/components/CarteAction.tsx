import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export interface CarteActionProps {
  icone: LucideIcon
  titre: string
  description: string
  href: string
  /** Numéro d'ordre affiché en filigrane (ex. "01") — repère visuel, purement décoratif. */
  numero?: string
}

/**
 * Carte d'action du bloc « Vos démarches » (héro accueil, §7.1). Quatre instances
 * doivent apparaître sur toute page du portail : Demander une visite, S'inscrire à
 * un concours, Nous contacter, Trouver un établissement.
 */
export function CarteAction({ icone: Icone, titre, description, href, numero }: CarteActionProps) {
  return (
    <motion.a
      href={href}
      className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-carte border border-border
                 bg-white p-6 shadow-legere dark:border-border-dark dark:bg-surface-dark-alt
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      whileHover={{ y: -5, scale: 1.012 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Halo et liseré décoratifs qui apparaissent au survol — purement esthétiques */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-soft/0
                   transition-colors duration-300 ease-dgap group-hover:bg-accent-soft/40"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] scale-x-0 bg-gradient-to-r from-primary
                   to-accent transition-transform duration-300 ease-dgap group-hover:scale-x-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-carte border border-transparent
                   transition-colors duration-200 ease-dgap group-hover:border-primary/20"
      />

      <div className="relative flex items-start justify-between">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-tint text-primary
                     transition-all duration-200 ease-dgap group-hover:scale-110 group-hover:rounded-full
                     group-hover:bg-primary group-hover:text-white dark:bg-white/5"
        >
          <Icone size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
        {numero && (
          <span
            aria-hidden="true"
            className="font-titre text-3xl font-bold text-border transition-colors duration-200 ease-dgap group-hover:text-accent-soft"
          >
            {numero}
          </span>
        )}
      </div>

      <span className="relative font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">{titre}</span>
      <span className="relative font-corps text-sm leading-relaxed text-text-muted dark:text-text-inv-muted">
        {description}
      </span>
      <span className="relative mt-auto inline-flex items-center gap-1 font-corps text-sm font-medium text-primary">
        Accéder
        <ArrowRight
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="transition-transform duration-200 ease-dgap group-hover:translate-x-1"
        />
      </span>
    </motion.a>
  )
}
