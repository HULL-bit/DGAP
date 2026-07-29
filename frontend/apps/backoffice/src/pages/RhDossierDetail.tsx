import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Briefcase, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, type TonBadge } from '@dgap/ui'
import type {
  ActeCarriere,
  DossierAgentListe,
  Pagination,
  StatutActeCarriere,
  TypeActeCarriere,
} from '../types/api'
import { LIBELLES_STATUT_ACTE, LIBELLES_TYPE_ACTE } from '../types/api'

interface PerimetreOption {
  id: string
  libelle: string
}

const TON_PAR_STATUT_ACTE: Record<StatutActeCarriere, TonBadge> = {
  BROUILLON: 'neutre',
  SOUMIS: 'attente',
  VALIDE: 'succes',
  REJETE: 'erreur',
}

const ACTIONS_PAR_STATUT_ACTE: Record<StatutActeCarriere, { action: string; libelle: string }[]> = {
  BROUILLON: [{ action: 'soumettre', libelle: 'Soumettre' }],
  SOUMIS: [
    { action: 'valider', libelle: 'Valider' },
    { action: 'rejeter', libelle: 'Rejeter' },
  ],
  VALIDE: [],
  REJETE: [{ action: 'soumettre', libelle: 'Resoumettre' }],
}

interface FormulaireAffectation {
  perimetre: string
  fonction: string
  date_debut: string
}

const AFFECTATION_VIDE: FormulaireAffectation = { perimetre: '', fonction: '', date_debut: '' }

interface FormulaireActe {
  type_acte: TypeActeCarriere
  date_effet: string
  motif: string
  nouveau_grade: string
  nouveau_perimetre: string
  nouvelle_fonction: string
}

const ACTE_VIDE: FormulaireActe = {
  type_acte: 'AVANCEMENT',
  date_effet: '',
  motif: '',
  nouveau_grade: '',
  nouveau_perimetre: '',
  nouvelle_fonction: '',
}

export function RhDossierDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [afficherAffectation, setAfficherAffectation] = useState(false)
  const [champsAffectation, setChampsAffectation] = useState<FormulaireAffectation>(AFFECTATION_VIDE)
  const [afficherActe, setAfficherActe] = useState(false)
  const [champsActe, setChampsActe] = useState<FormulaireActe>(ACTE_VIDE)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['rh-dossier-detail', id],
    queryFn: () => requeteApi<DossierAgentListe>(`/backoffice/rh/dossiers/${id}`),
  })

  const { data: actes } = useQuery({
    queryKey: ['rh-actes', id],
    queryFn: () =>
      requeteApi<Pagination<ActeCarriere>>(`/backoffice/rh/actes-carriere?dossier=${id}&limit=100`),
    enabled: Boolean(id),
  })

  const { data: perimetres } = useQuery({
    queryKey: ['perimetres'],
    queryFn: () => requeteApi<PerimetreOption[]>('/perimetres'),
  })

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['rh-dossier-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['rh-actes', id] })
  }

  async function creerAffectation(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/rh/dossiers/${id}/affectations`, {
        method: 'POST',
        body: JSON.stringify(champsAffectation),
      })
      setChampsAffectation(AFFECTATION_VIDE)
      setAfficherAffectation(false)
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function creerActe(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi('/backoffice/rh/actes-carriere', {
        method: 'POST',
        body: JSON.stringify({
          dossier: id,
          type_acte: champsActe.type_acte,
          date_effet: champsActe.date_effet,
          motif: champsActe.motif,
          nouveau_grade: champsActe.nouveau_grade,
          nouveau_perimetre: champsActe.nouveau_perimetre || null,
          nouvelle_fonction: champsActe.nouvelle_fonction,
        }),
      })
      setChampsActe(ACTE_VIDE)
      setAfficherActe(false)
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Création impossible.') : 'Création impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function transitionnerActe(acteId: string, action: string) {
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/rh/actes-carriere/${acteId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  if (isLoading || !dossier) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/rh/dossiers"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Dossiers RH
      </Link>

      <motion.div className="mt-4" {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          {dossier.utilisateur_nom}
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          {dossier.utilisateur_email} {dossier.grade && `· ${dossier.grade}`} {dossier.corps && `· ${dossier.corps}`}
        </p>
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
                <Briefcase size={14} aria-hidden="true" />
                Historique d'affectation
              </h2>
              <Bouton taille="sm" onClick={() => setAfficherAffectation((v) => !v)} className="gap-1.5">
                <Plus size={14} aria-hidden="true" />
                Nouvelle affectation
              </Bouton>
            </div>

            {afficherAffectation && (
              <form onSubmit={creerAffectation} className="mt-4 flex flex-col gap-3 border-b border-border pb-4 dark:border-border-dark">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="perimetre-affectation" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                    Périmètre
                  </label>
                  <select
                    id="perimetre-affectation"
                    required
                    value={champsAffectation.perimetre}
                    onChange={(e) => setChampsAffectation((c) => ({ ...c, perimetre: e.target.value }))}
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
                  etiquette="Fonction"
                  value={champsAffectation.fonction}
                  onChange={(e) => setChampsAffectation((c) => ({ ...c, fonction: e.target.value }))}
                />
                <ChampTexte
                  etiquette="Date de début"
                  type="date"
                  required
                  value={champsAffectation.date_debut}
                  onChange={(e) => setChampsAffectation((c) => ({ ...c, date_debut: e.target.value }))}
                />
                <Bouton type="submit" taille="sm" disabled={enCours} className="self-start">
                  Enregistrer
                </Bouton>
              </form>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {dossier.affectations.map((a) => (
                <div key={a.id} className="border-b border-border pb-2 last:border-0 dark:border-border-dark">
                  <p className="font-corps text-sm text-text-body dark:text-text-inv-body">
                    {a.perimetre_libelle}
                    {a.fonction && ` — ${a.fonction}`}
                    {a.est_active && (
                      <span className="ml-2 rounded-full bg-succes/10 px-2 py-0.5 text-xs font-semibold text-succes">
                        Actuelle
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    Depuis le {new Date(a.date_debut).toLocaleDateString('fr-SN')}
                    {a.date_fin && ` jusqu'au ${new Date(a.date_fin).toLocaleDateString('fr-SN')}`}
                  </p>
                </div>
              ))}
              {dossier.affectations.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune affectation.</p>
              )}
            </div>
          </Carte>

          <Carte>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
                Actes de carrière
              </h2>
              <Bouton taille="sm" onClick={() => setAfficherActe((v) => !v)} className="gap-1.5">
                <Plus size={14} aria-hidden="true" />
                Nouvel acte
              </Bouton>
            </div>

            {afficherActe && (
              <form onSubmit={creerActe} className="mt-4 flex flex-col gap-3 border-b border-border pb-4 dark:border-border-dark">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type-acte" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                    Type d'acte
                  </label>
                  <select
                    id="type-acte"
                    value={champsActe.type_acte}
                    onChange={(e) => setChampsActe((c) => ({ ...c, type_acte: e.target.value as TypeActeCarriere }))}
                    className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                               dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                  >
                    {(Object.entries(LIBELLES_TYPE_ACTE) as [TypeActeCarriere, string][]).map(([valeur, libelle]) => (
                      <option key={valeur} value={valeur}>
                        {libelle}
                      </option>
                    ))}
                  </select>
                </div>
                <ChampTexte
                  etiquette="Date d'effet"
                  type="date"
                  required
                  value={champsActe.date_effet}
                  onChange={(e) => setChampsActe((c) => ({ ...c, date_effet: e.target.value }))}
                />
                {champsActe.type_acte === 'AVANCEMENT' && (
                  <ChampTexte
                    etiquette="Nouveau grade"
                    value={champsActe.nouveau_grade}
                    onChange={(e) => setChampsActe((c) => ({ ...c, nouveau_grade: e.target.value }))}
                  />
                )}
                {champsActe.type_acte === 'MUTATION' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="nouveau-perimetre" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                        Nouveau périmètre
                      </label>
                      <select
                        id="nouveau-perimetre"
                        value={champsActe.nouveau_perimetre}
                        onChange={(e) => setChampsActe((c) => ({ ...c, nouveau_perimetre: e.target.value }))}
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
                      etiquette="Nouvelle fonction"
                      value={champsActe.nouvelle_fonction}
                      onChange={(e) => setChampsActe((c) => ({ ...c, nouvelle_fonction: e.target.value }))}
                    />
                  </>
                )}
                <ChampTexte
                  etiquette="Motif"
                  value={champsActe.motif}
                  onChange={(e) => setChampsActe((c) => ({ ...c, motif: e.target.value }))}
                />
                <Bouton type="submit" taille="sm" disabled={enCours} className="self-start">
                  Créer l'acte
                </Bouton>
              </form>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {(actes?.results ?? []).map((acte) => (
                <div key={acte.id} className="rounded-bouton border border-border p-4 dark:border-border-dark">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                      {acte.numero} — {LIBELLES_TYPE_ACTE[acte.type_acte]}
                    </p>
                    <Badge ton={TON_PAR_STATUT_ACTE[acte.statut]} libelle={LIBELLES_STATUT_ACTE[acte.statut]} />
                  </div>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    Effet le {new Date(acte.date_effet).toLocaleDateString('fr-SN')}
                    {acte.valide_par_nom && ` · validé par ${acte.valide_par_nom}`}
                  </p>
                  {acte.motif && <p className="mt-2 font-corps text-sm text-text-body dark:text-text-inv-body">{acte.motif}</p>}
                  <div className="mt-3 flex gap-3">
                    {ACTIONS_PAR_STATUT_ACTE[acte.statut].map((a) => (
                      <button
                        key={a.action}
                        type="button"
                        onClick={() => transitionnerActe(acte.id, a.action)}
                        disabled={enCours}
                        className="font-corps text-xs font-semibold text-primary hover:underline dark:text-accent-soft"
                      >
                        {a.libelle}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {(actes?.results ?? []).length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun acte de carrière.</p>
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
              <dt className="text-text-muted dark:text-text-inv-muted">Position</dt>
              <dd className="text-text-body dark:text-text-inv-body">{dossier.position_administrative}</dd>
              {dossier.date_entree_service && (
                <>
                  <dt className="text-text-muted dark:text-text-inv-muted">Entrée en service</dt>
                  <dd className="text-text-body dark:text-text-inv-body">
                    {new Date(dossier.date_entree_service).toLocaleDateString('fr-SN')}
                  </dd>
                </>
              )}
            </dl>
          </Carte>
        </div>
      </div>
    </section>
  )
}
