import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText, History, Lock } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, type TonBadge } from '@dgap/ui'
import type {
  Pagination,
  PersonneDetenueDetail as PersonneDetenueDetailType,
  StatutDossierDetenu,
  TypeMouvementDetenu,
} from '../types/api'
import { LIBELLES_SITUATION_PENALE, LIBELLES_STATUT_DOSSIER, LIBELLES_TYPE_MOUVEMENT } from '../types/api'

interface EtablissementOption {
  id: string
  nom: string
}

const TON_PAR_STATUT: Record<StatutDossierDetenu, TonBadge> = {
  ECROUE: 'neutre',
  LIBERE: 'succes',
  TRANSFERE: 'attente',
  EVADE: 'erreur',
}

const TYPES_MOUVEMENT: TypeMouvementDetenu[] = [
  'TRANSFERT',
  'EXTRACTION',
  'HOSPITALISATION',
  'PERMISSION_SORTIR',
  'EVASION',
  'REINTEGRATION',
  'LEVEE_ECROU',
]

interface FormulaireMouvement {
  type_mouvement: TypeMouvementDetenu
  etablissement_destination: string
  motif: string
}

const MOUVEMENT_VIDE: FormulaireMouvement = {
  type_mouvement: 'PERMISSION_SORTIR',
  etablissement_destination: '',
  motif: '',
}

export function DetenusDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [afficherMouvement, setAfficherMouvement] = useState(false)
  const [champsMouvement, setChampsMouvement] = useState<FormulaireMouvement>(MOUVEMENT_VIDE)
  const [dateLiberation, setDateLiberation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const { data: personne, isLoading } = useQuery({
    queryKey: ['detenus-detail', id],
    queryFn: () => requeteApi<PersonneDetenueDetailType>(`/backoffice/detenus/personnes/${id}`),
  })

  const { data: etablissements } = useQuery({
    queryKey: ['etablissements-options'],
    queryFn: () => requeteApi<Pagination<EtablissementOption>>('/etablissements?limit=200'),
  })

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['detenus-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['detenus-personnes'] })
  }

  async function creerMouvement(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/detenus/personnes/${id}/mouvements`, {
        method: 'POST',
        body: JSON.stringify({
          type_mouvement: champsMouvement.type_mouvement,
          etablissement_destination: champsMouvement.etablissement_destination || undefined,
          motif: champsMouvement.motif,
        }),
      })
      setChampsMouvement(MOUVEMENT_VIDE)
      setAfficherMouvement(false)
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function enregistrerDateLiberation() {
    if (!dateLiberation) return
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/detenus/personnes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date_liberation_prevue: dateLiberation }),
      })
      setDateLiberation('')
      await invalider()
    } finally {
      setEnCours(false)
    }
  }

  if (isLoading || !personne) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/detenus"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Dossier détenu
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="flex items-center gap-2 font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            <Lock size={18} aria-hidden="true" />
            {personne.numero_ecrou}
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            {personne.nom} {personne.prenom} — {personne.etablissement_libelle}
          </p>
        </div>
        <Badge ton={TON_PAR_STATUT[personne.statut_dossier]} libelle={LIBELLES_STATUT_DOSSIER[personne.statut_dossier]} />
      </motion.div>

      {erreur && (
        <p role="alert" className="mt-4 font-corps text-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <Carte>
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-1.5 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                <History size={14} aria-hidden="true" />
                Historique des mouvements
              </h2>
              <Bouton taille="sm" onClick={() => setAfficherMouvement((v) => !v)}>
                Nouveau mouvement
              </Bouton>
            </div>

            {afficherMouvement && (
              <form onSubmit={creerMouvement} className="mt-4 flex flex-col gap-3 border-b border-border pb-4 dark:border-border-dark">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-mouvement" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                    Type de mouvement
                  </label>
                  <select
                    id="type-mouvement"
                    value={champsMouvement.type_mouvement}
                    onChange={(e) =>
                      setChampsMouvement((c) => ({ ...c, type_mouvement: e.target.value as TypeMouvementDetenu }))
                    }
                    className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                               dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                  >
                    {TYPES_MOUVEMENT.map((type) => (
                      <option key={type} value={type}>
                        {LIBELLES_TYPE_MOUVEMENT[type]}
                      </option>
                    ))}
                  </select>
                </div>
                {champsMouvement.type_mouvement === 'TRANSFERT' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="etablissement-destination" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                      Établissement de destination
                    </label>
                    <select
                      id="etablissement-destination"
                      required
                      value={champsMouvement.etablissement_destination}
                      onChange={(e) =>
                        setChampsMouvement((c) => ({ ...c, etablissement_destination: e.target.value }))
                      }
                      className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                                 dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                    >
                      <option value="">Sélectionner…</option>
                      {(etablissements?.results ?? []).map((etab) => (
                        <option key={etab.id} value={etab.id}>
                          {etab.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <ChampTexte
                  etiquette="Motif"
                  value={champsMouvement.motif}
                  onChange={(e) => setChampsMouvement((c) => ({ ...c, motif: e.target.value }))}
                />
                <Bouton type="submit" taille="sm" disabled={enCours} className="self-start">
                  Enregistrer le mouvement
                </Bouton>
              </form>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {personne.mouvements.map((mouvement) => (
                <div key={mouvement.id} className="border-b border-border pb-2 last:border-0 dark:border-border-dark">
                  <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                    {LIBELLES_TYPE_MOUVEMENT[mouvement.type_mouvement]}
                    {mouvement.etablissement_destination_libelle && ` → ${mouvement.etablissement_destination_libelle}`}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {new Date(mouvement.date_mouvement).toLocaleString('fr-SN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {mouvement.auteur_nom && ` · ${mouvement.auteur_nom}`}
                  </p>
                  {mouvement.motif && (
                    <p className="mt-1 font-corps text-sm text-text-body dark:text-text-inv-body">{mouvement.motif}</p>
                  )}
                  {mouvement.piece_justificative_url && (
                    <a
                      href={mouvement.piece_justificative_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                    >
                      <FileText size={12} aria-hidden="true" />
                      Pièce justificative
                    </a>
                  )}
                </div>
              ))}
              {personne.mouvements.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun mouvement.</p>
              )}
            </div>
          </Carte>
        </div>

        <div className="flex flex-col gap-6">
          <Carte>
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Situation
            </h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-corps text-sm">
              <dt className="text-text-muted dark:text-text-inv-muted">Naissance</dt>
              <dd className="text-text-body dark:text-text-inv-body">
                {new Date(personne.date_naissance).toLocaleDateString('fr-SN')}
                {personne.date_naissance_approximative && ' (approximative)'}
              </dd>
              <dt className="text-text-muted dark:text-text-inv-muted">Situation pénale</dt>
              <dd className="text-text-body dark:text-text-inv-body">
                {LIBELLES_SITUATION_PENALE[personne.situation_penale]}
              </dd>
              <dt className="text-text-muted dark:text-text-inv-muted">Écrou</dt>
              <dd className="text-text-body dark:text-text-inv-body">
                {new Date(personne.date_ecrou).toLocaleDateString('fr-SN')}
              </dd>
              {personne.date_liberation_prevue && (
                <>
                  <dt className="text-text-muted dark:text-text-inv-muted">Libération prévue</dt>
                  <dd className="text-text-body dark:text-text-inv-body">
                    {new Date(personne.date_liberation_prevue).toLocaleDateString('fr-SN')}
                  </dd>
                </>
              )}
            </dl>
            <p className="mt-3 font-corps text-xs text-text-muted dark:text-text-inv-muted">
              La date de libération prévue est saisie manuellement par un agent habilité — jamais
              calculée automatiquement.
            </p>
            <div className="mt-3 flex items-end gap-2">
              <ChampTexte
                etiquette="Mettre à jour"
                type="date"
                value={dateLiberation}
                onChange={(e) => setDateLiberation(e.target.value)}
              />
              <Bouton taille="sm" onClick={enregistrerDateLiberation} disabled={enCours || !dateLiberation}>
                OK
              </Bouton>
            </div>
          </Carte>
        </div>
      </div>
    </section>
  )
}
