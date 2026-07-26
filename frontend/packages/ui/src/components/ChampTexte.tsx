import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface ChampTexteProps extends InputHTMLAttributes<HTMLInputElement> {
  etiquette: string
  erreur?: string
  aide?: string
}

/**
 * Champ de formulaire normalisé — étiquette toujours visible, message d'erreur
 * lié par aria-describedby et affiché sous le champ (§3.2, RGAA).
 */
export const ChampTexte = forwardRef<HTMLInputElement, ChampTexteProps>(function ChampTexte(
  { etiquette, erreur, aide, id, className, ...props },
  ref,
) {
  const idGenere = useId()
  const idChamp = id ?? idGenere
  const idErreur = `${idChamp}-erreur`
  const idAide = `${idChamp}-aide`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idChamp} className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
        {etiquette}
      </label>
      {aide && (
        <span id={idAide} className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
          {aide}
        </span>
      )}
      <input
        ref={ref}
        id={idChamp}
        aria-invalid={Boolean(erreur)}
        aria-describedby={clsx(aide && idAide, erreur && idErreur) || undefined}
        className={clsx(
          'min-h-[44px] rounded-bouton border bg-white px-3 py-2 font-corps text-base text-text-body',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'dark:bg-white/5 dark:text-text-inv-body',
          erreur ? 'border-error' : 'border-border dark:border-border-dark',
          className,
        )}
        {...props}
      />
      {erreur && (
        <span id={idErreur} role="alert" className="font-corps text-sm text-error">
          {erreur}
        </span>
      )}
    </div>
  )
})
