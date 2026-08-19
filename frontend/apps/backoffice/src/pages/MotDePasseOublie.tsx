import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Bouton, ChampTexte, EmblemeCouleur, propsApparition } from '@dgap/ui'

export function MotDePasseOublie() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnCours(true)
    try {
      await requeteApi('/auth/mot-de-passe-oublie', { method: 'POST', body: JSON.stringify({ email }) })
    } finally {
      // Message générique affiché que l'adresse corresponde ou non à un compte
      // (voir DemandeReinitialisationMotDePasseView côté API) — pas de branche d'erreur distincte.
      setEnvoye(true)
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
            Mot de passe oublié
          </h1>
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Saisissez votre adresse e-mail professionnelle : un lien de réinitialisation vous sera envoyé.
          </p>
        </div>

        {envoye ? (
          <p className="mt-8 flex items-start gap-2 rounded-bouton border border-border bg-surface-tint px-3 py-3 font-corps text-sm text-text-body dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body">
            <Mail size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary dark:text-accent-soft" />
            Si cette adresse correspond à un compte, un e-mail de réinitialisation vient de vous être envoyé.
          </p>
        ) : (
          <form onSubmit={soumettre} className="mt-8 flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Adresse e-mail professionnelle"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Bouton type="submit" disabled={enCours} className="mt-2 justify-center gap-2">
              {enCours ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </Bouton>
          </form>
        )}

        <Link
          to="/connexion"
          className="mt-6 inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Retour à la connexion
        </Link>
      </motion.div>
    </div>
  )
}
