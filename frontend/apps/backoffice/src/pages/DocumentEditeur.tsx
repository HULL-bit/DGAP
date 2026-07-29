import { useEffect, useState, type ChangeEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, FileText, Trash2, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition } from '@dgap/ui'
import type { DocumentOfficiel, NatureDocument, StatutDocument } from '../types/api'
import { LIBELLES_NATURE_DOCUMENT } from '../types/api'

const OPTIONS_STATUT: { valeur: StatutDocument; libelle: string }[] = [
  { valeur: 'EN_VIGUEUR', libelle: 'En vigueur' },
  { valeur: 'ABROGE', libelle: 'Abrogé' },
]

interface Formulaire {
  titre: string
  nature: NatureDocument
  numero: string
  date_texte: string
  categorie: string
  statut: StatutDocument
}

export function DocumentEditeur() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [champs, setChamps] = useState<Formulaire | null>(null)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [enTeleversement, setEnTeleversement] = useState(false)
  const [erreurFichier, setErreurFichier] = useState<string | null>(null)

  const { data: document, isLoading } = useQuery({
    queryKey: ['backoffice-document-detail', id],
    queryFn: () => requeteApi<DocumentOfficiel>(`/backoffice/documents/${id}`),
  })

  useEffect(() => {
    if (document) {
      setChamps({
        titre: document.titre,
        nature: document.nature,
        numero: document.numero,
        date_texte: document.date_texte ?? '',
        categorie: document.categorie,
        statut: document.statut,
      })
    }
  }, [document])

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['backoffice-document-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['backoffice-documents'] })
  }

  function majChamp<K extends keyof Formulaire>(champ: K, valeur: Formulaire[K]) {
    setChamps((c) => (c ? { ...c, [champ]: valeur } : c))
  }

  async function enregistrer() {
    if (!champs) return
    setEnregistrement(true)
    setErreurs({})
    setMessage(null)
    try {
      await requeteApi(`/backoffice/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...champs, date_texte: champs.date_texte || null }),
      })
      await invalider()
      setMessage('Modifications enregistrées.')
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof Formulaire, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof Formulaire] = messages[0]
        }
        setErreurs(parChamp)
      }
    } finally {
      setEnregistrement(false)
    }
  }

  async function basculerPublication() {
    if (!document) return
    await requeteApi(`/backoffice/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ publie: !document.publie }),
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
    setEnTeleversement(true)
    try {
      const donnees = new FormData()
      donnees.append('fichier', fichier)
      await requeteApiFichier(`/backoffice/documents/${id}/fichier`, donnees)
      await invalider()
    } catch (err) {
      setErreurFichier(err instanceof ApiError ? (err.probleme.detail ?? "Le fichier n'a pas pu être téléversé.") : "Le fichier n'a pas pu être téléversé.")
    } finally {
      setEnTeleversement(false)
    }
  }

  async function supprimer() {
    await requeteApi(`/backoffice/documents/${id}`, { method: 'DELETE' })
    navigate('/documents')
  }

  if (isLoading || !document || !champs) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Documents officiels
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">{document.titre}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={basculerPublication}
            aria-label={document.publie ? 'Dépublier' : 'Publier'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-tint hover:text-primary dark:text-text-inv-muted dark:hover:bg-white/5"
          >
            {document.publie ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={supprimer}
            aria-label="Supprimer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-error/10 hover:text-error dark:text-text-inv-muted"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ChampTexte
            etiquette="Titre"
            required
            value={champs.titre}
            onChange={(e) => majChamp('titre', e.target.value)}
            erreur={erreurs.titre}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nature" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Nature
              </label>
              <select
                id="nature"
                value={champs.nature}
                onChange={(e) => majChamp('nature', e.target.value as NatureDocument)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {(Object.entries(LIBELLES_NATURE_DOCUMENT) as [NatureDocument, string][]).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="statut" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                Statut
              </label>
              <select
                id="statut"
                value={champs.statut}
                onChange={(e) => majChamp('statut', e.target.value as StatutDocument)}
                className="min-h-[44px] rounded-bouton border border-border bg-white px-3 py-2 font-corps text-base text-text-body
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:border-border-dark dark:bg-white/5 dark:text-text-inv-body"
              >
                {OPTIONS_STATUT.map((o) => (
                  <option key={o.valeur} value={o.valeur}>
                    {o.libelle}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampTexte
              etiquette="Numéro (facultatif)"
              value={champs.numero}
              onChange={(e) => majChamp('numero', e.target.value)}
              erreur={erreurs.numero}
            />
            <ChampTexte
              etiquette="Date du texte (facultative)"
              type="date"
              value={champs.date_texte}
              onChange={(e) => majChamp('date_texte', e.target.value)}
              erreur={erreurs.date_texte}
            />
          </div>
          <ChampTexte
            etiquette="Catégorie (regroupement portail)"
            value={champs.categorie}
            onChange={(e) => majChamp('categorie', e.target.value)}
            erreur={erreurs.categorie}
          />

          {message && <p className="font-corps text-sm text-text-body dark:text-text-inv-body">{message}</p>}

          <Bouton onClick={enregistrer} disabled={enregistrement} className="self-start">
            {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>

        <Carte className="h-fit">
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
            Fichier (PDF)
          </h2>
          {document.fichier_url ? (
            <a
              href={document.fichier_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              <FileText size={16} aria-hidden="true" />
              Voir le fichier actuel
            </a>
          ) : (
            <p className="mt-3 font-corps text-sm text-text-muted dark:text-text-inv-muted">
              Aucun fichier téléversé — le document n'est pas encore téléchargeable par les citoyens.
            </p>
          )}
          <label className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-bouton bg-primary px-3.5 py-2 font-corps text-sm font-semibold text-white transition-colors duration-200 ease-dgap hover:bg-primary-dark">
            <Upload size={16} aria-hidden="true" />
            {enTeleversement ? 'Téléversement…' : document.fichier_url ? 'Remplacer le fichier' : 'Téléverser le fichier'}
            <input type="file" accept=".pdf" className="sr-only" disabled={enTeleversement} onChange={televerserFichier} />
          </label>
          {erreurFichier && (
            <p role="alert" className="mt-2 font-corps text-sm text-error">
              {erreurFichier}
            </p>
          )}
        </Carte>
      </div>
    </section>
  )
}
