import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, Clock, XCircle, AlertTriangle, Circle } from 'lucide-react'
import clsx from 'clsx'

export type TonBadge = 'succes' | 'attente' | 'erreur' | 'alerte' | 'neutre'

const config: Record<TonBadge, { icone: LucideIcon; classes: string }> = {
  succes: { icone: CheckCircle2, classes: 'bg-success/10 text-success' },
  attente: { icone: Clock, classes: 'bg-info/10 text-info' },
  erreur: { icone: XCircle, classes: 'bg-error/10 text-error' },
  alerte: { icone: AlertTriangle, classes: 'bg-warning/10 text-warning' },
  neutre: { icone: Circle, classes: 'bg-surface-muted text-text-muted dark:bg-white/10 dark:text-text-inv-muted' },
}

export interface BadgeProps {
  ton: TonBadge
  libelle: string
}

/**
 * Badge de statut = fond teinté doux + libellé + icône linéaire Lucide (§3.3).
 * Jamais d'emoji ni de pastille de couleur seule : le libellé texte porte toujours l'information.
 */
export function Badge({ ton, libelle }: BadgeProps) {
  const { icone: Icone, classes } = config[ton]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium font-corps',
        classes,
      )}
    >
      <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
      {libelle}
    </span>
  )
}
