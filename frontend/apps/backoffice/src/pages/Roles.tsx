import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { Pagination, PermissionRBAC, RoleRBAC } from '../types/api'

interface FormulaireRole {
  code: string
  libelle: string
  description: string
  permissions: string[]
}

const ROLE_VIDE: FormulaireRole = { code: '', libelle: '', description: '', permissions: [] }

function SelecteurPermissions({
  permissions,
  selectionnees,
  onChange,
}: {
  permissions: PermissionRBAC[]
  selectionnees: string[]
  onChange: (ids: string[]) => void
}) {
  function basculer(id: string) {
    onChange(selectionnees.includes(id) ? selectionnees.filter((p) => p !== id) : [...selectionnees, id])
  }

  const parCategorie = permissions.reduce<Record<string, PermissionRBAC[]>>((acc, p) => {
    const cle = p.categorie || 'autre'
    acc[cle] = acc[cle] ?? []
    acc[cle].push(p)
    return acc
  }, {})

  return (
    <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-bouton border border-border p-3 sm:grid-cols-2 dark:border-border-dark">
      {Object.entries(parCategorie).map(([categorie, perms]) => (
        <div key={categorie} className="flex flex-col gap-1">
          <p className="font-corps text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
            {categorie}
          </p>
          {perms.map((p) => (
            <label key={p.id} className="flex items-center gap-2 font-corps text-sm text-text-body dark:text-text-inv-body">
              <input
                type="checkbox"
                checked={selectionnees.includes(p.id)}
                onChange={() => basculer(p.id)}
                className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-accent dark:border-border-dark"
              />
              {p.code}
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

function EditionRole({ role, permissions }: { role: RoleRBAC; permissions: PermissionRBAC[] }) {
  const queryClient = useQueryClient()
  const [champs, setChamps] = useState<FormulaireRole>({
    code: role.code,
    libelle: role.libelle,
    description: role.description,
    permissions: role.permissions.map((p) => p.id),
  })
  const [enCours, setEnCours] = useState(false)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    setEnCours(true)
    try {
      await requeteApi(`/backoffice/comptes/roles/${role.id}`, {
        method: 'PATCH',
        body: JSON.stringify(champs),
      })
      await queryClient.invalidateQueries({ queryKey: ['roles-liste'] })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={enregistrer} className="mt-4 flex flex-col gap-3 border-t border-border pt-4 dark:border-border-dark">
      <ChampTexte etiquette="Libellé" required value={champs.libelle} onChange={(e) => setChamps((c) => ({ ...c, libelle: e.target.value }))} />
      <ChampTexte etiquette="Description" value={champs.description} onChange={(e) => setChamps((c) => ({ ...c, description: e.target.value }))} />
      <SelecteurPermissions
        permissions={permissions}
        selectionnees={champs.permissions}
        onChange={(ids) => setChamps((c) => ({ ...c, permissions: ids }))}
      />
      <Bouton type="submit" taille="sm" disabled={enCours} className="self-start">
        Enregistrer
      </Bouton>
    </form>
  )
}

export function Roles() {
  const queryClient = useQueryClient()
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<FormulaireRole>(ROLE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireRole, string>>>({})
  const [enCreation, setEnCreation] = useState(false)
  const [roleOuvert, setRoleOuvert] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['roles-liste'],
    queryFn: () => requeteApi<Pagination<RoleRBAC>>('/backoffice/comptes/roles?limit=200'),
  })

  const { data: permissions } = useQuery({
    queryKey: ['permissions-admin'],
    queryFn: () => requeteApi<PermissionRBAC[]>('/backoffice/comptes/permissions'),
  })

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/comptes/roles', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['roles-liste'] })
      setChamps(ROLE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireRole, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          if (messages[0]) parChamp[champ as keyof FormulaireRole] = messages[0]
        }
        setErreurs(parChamp)
      }
    } finally {
      setEnCreation(false)
    }
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">Rôles</h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Un rôle regroupe un ensemble cohérent de permissions.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Créer un rôle
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte etiquette="Code" required value={champs.code} onChange={(e) => setChamps((c) => ({ ...c, code: e.target.value }))} erreur={erreurs.code} />
            <ChampTexte etiquette="Libellé" required value={champs.libelle} onChange={(e) => setChamps((c) => ({ ...c, libelle: e.target.value }))} erreur={erreurs.libelle} />
            <ChampTexte etiquette="Description" value={champs.description} onChange={(e) => setChamps((c) => ({ ...c, description: e.target.value }))} />
            <SelecteurPermissions
              permissions={permissions ?? []}
              selectionnees={champs.permissions}
              onChange={(ids) => setChamps((c) => ({ ...c, permissions: ids }))}
            />
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer le rôle'}
            </Bouton>
          </form>
        </Carte>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les rôles.</p>}

      <motion.div className="mt-6 flex flex-col gap-3" variants={conteneurEnCascade()} initial="hidden" animate="visible">
        {(data?.results ?? []).map((role) => (
          <motion.div key={role.id} variants={elementEnCascade}>
            <Carte>
              <button
                type="button"
                onClick={() => setRoleOuvert(roleOuvert === role.id ? null : role.id)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <div>
                  <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">{role.libelle}</p>
                  <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                    {role.permissions.length} permission(s)
                  </p>
                </div>
                {roleOuvert === role.id ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
              </button>
              {roleOuvert === role.id && <EditionRole role={role} permissions={permissions ?? []} />}
            </Carte>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun rôle.</p>
        )}
      </motion.div>
    </section>
  )
}
