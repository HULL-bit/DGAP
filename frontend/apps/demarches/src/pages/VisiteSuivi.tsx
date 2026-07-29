import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Download, HelpCircle, Search } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { ChampTexte, Bouton, propsApparition } from '@dgap/ui'
import type { DemandeVisiteStatutPublique } from '../types/api'

const LIBELLE_STATUT: Record<DemandeVisiteStatutPublique['statut'], string> = {
  SOUMISE: 'Soumise',
  EN_INSTRUCTION: 'En instruction',
  PIECES_MANQUANTES: 'Pièces manquantes',
  VALIDEE: 'Validée',
  REJETEE: 'Rejetée',
  PERMIS_DELIVRE: 'Permis délivré',
}

function urlBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
}

export function VisiteSuivi() {
  const [numero, setNumero] = useState('')
  const [code, setCode] = useState('')
  const [enRecherche, setEnRecherche] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [demande, setDemande] = useState<DemandeVisiteStatutPublique | null>(null)

  const [afficherRenvoi, setAfficherRenvoi] = useState(false)
  const [emailRenvoi, setEmailRenvoi] = useState('')
  const [enEnvoiRenvoi, setEnEnvoiRenvoi] = useState(false)
  const [messageRenvoi, setMessageRenvoi] = useState<string | null>(null)

  async function demanderRenvoi(e: FormEvent) {
    e.preventDefault()
    setEnEnvoiRenvoi(true)
    setMessageRenvoi(null)
    try {
      const reponse = await requeteApi<{ detail: string }>('/demandes-visite/renvoi', {
        method: 'POST',
        body: JSON.stringify({ email: emailRenvoi }),
      })
      setMessageRenvoi(reponse.detail)
    } catch {
      setMessageRenvoi("La demande n'a pas pu être envoyée. Veuillez réessayer.")
    } finally {
      setEnEnvoiRenvoi(false)
    }
  }

  async function rechercher(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setDemande(null)
    setEnRecherche(true)
    try {
      const reponse = await requeteApi<DemandeVisiteStatutPublique>(
        `/demandes-visite/${encodeURIComponent(numero.trim())}/statut?code=${encodeURIComponent(code.trim())}`,
      )
      setDemande(reponse)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.status === 404) {
        setErreur('Aucune demande ne correspond à ce numéro et ce code de suivi.')
      } else {
        setErreur('La recherche a échoué. Veuillez réessayer.')
      }
    } finally {
      setEnRecherche(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Suivi de demande de visite — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Consultez l'état d'avancement de votre demande de visite grâce à votre numéro et votre code de suivi."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Suivi de demande
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Renseignez le numéro et le code de suivi reçus lors du dépôt de votre demande.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-12 sm:px-8">
        <div className="max-w-xl">
          <form onSubmit={rechercher} className="flex flex-col gap-5" noValidate>
            <ChampTexte
              etiquette="Numéro de suivi"
              placeholder="DGAP-VIS-2026-000001"
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
            <ChampTexte
              etiquette="Code de suivi"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {erreur && (
              <p role="alert" className="font-corps text-sm text-error">
                {erreur}
              </p>
            )}
            <Bouton type="submit" disabled={enRecherche}>
              <Search size={18} aria-hidden="true" />
              {enRecherche ? 'Recherche en cours…' : 'Rechercher'}
            </Bouton>
          </form>

          <div className="mt-4">
            {!afficherRenvoi ? (
              <button
                type="button"
                onClick={() => setAfficherRenvoi(true)}
                className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                <HelpCircle size={16} aria-hidden="true" />
                J'ai oublié mon numéro ou mon code de suivi
              </button>
            ) : (
              <div className="rounded-carte border border-border p-5 dark:border-border-dark">
                <p className="font-corps text-sm text-text-strong dark:text-text-inv-strong">
                  Recevoir un rappel par e-mail
                </p>
                <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  Indiquez l'adresse e-mail utilisée lors du dépôt de votre demande. Si elle
                  correspond à une ou plusieurs demandes, vous recevrez vos numéros et codes de
                  suivi par e-mail.
                </p>
                <form onSubmit={demanderRenvoi} className="mt-3 flex flex-col gap-3" noValidate>
                  <ChampTexte
                    etiquette="Adresse e-mail"
                    type="email"
                    required
                    value={emailRenvoi}
                    onChange={(e) => setEmailRenvoi(e.target.value)}
                  />
                  <Bouton type="submit" taille="sm" variante="secondaire" disabled={enEnvoiRenvoi}>
                    {enEnvoiRenvoi ? 'Envoi en cours…' : 'Envoyer le rappel'}
                  </Bouton>
                </form>
                {messageRenvoi && (
                  <p className="mt-3 font-corps text-sm text-text-body dark:text-text-inv-body">
                    {messageRenvoi}
                  </p>
                )}
              </div>
            )}
          </div>

          {demande && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-carte border border-border bg-white p-6 shadow-legere dark:border-border-dark dark:bg-surface-dark-alt"
            >
              <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                {demande.numero_suivi}
              </p>
              <p className="mt-1 font-corps text-sm font-medium text-primary dark:text-accent-soft">
                {LIBELLE_STATUT[demande.statut]}
              </p>
              <dl className="mt-4 space-y-2 font-corps text-sm text-text-body dark:text-text-inv-body">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted dark:text-text-inv-muted">Établissement</dt>
                  <dd>{demande.etablissement.nom}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted dark:text-text-inv-muted">Date souhaitée</dt>
                  <dd>{demande.date_souhaitee}</dd>
                </div>
                {demande.statut === 'REJETEE' && demande.motif_rejet && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-muted dark:text-text-inv-muted">Motif du rejet</dt>
                    <dd>{demande.motif_rejet}</dd>
                  </div>
                )}
              </dl>

              {demande.statut === 'PERMIS_DELIVRE' && (
                <a
                  href={`${urlBase()}/demandes-visite/${encodeURIComponent(demande.numero_suivi)}/permis/pdf?code=${encodeURIComponent(code.trim())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
                >
                  <Download size={16} aria-hidden="true" />
                  Télécharger le permis de visite (PDF)
                </a>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </>
  )
}
