import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { requeteApi, obtenirJetonAcces } from '@dgap/api-client'
import { Badge, Carte, propsApparition, type TonBadge } from '@dgap/ui'
import { useAuth } from '../auth/AuthContext'
import type { DemandeVisiteInstruction, StatutDemandeVisite } from '../types/api'
import { ACTIONS_PAR_STATUT_VISITE, LIBELLES_STATUT_VISITE } from '../types/api'

const TON_PAR_STATUT: Record<StatutDemandeVisite, TonBadge> = {
  SOUMISE: 'neutre',
  EN_INSTRUCTION: 'attente',
  PIECES_MANQUANTES: 'alerte',
  VALIDEE: 'attente',
  REJETEE: 'erreur',
  PERMIS_DELIVRE: 'succes',
}

const LIBELLES_TYPE_PIECE: Record<string, string> = {
  CNI_VISITEUR: "Pièce d'identité du visiteur",
  PERMIS_COMMUNIQUER: 'Permis de communiquer existant',
  AUTRE: 'Autre document',
}

function urlBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'
}

export function VisiteInstruction() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { possedeScope } = useAuth()

  const [motif, setMotif] = useState('')
  const [enTransition, setEnTransition] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enTelechargement, setEnTelechargement] = useState(false)

  const { data: demande, isLoading } = useQuery({
    queryKey: ['backoffice-visite', id],
    queryFn: () => requeteApi<DemandeVisiteInstruction>(`/demandes-visite/instruction/${id}`),
  })

  const peutInstruire = possedeScope('visites:instruire')

  async function appliquerTransition(action: string) {
    setMessage(null)
    setEnTransition(action)
    try {
      await requeteApi(`/demandes-visite/instruction/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ action, motif }),
      })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-visite', id] })
      setMotif('')
      setMessage('Transition appliquée.')
    } catch {
      setMessage("Cette action n'a pas pu être appliquée (droits insuffisants ou statut modifié entre-temps).")
    } finally {
      setEnTransition(null)
    }
  }

  async function telechargerPermis() {
    setEnTelechargement(true)
    try {
      const jeton = obtenirJetonAcces()
      const reponse = await fetch(`${urlBase()}/permis/${id}/pdf`, {
        headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
      })
      if (!reponse.ok) throw new Error('Échec du téléchargement')
      const blob = await reponse.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      setMessage("Le permis n'a pas pu être téléchargé.")
    } finally {
      setEnTelechargement(false)
    }
  }

  if (isLoading || !demande) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  const actionsDisponibles = ACTIONS_PAR_STATUT_VISITE[demande.statut]

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/visites"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Instruction des demandes de visite
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            {demande.numero_suivi}
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Code de suivi :{' '}
            <span className="font-medium text-text-strong dark:text-text-inv-strong">{demande.code_suivi}</span>
          </p>
        </div>
        <Badge ton={TON_PAR_STATUT[demande.statut]} libelle={LIBELLES_STATUT_VISITE[demande.statut]} />
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Visiteur
            </h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 font-corps text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted dark:text-text-inv-muted">Nom complet</dt>
                <dd className="text-text-strong dark:text-text-inv-strong">
                  {demande.visiteur_prenom} {demande.visiteur_nom}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted dark:text-text-inv-muted">Lien de parenté</dt>
                <dd className="text-text-strong dark:text-text-inv-strong">{demande.lien_parente}</dd>
              </div>
              <div>
                <dt className="text-text-muted dark:text-text-inv-muted">E-mail</dt>
                <dd className="text-text-strong dark:text-text-inv-strong">{demande.visiteur_email}</dd>
              </div>
              <div>
                <dt className="text-text-muted dark:text-text-inv-muted">Téléphone</dt>
                <dd className="text-text-strong dark:text-text-inv-strong">{demande.visiteur_telephone}</dd>
              </div>
            </dl>
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Personne détenue déclarée
            </h2>
            <p className="mt-3 font-corps text-sm text-text-strong dark:text-text-inv-strong">
              {demande.detenu_prenom_declare} {demande.detenu_nom_declare}
            </p>
            <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
              Déclaration du visiteur uniquement — non rapprochée du registre des personnes détenues (§6.3).
            </p>
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Visite demandée
            </h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 font-corps text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-muted dark:text-text-inv-muted">Établissement</dt>
                <dd className="text-text-strong dark:text-text-inv-strong">{demande.etablissement.nom}</dd>
              </div>
              <div>
                <dt className="text-text-muted dark:text-text-inv-muted">Date souhaitée</dt>
                <dd className="text-text-strong dark:text-text-inv-strong">{demande.date_souhaitee}</dd>
              </div>
            </dl>
            {demande.statut === 'REJETEE' && demande.motif_rejet && (
              <p className="mt-3 font-corps text-sm text-error">Motif du rejet : {demande.motif_rejet}</p>
            )}
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Pièces jointes
            </h2>
            {demande.pieces.length === 0 ? (
              <p className="mt-3 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                Aucune pièce téléversée.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {demande.pieces.map((piece) => (
                  <li
                    key={piece.id}
                    className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0 dark:border-border-dark"
                  >
                    <div className="flex items-center gap-2 font-corps text-sm text-text-strong dark:text-text-inv-strong">
                      <FileText size={16} aria-hidden="true" />
                      {LIBELLES_TYPE_PIECE[piece.type_piece] ?? piece.type_piece}
                    </div>
                    <a
                      href={piece.fichier}
                      target="_blank"
                      rel="noreferrer"
                      className="font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
                    >
                      Ouvrir
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>

        <div className="flex flex-col gap-6">
          {peutInstruire && actionsDisponibles.length > 0 && (
            <Carte>
              <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                Instruction
              </h2>
              <div className="mt-3 flex flex-col gap-1.5">
                <label
                  htmlFor="motif"
                  className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong"
                >
                  Motif (facultatif, utilisé en cas de rejet)
                </label>
                <textarea
                  id="motif"
                  rows={3}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {actionsDisponibles.map(({ action, libelle }) => (
                  <button
                    key={action}
                    type="button"
                    disabled={enTransition !== null}
                    onClick={() => appliquerTransition(action)}
                    className="rounded-bouton border border-border px-3 py-2 text-left font-corps text-sm font-medium text-text-strong
                               transition-colors duration-200 ease-dgap hover:bg-surface-tint disabled:cursor-not-allowed disabled:opacity-40
                               dark:border-border-dark dark:text-text-inv-strong dark:hover:bg-white/5"
                  >
                    {enTransition === action ? 'Application…' : libelle}
                  </button>
                ))}
              </div>
              {message && (
                <p className="mt-3 font-corps text-sm text-text-body dark:text-text-inv-body">{message}</p>
              )}
            </Carte>
          )}

          {demande.statut === 'PERMIS_DELIVRE' && (
            <Carte>
              <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                Permis de visite
              </h2>
              <button
                type="button"
                onClick={telechargerPermis}
                disabled={enTelechargement}
                className="mt-3 inline-flex items-center gap-2 rounded-bouton bg-primary px-3 py-2 font-corps text-sm font-semibold text-white
                           transition-colors duration-200 ease-dgap hover:bg-primary-hover disabled:opacity-50"
              >
                <Download size={16} aria-hidden="true" />
                {enTelechargement ? 'Téléchargement…' : 'Télécharger le PDF'}
              </button>
            </Carte>
          )}
        </div>
      </div>
    </section>
  )
}
