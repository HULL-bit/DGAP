import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { ChampTexte, Bouton, propsApparition } from '@dgap/ui'
import type { ContactAccuse } from '../types/api'

interface FormulaireContact {
  nom: string
  email: string
  telephone: string
  sujet: string
  message: string
}

const FORMULAIRE_VIDE: FormulaireContact = { nom: '', email: '', telephone: '', sujet: '', message: '' }

export function Contact() {
  const [champs, setChamps] = useState<FormulaireContact>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireContact, string>>>({})
  const [enEnvoi, setEnEnvoi] = useState(false)
  const [accuse, setAccuse] = useState<ContactAccuse | null>(null)
  const [erreurGenerale, setErreurGenerale] = useState<string | null>(null)

  function majChamp(champ: keyof FormulaireContact, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreurGenerale(null)
    setErreurs({})
    setEnEnvoi(true)
    try {
      const reponse = await requeteApi<ContactAccuse>('/contacts', {
        method: 'POST',
        body: JSON.stringify(champs),
      })
      setAccuse(reponse)
      setChamps(FORMULAIRE_VIDE)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireContact, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireContact] = messages[0]
        }
        setErreurs(parChamp)
      } else {
        setErreurGenerale("Votre message n'a pas pu être envoyé. Veuillez réessayer.")
      }
    } finally {
      setEnEnvoi(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Contact — Direction Générale de l'Administration Pénitentiaire</title>
        <meta name="description" content="Contactez la Direction Générale de l'Administration Pénitentiaire." />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Nous contacter
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Un accusé de réception avec numéro de suivi vous est délivré immédiatement.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
        <div className="max-w-xl">
          {accuse ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-carte border border-success/30 bg-success/5 p-6"
            >
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 size={20} aria-hidden="true" />
                <p className="font-titre text-base font-semibold">Message envoyé</p>
              </div>
              <p className="mt-3 font-corps text-sm text-text-body dark:text-text-inv-body">
                Votre numéro de suivi :{' '}
                <strong className="font-mono text-text-strong dark:text-text-inv-strong">{accuse.numero_ticket}</strong>
              </p>
              <button
                type="button"
                onClick={() => setAccuse(null)}
                className="mt-4 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                Envoyer un autre message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={soumettre} className="flex flex-col gap-5" noValidate>
              <ChampTexte
                etiquette="Nom complet"
                required
                value={champs.nom}
                onChange={(e) => majChamp('nom', e.target.value)}
                erreur={erreurs.nom}
              />
              <ChampTexte
                etiquette="Adresse e-mail"
                type="email"
                required
                value={champs.email}
                onChange={(e) => majChamp('email', e.target.value)}
                erreur={erreurs.email}
              />
              <ChampTexte
                etiquette="Téléphone (facultatif)"
                type="tel"
                value={champs.telephone}
                onChange={(e) => majChamp('telephone', e.target.value)}
                erreur={erreurs.telephone}
              />
              <ChampTexte
                etiquette="Sujet"
                required
                value={champs.sujet}
                onChange={(e) => majChamp('sujet', e.target.value)}
                erreur={erreurs.sujet}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="message" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={champs.message}
                  onChange={(e) => majChamp('message', e.target.value)}
                  className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                />
                {erreurs.message && (
                  <span role="alert" className="font-corps text-sm text-error">
                    {erreurs.message}
                  </span>
                )}
              </div>

              {erreurGenerale && (
                <p role="alert" className="font-corps text-sm text-error">
                  {erreurGenerale}
                </p>
              )}

              <Bouton type="submit" disabled={enEnvoi}>
                {enEnvoi ? 'Envoi en cours…' : 'Envoyer'}
              </Bouton>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
