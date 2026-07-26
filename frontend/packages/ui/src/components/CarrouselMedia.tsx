import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { preferesMouvementReduit } from '../motion/presets'

export type FondDiapositive =
  | { type: 'image'; src: string; alt: string }
  | { type: 'video'; srcMp4: string; srcWebm?: string; poster: string; alt: string }
  | { type: 'degrade'; de: string; a: string; alt: string }

export interface Diapositive {
  id: string
  fond: FondDiapositive
  survol: string
  titre: string
  href: string
  date?: string
}

export interface CarrouselMediaProps {
  diapositives: Diapositive[]
  /** Libellé accessible de la région (ex. « Actualité en images »). */
  label: string
  /** Délai d'avance automatique en ms — désactivé sous prefers-reduced-motion (§3.4/§3.5). */
  delaiMs?: number
}

/**
 * Héro média plein format (images/vidéos) pour mettre en avant le fil d'actualité.
 * Vidéos : muettes, `autoplay/loop/playsinline`, poster affiché en premier (LCP),
 * overlay sombre pour le contraste du texte (§3.5). Rotation lente avec pause au
 * survol/focus, jamais de défilement rapide (§16) ; bouton lecture/pause accessible ;
 * désactivée sous `prefers-reduced-motion` (première diapositive statique).
 */
export function CarrouselMedia({ diapositives, label, delaiMs = 6500 }: CarrouselMediaProps) {
  const [index, setIndex] = useState(0)
  const [enPause, setEnPause] = useState(() => preferesMouvementReduit())
  const minuteurRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = diapositives.length

  const suivant = useCallback(() => setIndex((i) => (i + 1) % total), [total])
  const precedent = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total])

  useEffect(() => {
    if (enPause || total <= 1) return
    minuteurRef.current = setInterval(suivant, delaiMs)
    return () => {
      if (minuteurRef.current) clearInterval(minuteurRef.current)
    }
  }, [enPause, delaiMs, suivant, total])

  const diapositive = diapositives[index]
  if (!diapositive) return null

  return (
    <section
      aria-label={label}
      className="group relative h-[82vh] max-h-[820px] min-h-[560px] w-full overflow-hidden bg-primary-dark"
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(preferesMouvementReduit())}
      onFocus={() => setEnPause(true)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={diapositive.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <FondMedia fond={diapositive.fond} actif={!enPause} />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-primary-dark/90 via-primary-dark/25 to-primary-dark/10"
          />
        </motion.div>
      </AnimatePresence>

      <div className="relative mx-auto flex h-full max-w-conteneur flex-col justify-end gap-4 px-6 pb-24 pt-28 sm:px-10">
        <span className="font-corps text-sm font-bold uppercase tracking-widest text-accent-soft">
          {diapositive.survol}
        </span>
        <a
          href={diapositive.href}
          className="max-w-4xl font-titre text-4xl font-bold leading-[1.05] text-white hover:underline sm:text-5xl lg:text-6xl
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {diapositive.titre}
        </a>
        {diapositive.date && (
          <time className="font-corps text-base text-white/70">
            {new Date(diapositive.date).toLocaleDateString('fr-SN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        )}
      </div>

      {/* Contrôles : lecture/pause, précédent/suivant, puces — toujours visibles au clavier/tactile */}
      <div className="absolute bottom-8 right-6 flex items-center gap-2 sm:right-10">
        <button
          type="button"
          onClick={() => setEnPause((p) => !p)}
          aria-label={enPause ? 'Reprendre le défilement' : 'Mettre en pause le défilement'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm
                     transition-colors duration-150 hover:bg-white/25
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {enPause ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={precedent}
          aria-label="Diapositive précédente"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm
                     transition-colors duration-150 hover:bg-white/25
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={suivant}
          aria-label="Diapositive suivante"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm
                     transition-colors duration-150 hover:bg-white/25
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="absolute bottom-9 left-6 flex items-center gap-2 sm:left-10">
        {diapositives.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Aller à la diapositive ${i + 1} sur ${total}`}
            aria-current={i === index ? 'true' : undefined}
            className={`h-1.5 rounded-full transition-all duration-300 ease-dgap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                       ${i === index ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </section>
  )
}

function FondMedia({ fond, actif }: { fond: FondDiapositive; actif: boolean }) {
  if (fond.type === 'image') {
    return <img src={fond.src} alt={fond.alt} className="h-full w-full object-cover" />
  }
  if (fond.type === 'video') {
    return (
      <video
        className="h-full w-full object-cover"
        poster={fond.poster}
        autoPlay={actif && !preferesMouvementReduit()}
        muted
        loop
        playsInline
        aria-label={fond.alt}
      >
        <source src={fond.srcWebm} type="video/webm" />
        <source src={fond.srcMp4} type="video/mp4" />
      </video>
    )
  }
  return (
    <div
      role="img"
      aria-label={fond.alt}
      className="relative h-full w-full"
      style={{ background: `linear-gradient(135deg, ${fond.de}, ${fond.a})` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)',
          backgroundSize: '48px 48px, 64px 64px',
        }}
      />
    </div>
  )
}
