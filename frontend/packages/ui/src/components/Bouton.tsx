import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

export type VarianteBouton = 'primaire' | 'secondaire' | 'discret'
export type TailleBouton = 'sm' | 'md' | 'lg'

export interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton
  taille?: TailleBouton
}

const stylesVariante: Record<VarianteBouton, string> = {
  primaire: 'bg-primary text-white hover:bg-primary-hover',
  secondaire:
    'bg-white text-primary border border-primary hover:bg-surface-tint dark:bg-transparent dark:text-accent-soft dark:border-accent-soft/60 dark:hover:bg-white/5',
  discret: 'bg-transparent text-primary hover:bg-surface-tint dark:text-accent-soft dark:hover:bg-white/5',
}

const stylesTaille: Record<TailleBouton, string> = {
  sm: 'text-sm px-3 py-2 min-h-[36px]',
  md: 'text-base px-4 py-2.5 min-h-[44px]',
  lg: 'text-base px-6 py-3 min-h-[48px]',
}

/**
 * Bouton institutionnel. Cible tactile >= 44px par défaut (taille md), focus visible
 * par anneau --color-accent (§3.1). Aucune icône emoji : n'accepte que des icônes Lucide.
 */
export const Bouton = forwardRef<HTMLButtonElement, BoutonProps>(function Bouton(
  { variante = 'primaire', taille = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-bouton font-titre font-semibold',
        'transition-[transform,box-shadow,background-color] duration-200 ease-dgap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        stylesVariante[variante],
        stylesTaille[taille],
        className,
      )}
      {...props}
    />
  )
})
