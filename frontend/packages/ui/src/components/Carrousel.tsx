import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { preferesMouvementReduit } from '../motion/presets'

export interface CarrouselProps {
  children: ReactNode
  /** Libellé accessible de la région (ex. « Vos démarches », « Actualité »). */
  label: string
  className?: string
  /** Défilement automatique lent, en boucle, en pause au survol/focus/toucher (défaut : activé). */
  defilementAuto?: boolean
}

/**
 * Rail horizontal à défilement natif (scroll-snap). Défilement automatique **lent**
 * en boucle (jamais rapide — interdit §3.4/§16), mis en pause dès que l'utilisateur
 * survole, prend le focus ou touche le rail, et entièrement désactivé sous
 * `prefers-reduced-motion`. Navigation alternative : molette, clavier, boutons
 * précédent/suivant. Chaque enfant doit porter `snap-start shrink-0`.
 */
export function Carrousel({ children, label, className, defilementAuto = true }: CarrouselProps) {
  const pisteRef = useRef<HTMLDivElement>(null)
  const [peutReculer, setPeutReculer] = useState(false)
  const [peutAvancer, setPeutAvancer] = useState(false)
  const [progression, setProgression] = useState(0)
  const [enPause, setEnPause] = useState(false)

  const mettreAJourEtat = useCallback(() => {
    const piste = pisteRef.current
    if (!piste) return
    const maxScroll = piste.scrollWidth - piste.clientWidth
    setPeutReculer(piste.scrollLeft > 8)
    setPeutAvancer(piste.scrollLeft < maxScroll - 8)
    setProgression(maxScroll > 0 ? piste.scrollLeft / maxScroll : 0)
  }, [])

  useEffect(() => {
    mettreAJourEtat()
    const piste = pisteRef.current
    if (!piste) return
    piste.addEventListener('scroll', mettreAJourEtat, { passive: true })
    window.addEventListener('resize', mettreAJourEtat)
    return () => {
      piste.removeEventListener('scroll', mettreAJourEtat)
      window.removeEventListener('resize', mettreAJourEtat)
    }
  }, [mettreAJourEtat])

  // Défilement automatique lent (~24px/s), boucle douce, jamais sous mouvement réduit.
  useEffect(() => {
    if (!defilementAuto || enPause || preferesMouvementReduit()) return
    const piste = pisteRef.current
    if (!piste) return

    let idFrame: number
    let dernier = performance.now()

    const etape = (maintenant: number) => {
      const delta = maintenant - dernier
      dernier = maintenant
      const maxScroll = piste.scrollWidth - piste.clientWidth
      if (maxScroll <= 0) {
        idFrame = requestAnimationFrame(etape)
        return
      }
      if (piste.scrollLeft >= maxScroll - 1) {
        piste.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        piste.scrollLeft += (delta / 1000) * 24
      }
      idFrame = requestAnimationFrame(etape)
    }

    idFrame = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(idFrame)
  }, [defilementAuto, enPause])

  function defiler(direction: 1 | -1) {
    const piste = pisteRef.current
    if (!piste) return
    const distance = Math.min(piste.clientWidth * 0.85, 420)
    piste.scrollBy({ left: direction * distance, behavior: 'smooth' })
  }

  return (
    <div
      className={clsx('relative', className)}
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocus={() => setEnPause(true)}
      onBlur={() => setEnPause(false)}
      onTouchStart={() => setEnPause(true)}
    >
      <div className="relative">
        {/* Fondus de bord — signalent qu'il y a davantage de contenu à défiler */}
        <div
          aria-hidden="true"
          className={clsx(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-surface-tint to-transparent transition-opacity duration-200 dark:from-surface-dark',
            peutReculer ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          aria-hidden="true"
          className={clsx(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface-tint to-transparent transition-opacity duration-200 dark:from-surface-dark',
            peutAvancer ? 'opacity-100' : 'opacity-0',
          )}
        />

        <div
          ref={pisteRef}
          role="region"
          aria-label={label}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2
                     [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
        </div>
      </div>

      {/* Barre de progression fine — reflète la position de défilement */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-muted dark:bg-white/10" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${Math.max(12, progression * 100)}%` }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {peutReculer && (
        <button
          type="button"
          onClick={() => defiler(-1)}
          aria-label="Précédent"
          className="absolute -left-3 top-[38%] hidden -translate-y-1/2 items-center justify-center rounded-full
                     border border-border bg-white p-2.5 text-text-strong shadow-portee dark:border-border-dark dark:bg-surface-dark-alt dark:text-text-inv-strong
                     transition-transform duration-150 ease-dgap hover:scale-105 sm:flex
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}
      {peutAvancer && (
        <button
          type="button"
          onClick={() => defiler(1)}
          aria-label="Suivant"
          className="absolute -right-3 top-[38%] hidden -translate-y-1/2 items-center justify-center rounded-full
                     border border-border bg-white p-2.5 text-text-strong shadow-portee dark:border-border-dark dark:bg-surface-dark-alt dark:text-text-inv-strong
                     transition-transform duration-150 ease-dgap hover:scale-105 sm:flex
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
