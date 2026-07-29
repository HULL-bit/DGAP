import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, type TonBadge } from '@dgap/ui'
import type { CourrierEntrantDetail, ReponseCourrier, StatutCourrierEntrant } from '../types/api'
import { LIBELLES_CONFIDENTIALITE, LIBELLES_STATUT_COURRIER } from '../types/api'

interface PerimetreOption {
  id: string
  libelle: string
}

const TON_PAR_STATUT: Record<StatutCourrierEntrant, TonBadge> = {
  ENREGISTRE: 'neutre',
  AFFECTE: 'attente',
  EN_TRAITEMENT: 'attente',
  TRAITE: 'succes',
  CLOS: 'neutre',
}

const ACTIONS_PAR_STATUT: Record<StatutCourrierEntrant, { action: string; libelle: string }[]> = {
  ENREGISTRE: [{ action: 'affecter', libelle: 'Affecter' }],
  AFFECTE: [
    { action: 'prendre_en_charge', libelle: 'Prendre en charge' },
    { action: 'reaffecter', libelle: 'Réaffecter' },
  ],
  EN_TRAITEMENT: [
    { action: 'traiter', libelle: 'Marquer traité' },
    { action: 'reaffecter', libelle: 'Réaffecter' },
  ],
  TRAITE: [{ action: 'cloturer', libelle: 'Clôturer' }],
  CLOS: [],
}

const ACTIONS_REPONSE: Record<string, { action: string; libelle: string }[]> = {
  BROUILLON: [{ action: 'viser', libelle: 'Viser' }],
  VISE: [
    { action: 'valider', libelle: 'Valider (signataire)' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  VALIDE: [{ action: 'expedier', libelle: 'Expédier' }],
  EXPEDIE: [],
}

export function CourrierDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [perimetreChoisi, setPerimetreChoisi] = useState('')
  const [instructions, setInstructions] = useState('')
  const [nouvelleReponse, setNouvelleReponse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurFichier, setErreurFichier] = useState<string | null>(null)

  const { data: courrier, isLoading } = useQuery({
    queryKey: ['courrier-detail', id],
    queryFn: () => requeteApi<CourrierEntrantDetail>(`/backoffice/courrier/entrant/${id}`),
  })

  const { data: perimetres } = useQuery({
    queryKey: ['perimetres'],
    queryFn: () => requeteApi<PerimetreOption[]>('/perimetres'),
  })

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['courrier-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['courrier-entrant'] })
  }

  async function transitionner(action: string) {
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/courrier/entrant/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          perimetre: perimetreChoisi || null,
          instructions,
        }),
      })
      setInstructions('')
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function creerReponse(e: FormEvent) {
    e.preventDefault()
    if (!nouvelleReponse.trim()) return
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/courrier/entrant/${id}/reponses`, {
        method: 'POST',
        body: JSON.stringify({ contenu: nouvelleReponse }),
      })
      setNouvelleReponse('')
      await invalider()
    } finally {
      setEnCours(false)
    }
  }

  async function transitionnerReponse(reponseId: string, action: string) {
    await requeteApi(`/backoffice/courrier/reponses/${reponseId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    await invalider()
  }

  async function televerserFichier(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    if (!fichier.name.toLowerCase().endsWith('.pdf')) {
      setErreurFichier('Seul le format PDF est accepté.')
      return
    }
    setErreurFichier(null)
    try {
      const donnees = new FormData()
      donnees.append('fichier', fichier)
      await requeteApiFichier(`/backoffice/courrier/entrant/${id}/fichier`, donnees)
      await invalider()
    } catch {
      setErreurFichier("Le fichier n'a pas pu être téléversé.")
    }
  }

  if (isLoading || !courrier) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  const actionsDisponibles = ACTIONS_PAR_STATUT[courrier.statut]

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/courrier"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Courrier entrant
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            {courrier.numero}
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            {courrier.expediteur} — {courrier.objet}
          </p>
          {courrier.expediteur_email && (
            <p className="mt-0.5 font-corps text-xs text-text-muted dark:text-text-inv-muted">
              {courrier.expediteur_email} — la réponse expédiée lui sera envoyée par e-mail
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge ton="neutre" libelle={LIBELLES_CONFIDENTIALITE[courrier.confidentialite]} />
          <Badge ton={TON_PAR_STATUT[courrier.statut]} libelle={LIBELLES_STATUT_COURRIER[courrier.statut]} />
        </div>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Historique d'affectation
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {courrier.affectations.map((a) => (
                <div key={a.id} className="border-b border-border pb-2 last:border-0 dark:border-border-dark">
                  <p className="font-corps text-sm text-text-body dark:text-text-inv-body">
                    {a.perimetre_libelle || a.agent_nom || '—'}
                    {a.instructions && ` — ${a.instructions}`}
                  </p>
                  <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    par {a.affecte_par_nom || 'système'} le{' '}
                    {new Date(a.cree_le).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
              {courrier.affectations.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune affectation.</p>
              )}
            </div>
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Projets de réponse
            </h2>
            <div className="mt-3 flex flex-col gap-4">
              {courrier.reponses.map((reponse: ReponseCourrier) => (
                <div key={reponse.id} className="rounded-bouton border border-border p-4 dark:border-border-dark">
                  <div className="flex items-center justify-between gap-4">
                    <Badge ton={reponse.statut === 'EXPEDIE' ? 'succes' : 'attente'} libelle={reponse.statut} />
                    <div className="flex gap-2">
                      {ACTIONS_REPONSE[reponse.statut]?.map((a) => (
                        <button
                          key={a.action}
                          type="button"
                          onClick={() => transitionnerReponse(reponse.id, a.action)}
                          className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                        >
                          {a.libelle}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 font-corps text-sm text-text-body dark:text-text-inv-body">{reponse.contenu}</p>
                  {reponse.signataire_nom && (
                    <p className="mt-2 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      Signé par {reponse.signataire_nom}
                    </p>
                  )}
                </div>
              ))}
              {courrier.reponses.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun projet de réponse.</p>
              )}
            </div>

            <form onSubmit={creerReponse} className="mt-4 flex flex-col gap-3">
              <textarea
                value={nouvelleReponse}
                onChange={(e) => setNouvelleReponse(e.target.value)}
                rows={3}
                placeholder="Rédiger un projet de réponse…"
                className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              />
              <Bouton type="submit" disabled={enCours || !nouvelleReponse.trim()} taille="sm" className="self-start">
                Ajouter le projet de réponse
              </Bouton>
            </form>
          </Carte>
        </div>

        <div className="flex flex-col gap-6">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Actions
            </h2>
            {actionsDisponibles.length > 0 && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="perimetre" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                    Périmètre destinataire
                  </label>
                  <select
                    id="perimetre"
                    value={perimetreChoisi}
                    onChange={(e) => setPerimetreChoisi(e.target.value)}
                    className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                               dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                  >
                    <option value="">Sélectionner…</option>
                    {(perimetres ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.libelle}
                      </option>
                    ))}
                  </select>
                </div>
                <ChampTexte
                  etiquette="Instructions (facultatif)"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {actionsDisponibles.map((a) => (
                    <Bouton key={a.action} onClick={() => transitionner(a.action)} disabled={enCours} taille="sm">
                      {a.libelle}
                    </Bouton>
                  ))}
                </div>
                {erreur && (
                  <p role="alert" className="font-corps text-sm text-error">
                    {erreur}
                  </p>
                )}
              </div>
            )}
            {actionsDisponibles.length === 0 && (
              <p className="mt-3 font-corps text-sm text-text-muted dark:text-text-inv-muted">Dossier clos.</p>
            )}
          </Carte>

          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Pièce jointe
            </h2>
            {courrier.fichier_url ? (
              <a
                href={courrier.fichier_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                <FileText size={16} aria-hidden="true" />
                Voir le fichier
              </a>
            ) : (
              <p className="mt-3 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun fichier.</p>
            )}
            <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-bouton bg-primary px-3.5 py-2 font-corps text-sm font-semibold text-white transition-colors duration-200 ease-dgap hover:bg-primary-dark">
              <Upload size={16} aria-hidden="true" />
              {courrier.fichier_url ? 'Remplacer' : 'Téléverser'}
              <input type="file" accept=".pdf" className="sr-only" onChange={televerserFichier} />
            </label>
            {erreurFichier && (
              <p role="alert" className="mt-2 font-corps text-sm text-error">
                {erreurFichier}
              </p>
            )}
          </Carte>
        </div>
      </div>
    </section>
  )
}
