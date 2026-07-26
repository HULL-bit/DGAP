import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { preferesMouvementReduit } from '../motion/presets'

export interface CompteurAnimeProps {
  valeur: number
  libelle: string
  suffixe?: string
  /** Valeur non validée par la DGAP — affichée avec une mention explicite (§14.3). */
  provisoire?: boolean
}

/** Compteur de chiffre clé qui s'incrémente une fois visible (§3.4). Statique si mouvement réduit. */
export function CompteurAnime({ valeur, libelle, suffixe = '', provisoire = false }: CompteurAnimeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { once: true, margin: '-40px' })
  const [affichage, setAffichage] = useState(preferesMouvementReduit() ? valeur : 0)

  useEffect(() => {
    if (!visible || preferesMouvementReduit()) return
    const duree = 900
    const debut = performance.now()
    let frame: number
    const etape = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / duree)
      const progression = 1 - Math.pow(1 - t, 3) // ease-out
      setAffichage(Math.round(progression * valeur))
      if (t < 1) frame = requestAnimationFrame(etape)
    }
    frame = requestAnimationFrame(etape)
    return () => cancelAnimationFrame(frame)
  }, [visible, valeur])

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <span className="font-titre text-4xl font-bold text-primary" aria-live="off">
        {affichage.toLocaleString('fr-SN')}
        {suffixe}
      </span>
      <span className="font-corps text-sm text-text-muted dark:text-text-inv-muted">{libelle}</span>
      {provisoire && (
        <span className="font-corps text-xs italic text-text-muted dark:text-text-inv-muted">Valeur provisoire — à valider</span>
      )}
    </div>
  )
}
