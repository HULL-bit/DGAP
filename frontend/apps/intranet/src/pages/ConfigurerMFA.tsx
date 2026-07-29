import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Bouton, ChampTexte, propsApparition } from '@dgap/ui'
import { useAuth } from '../auth/AuthContext'

interface ReponseInscription {
  cle_secrete: string
  qr_code_png_base64: string
}

/**
 * Étape obligatoire pour tout compte interne avant accès à l'intranet (§6.3) —
 * atteignable même sans MFA active grâce au jeton « bootstrap » (voir
 * `core.permissions.MFAConfirmee` côté API : seuls `/auth/moi` et cette inscription
 * sont autorisés tant que la double authentification n'est pas activée).
 */
export function ConfigurerMFA() {
  const { rafraichirProfil } = useAuth()
  const [inscription, setInscription] = useState<ReponseInscription | null>(null)
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    requeteApi<ReponseInscription>('/auth/mfa/inscription', { method: 'POST' })
      .then(setInscription)
      .catch(() => setErreur("Impossible de générer le QR code. Réessayez."))
  }, [])

  async function confirmer(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi('/auth/mfa/confirmation', {
        method: 'POST',
        body: JSON.stringify({ code_totp: code }),
      })
      await rafraichirProfil()
    } catch {
      setErreur('Code invalide. Vérifiez votre application et réessayez.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-tint px-6 dark:bg-surface-dark">
      <motion.div
        className="w-full max-w-md rounded-carte border border-border bg-white p-8 shadow-portee dark:border-border-dark dark:bg-surface-dark-alt"
        {...propsApparition()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-tint text-primary dark:bg-white/5">
            <ShieldCheck size={26} aria-hidden="true" />
          </span>
          <h1 className="font-titre text-xl font-bold text-text-strong dark:text-text-inv-strong">
            Activer la double authentification
          </h1>
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Obligatoire pour tous les comptes internes avant d'accéder à l'intranet (§6.3).
          </p>
        </div>

        {inscription && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <img
              src={`data:image/png;base64,${inscription.qr_code_png_base64}`}
              alt="QR code à scanner avec votre application d'authentification"
              className="h-48 w-48 rounded-carte border border-border dark:border-border-dark"
            />
            <details className="w-full">
              <summary className="cursor-pointer font-corps text-xs text-text-muted dark:text-text-inv-muted">
                Saisie manuelle
              </summary>
              <code className="mt-2 block break-all rounded-bouton bg-surface-tint p-2 font-mono text-xs dark:bg-white/5 dark:text-text-inv-body">
                {inscription.cle_secrete}
              </code>
            </details>
          </div>
        )}

        <form onSubmit={confirmer} className="mt-6 flex flex-col gap-4" noValidate>
          <ChampTexte
            etiquette="Code à 6 chiffres"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {erreur && (
            <p role="alert" className="font-corps text-sm text-error">
              {erreur}
            </p>
          )}
          <Bouton type="submit" disabled={enCours || !inscription} className="justify-center">
            {enCours ? 'Vérification…' : 'Activer'}
          </Bouton>
        </form>
      </motion.div>
    </div>
  )
}
