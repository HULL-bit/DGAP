import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, ShieldAlert } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition } from '@dgap/ui'
import type { Pagination, PermissionRBAC, RoleRBAC, UtilisateurAdmin } from '../types/api'

interface PerimetreOption {
  id: string
  libelle: string
}

interface FormulaireAffectation {
  role: string
  perimetre: string
}

const AFFECTATION_VIDE: FormulaireAffectation = { role: '', perimetre: '' }

interface FormulaireAttribution {
  permission: string
  perimetre: string
  motif: string
}

const ATTRIBUTION_VIDE: FormulaireAttribution = { permission: '', perimetre: '', motif: '' }

export function CompteDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [afficherAffectation, setAfficherAffectation] = useState(false)
  const [champsAffectation, setChampsAffectation] = useState<FormulaireAffectation>(AFFECTATION_VIDE)
  const [afficherAttribution, setAfficherAttribution] = useState(false)
  const [champsAttribution, setChampsAttribution] = useState<FormulaireAttribution>(ATTRIBUTION_VIDE)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const { data: compte, isLoading } = useQuery({
    queryKey: ['compte-detail', id],
    queryFn: () => requeteApi<UtilisateurAdmin>(`/backoffice/comptes/utilisateurs/${id}`),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles-admin'],
    queryFn: () => requeteApi<Pagination<RoleRBAC>>('/backoffice/comptes/roles?limit=200'),
  })

  const { data: permissions } = useQuery({
    queryKey: ['permissions-admin'],
    queryFn: () => requeteApi<PermissionRBAC[]>('/backoffice/comptes/permissions'),
  })

  const { data: perimetres } = useQuery({
    queryKey: ['perimetres'],
    queryFn: () => requeteApi<PerimetreOption[]>('/perimetres'),
  })

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['compte-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['comptes-admin'] })
  }

  async function basculerActif() {
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/comptes/utilisateurs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !compte?.is_active }),
      })
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function creerAffectation(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi('/backoffice/comptes/affectations-role', {
        method: 'POST',
        body: JSON.stringify({
          utilisateur: id,
          role: champsAffectation.role,
          perimetre: champsAffectation.perimetre || null,
        }),
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

  async function revoquerAffectation(affectationId: string) {
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/comptes/affectations-role/${affectationId}/revoquer`, {
        method: 'POST',
      })
      await invalider()
    } finally {
      setEnCours(false)
    }
  }

  async function creerAttribution(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await requeteApi('/backoffice/comptes/attributions-permission', {
        method: 'POST',
        body: JSON.stringify({
          utilisateur: id,
          permission: champsAttribution.permission,
          perimetre: champsAttribution.perimetre || null,
          motif: champsAttribution.motif,
        }),
      })
      setChampsAttribution(ATTRIBUTION_VIDE)
      setAfficherAttribution(false)
      await invalider()
    } catch (err) {
      setErreur(err instanceof ApiError ? (err.probleme.detail ?? 'Action impossible.') : 'Action impossible.')
    } finally {
      setEnCours(false)
    }
  }

  async function revoquerAttribution(attributionId: string) {
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/comptes/attributions-permission/${attributionId}/revoquer`, {
        method: 'POST',
      })
      await invalider()
    } finally {
      setEnCours(false)
    }
  }

  if (isLoading || !compte) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/comptes"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Comptes
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            {compte.prenom} {compte.nom}
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">{compte.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!compte.is_active && <Badge ton="erreur" libelle="Désactivé" />}
          {compte.est_superviseur_national && <Badge ton="attente" libelle="Superviseur national" />}
          <Bouton taille="sm" onClick={basculerActif} disabled={enCours}>
            {compte.is_active ? 'Désactiver' : 'Réactiver'}
          </Bouton>
        </div>
      </motion.div>

      <p className="mt-2 font-corps text-xs text-text-muted dark:text-text-inv-muted">
        Un compte n'est jamais supprimé physiquement (référencé par l'historique dans tout le
        système) — la désactivation en tient lieu.
      </p>

      {erreur && (
        <p role="alert" className="mt-4 font-corps text-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Carte>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Rôles
            </h2>
            <Bouton taille="sm" onClick={() => setAfficherAffectation((v) => !v)} className="gap-1.5">
              <Plus size={14} aria-hidden="true" />
              Attribuer
            </Bouton>
          </div>

          {afficherAffectation && (
            <form onSubmit={creerAffectation} className="mt-4 flex flex-col gap-3 border-b border-border pb-4 dark:border-border-dark">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="role-affectation" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  Rôle
                </label>
                <select
                  id="role-affectation"
                  required
                  value={champsAffectation.role}
                  onChange={(e) => setChampsAffectation((c) => ({ ...c, role: e.target.value }))}
                  className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                >
                  <option value="">Sélectionner…</option>
                  {(roles?.results ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="perimetre-affectation" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  Périmètre (vide = national)
                </label>
                <select
                  id="perimetre-affectation"
                  value={champsAffectation.perimetre}
                  onChange={(e) => setChampsAffectation((c) => ({ ...c, perimetre: e.target.value }))}
                  className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                >
                  <option value="">National</option>
                  {(perimetres ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <Bouton type="submit" taille="sm" disabled={enCours} className="self-start">
                Attribuer
              </Bouton>
            </form>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {compte.affectations_role.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 dark:border-border-dark">
                <div>
                  <p className="font-corps text-sm text-text-body dark:text-text-inv-body">
                    {a.role_libelle} — {a.perimetre_libelle || 'National'}
                  </p>
                  {!a.actif && <Badge ton="neutre" libelle="Révoqué" />}
                </div>
                {a.actif && (
                  <button
                    type="button"
                    onClick={() => revoquerAffectation(a.id)}
                    disabled={enCours}
                    className="font-corps text-xs font-semibold text-error hover:underline"
                  >
                    Révoquer
                  </button>
                )}
              </div>
            ))}
            {compte.affectations_role.length === 0 && (
              <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun rôle attribué.</p>
            )}
          </div>
        </Carte>

        <Carte>
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-1.5 font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              <ShieldAlert size={14} aria-hidden="true" />
              Attributions directes (délégations)
            </h2>
            <Bouton taille="sm" onClick={() => setAfficherAttribution((v) => !v)} className="gap-1.5">
              <Plus size={14} aria-hidden="true" />
              Déléguer
            </Bouton>
          </div>

          {afficherAttribution && (
            <form onSubmit={creerAttribution} className="mt-4 flex flex-col gap-3 border-b border-border pb-4 dark:border-border-dark">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="permission-attribution" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  Permission
                </label>
                <select
                  id="permission-attribution"
                  required
                  value={champsAttribution.permission}
                  onChange={(e) => setChampsAttribution((c) => ({ ...c, permission: e.target.value }))}
                  className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-sm text-text-body
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
                >
                  <option value="">Sélectionner…</option>
                  {(permissions ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code}
                    </option>
                  ))}
                </select>
              </div>
              <ChampTexte
                etiquette="Motif (traçabilité)"
                required
                value={champsAttribution.motif}
                onChange={(e) => setChampsAttribution((c) => ({ ...c, motif: e.target.value }))}
              />
              <Bouton type="submit" taille="sm" disabled={enCours} className="self-start">
                Déléguer
              </Bouton>
            </form>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {compte.attributions_permission.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 dark:border-border-dark">
                <div>
                  <p className="font-corps text-sm text-text-body dark:text-text-inv-body">
                    {a.permission_code} — {a.perimetre_libelle || 'National'}
                  </p>
                  <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">{a.motif}</p>
                  {!a.actif && <Badge ton="neutre" libelle="Révoqué" />}
                </div>
                {a.actif && (
                  <button
                    type="button"
                    onClick={() => revoquerAttribution(a.id)}
                    disabled={enCours}
                    className="font-corps text-xs font-semibold text-error hover:underline"
                  >
                    Révoquer
                  </button>
                )}
              </div>
            ))}
            {compte.attributions_permission.length === 0 && (
              <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune délégation.</p>
            )}
          </div>
        </Carte>
      </div>

      <Carte className="mt-8">
        <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
          Scopes effectifs
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {compte.scopes.map((scope) => (
            <span
              key={scope}
              className="rounded-full bg-surface-tint px-2.5 py-1 font-corps text-xs text-text-body dark:bg-white/10 dark:text-text-inv-body"
            >
              {scope}
            </span>
          ))}
          {compte.scopes.length === 0 && (
            <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun scope.</p>
          )}
        </div>
      </Carte>
    </section>
  )
}
