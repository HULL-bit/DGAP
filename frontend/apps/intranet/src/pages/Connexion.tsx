import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { Bouton, ChampTexte, EmblemeCouleur, propsApparition } from '@dgap/ui'
import { useAuth, ApiError } from '../auth/AuthContext'

export function Connexion() {
  const { utilisateur, connexion } = useAuth()
  const location = useLocation() as { state?: { depuis?: string } }
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [codeTotp, setCodeTotp] = useState('')
  const [demanderTotp, setDemanderTotp] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  if (utilisateur) {
    return <Navigate to={location.state?.depuis ?? '/'} replace />
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await connexion(email, motDePasse, codeTotp)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs?.mfa) {
        setDemanderTotp(true)
        setErreur(err.probleme.erreurs_champs.mfa[0] ?? null)
      } else if (err instanceof ApiError) {
        setErreur(err.probleme.detail ?? 'Identifiants incorrects.')
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
            Intranet DGAP
          </h1>
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Accès réservé aux agents habilités.
          </p>
        </div>

        <form onSubmit={soumettre} className="mt-8 flex flex-col gap-4" noValidate>
          <ChampTexte
            etiquette="Adresse e-mail professionnelle"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <ChampTexte
            etiquette="Mot de passe"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          {demanderTotp && (
            <ChampTexte
              etiquette="Code d'authentification à deux facteurs"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codeTotp}
              onChange={(e) => setCodeTotp(e.target.value)}
              aide="Un code déjà utilisé est refusé même s'il est encore affiché : attendez qu'un nouveau code apparaisse dans votre application avant de réessayer."
            />
          )}

          {erreur && (
            <p role="alert" className="font-corps text-sm text-error">
              {erreur}
            </p>
          )}

          <Bouton type="submit" disabled={enCours} className="mt-2 justify-center gap-2">
            <LogIn size={18} aria-hidden="true" />
            {enCours ? 'Connexion…' : 'Se connecter'}
          </Bouton>
        </form>

        <Link
          to="/mot-de-passe-oublie"
          className="mt-4 block text-center font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
        >
          Mot de passe oublié ?
        </Link>
      </motion.div>
    </div>
  )
}
