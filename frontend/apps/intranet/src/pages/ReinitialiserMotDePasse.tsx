import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, EmblemeCouleur, propsApparition } from '@dgap/ui'

export function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const jeton = searchParams.get('jeton') ?? ''

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [reussi, setReussi] = useState(false)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)

    if (nouveauMotDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne correspondent pas.')
      return
    }

    setEnCours(true)
    try {
      await requeteApi('/auth/mot-de-passe-oublie/confirmation', {
        method: 'POST',
        body: JSON.stringify({ uid, jeton, nouveau_mot_de_passe: nouveauMotDePasse }),
      })
      setReussi(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(
          err.probleme.erreurs_champs?.nouveau_mot_de_passe?.[0] ??
            err.probleme.detail ??
            "Ce lien de réinitialisation est invalide ou a expiré.",
        )
      } else {
        setErreur('Une erreur est survenue. Veuillez réessayer.')
      }
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-tint px-6 dark:bg-surface-dark">
      <motion.div
        className="w-full max-w-sm rounded-carte border border-border bg-white p-8 shadow-portee dark:border-border-dark dark:bg-surface-dark-alt"
        {...propsApparition()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <EmblemeCouleur className="h-16 w-auto" aria-hidden="true" />
          <h1 className="font-titre text-xl font-bold text-text-strong dark:text-text-inv-strong">
            Nouveau mot de passe
          </h1>
        </div>

        {reussi ? (
          <>
            <p className="mt-8 flex items-start gap-2 rounded-bouton border border-border bg-surface-tint px-3 py-3 font-corps text-sm text-text-body dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body">
              <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
              Votre mot de passe a été réinitialisé avec succès.
            </p>
            <Link
              to="/connexion"
              className="mt-6 inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Se connecter
            </Link>
          </>
        ) : (
          <form onSubmit={soumettre} className="mt-8 flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Nouveau mot de passe"
              type="password"
              required
              autoComplete="new-password"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
            />
            <ChampTexte
              etiquette="Confirmer le mot de passe"
              type="password"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />

            {erreur && (
              <p role="alert" className="font-corps text-sm text-error">
                {erreur}
              </p>
            )}

            <Bouton type="submit" disabled={enCours || !uid || !jeton} className="mt-2 justify-center gap-2">
              {enCours ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
            </Bouton>
          </form>
        )}
      </motion.div>
    </div>
  )
}
