import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, CheckCircle2, Eye, EyeOff, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import { useAuth } from '../auth/AuthContext'
import type { NoteDeService, Pagination } from '../types/api'

interface PerimetreOption {
  id: string
  code: string
  libelle: string
}

interface NoteGestion {
  id: string
  titre: string
  contenu: string
  perimetre_cible: string
  perimetre_cible_libelle: string
  accuse_lecture_requis: boolean
  publie: boolean
  nombre_lectures: number
}

interface Formulaire {
  titre: string
  contenu: string
  perimetre_cible: string
  accuse_lecture_requis: boolean
}

const FORMULAIRE_VIDE: Formulaire = { titre: '', contenu: '', perimetre_cible: '', accuse_lecture_requis: false }

function GestionNotes() {
  const queryClient = useQueryClient()
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<Formulaire>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data: perimetres } = useQuery({
    queryKey: ['perimetres'],
    queryFn: () => requeteApi<PerimetreOption[]>('/perimetres'),
  })

  const { data: notesGestion, isLoading } = useQuery({
    queryKey: ['intranet-notes-gestion'],
    queryFn: () => requeteApi<Pagination<NoteGestion>>('/backoffice/intranet/notes?limit=100'),
  })

  function majChamp<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/intranet/notes', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['intranet-notes-gestion'] })
      await queryClient.invalidateQueries({ queryKey: ['intranet-notes'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof Formulaire, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof Formulaire] = messages[0]
        }
        setErreurs(parChamp)
      }
    } finally {
      setEnCreation(false)
    }
  }

  async function basculerPublication(note: NoteGestion) {
    await requeteApi(`/backoffice/intranet/notes/${note.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ publie: !note.publie }),
    })
    await queryClient.invalidateQueries({ queryKey: ['intranet-notes-gestion'] })
    await queryClient.invalidateQueries({ queryKey: ['intranet-notes'] })
  }

  return (
    <section className="mb-10 border-b border-border pb-10 dark:border-border-dark">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">
          Gérer les notes de service
        </h2>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5" taille="sm">
          <Plus size={16} aria-hidden="true" />
          Nouvelle note
        </Bouton>
      </div>

      {afficherFormulaire && (
        <Carte className="mt-4 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Titre"
              required
              value={champs.titre}
              onChange={(e) => majChamp('titre', e.target.value)}
              erreur={erreurs.titre}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contenu" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Contenu
              </label>
              <textarea
                id="contenu"
                required
                rows={4}
                value={champs.contenu}
                onChange={(e) => majChamp('contenu', e.target.value)}
                className="rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="perimetre" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Diffusion
              </label>
              <select
                id="perimetre"
                required
                value={champs.perimetre_cible}
                onChange={(e) => majChamp('perimetre_cible', e.target.value)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
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
            <label className="flex items-center gap-2 font-corps text-sm text-text-body dark:text-text-inv-body">
              <input
                type="checkbox"
                checked={champs.accuse_lecture_requis}
                onChange={(e) => majChamp('accuse_lecture_requis', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-accent dark:border-border-dark"
              />
              Exiger un accusé de lecture
            </label>
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Publier la note'}
            </Bouton>
          </form>
        </Carte>
      )}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(notesGestion?.results ?? []).map((note) => (
          <motion.div
            key={note.id}
            variants={elementEnCascade}
            className="flex items-center justify-between gap-4 p-5"
          >
            <div className="min-w-0">
              <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                {note.titre}
              </p>
              <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                {note.perimetre_cible_libelle} · {note.nombre_lectures} lecture(s)
                {note.accuse_lecture_requis && ' · accusé requis'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => basculerPublication(note)}
              aria-label={note.publie ? 'Dépublier' : 'Publier'}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-tint hover:text-primary dark:text-text-inv-muted dark:hover:bg-white/5"
            >
              {note.publie ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            </button>
          </motion.div>
        ))}
        {!isLoading && (notesGestion?.results.length ?? 0) === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune note.</p>
        )}
      </motion.div>
    </section>
  )
}

export function NotesDeService() {
  const { possedeScope } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['intranet-notes'],
    queryFn: () => requeteApi<Pagination<NoteDeService>>('/intranet/notes?limit=100'),
  })

  async function marquerLue(note: NoteDeService) {
    await requeteApi(`/intranet/notes/${note.id}/lecture`, { method: 'POST' })
    await queryClient.invalidateQueries({ queryKey: ['intranet-notes'] })
    await queryClient.invalidateQueries({ queryKey: ['intranet-notes-accueil'] })
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.h1
        className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong"
        {...propsApparition()}
      >
        Notes de service
      </motion.h1>

      {possedeScope('intranet:publier') && (
        <div className="mt-8">
          <GestionNotes />
        </div>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les notes.</p>}

      <motion.div
        className="mt-8 flex flex-col gap-3"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {(data?.results ?? []).map((note) => (
          <motion.div key={note.id} variants={elementEnCascade}>
            <Carte>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                    <Bell size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                      {note.titre}
                    </p>
                    <p className="font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      {note.perimetre_cible_libelle} ·{' '}
                      {new Date(note.cree_le).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="mt-2 font-corps text-sm text-text-body dark:text-text-inv-body">{note.contenu}</p>
                  </div>
                </div>
                {note.accuse_lecture_requis && (
                  <button
                    type="button"
                    onClick={() => marquerLue(note)}
                    disabled={note.lu}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-corps text-xs font-semibold transition-colors duration-200 ease-dgap
                               ${
                                 note.lu
                                   ? 'bg-succes/10 text-succes'
                                   : 'bg-primary text-white hover:bg-primary-dark'
                               }`}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {note.lu ? 'Lu' : 'Marquer comme lu'}
                  </button>
                )}
              </div>
            </Carte>
          </motion.div>
        ))}
        {!isLoading && data?.results.length === 0 && (
          <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucune note de service.</p>
        )}
      </motion.div>
    </section>
  )
}
