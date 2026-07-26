import type { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { survolCarte } from '../motion/presets'

type AttributsDivSansConflitMotion = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>

export interface CarteProps extends AttributsDivSansConflitMotion {
  interactive?: boolean
}

/** Carte de contenu générique — rayon 12px, ombre légère, élévation douce au survol si interactive. */
export function Carte({ interactive = false, className, children, ...props }: CarteProps) {
  return (
    <motion.div
      className={clsx(
        'rounded-carte border border-border bg-white p-6 shadow-legere dark:border-border-dark dark:bg-surface-dark-alt',
        interactive && 'hover:shadow-portee transition-shadow duration-200 ease-dgap',
        className,
      )}
      {...(interactive ? survolCarte : {})}
      {...props}
    >
      {children}
    </motion.div>
  )
}
