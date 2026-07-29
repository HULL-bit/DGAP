import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Film, ImageIcon, Trash2, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition } from '@dgap/ui'
import type { Galerie, MediaGalerie, TypeMedia } from '../types/api'

const EXTENSIONS_AUTORISEES = ['.jpg', '.jpeg', '.png', '.webp']
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024

export function GalerieEditeur() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [typeAjout, setTypeAjout] = useState<TypeMedia>('IMAGE')
  const [fichierImage, setFichierImage] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [legende, setLegende] = useState('')
  const [erreurAjout, setErreurAjout] = useState<string | null>(null)
  const [enAjout, setEnAjout] = useState(false)

  const { data: galerie, isLoading } = useQuery({
    queryKey: ['backoffice-galerie', id],
    queryFn: () => requeteApi<Galerie>(`/backoffice/galeries/${id}`),
  })

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['backoffice-galerie', id] })
  }

  function choisirImage(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0] ?? null
    setErreurAjout(null)
    if (fichier) {
      const nomMinuscule = fichier.name.toLowerCase()
      if (!EXTENSIONS_AUTORISEES.some((ext) => nomMinuscule.endsWith(ext))) {
        setErreurAjout('Formats acceptés : JPG, PNG, WEBP.')
        setFichierImage(null)
        return
      }
      if (fichier.size > TAILLE_MAX_OCTETS) {
        setErreurAjout('Fichier trop volumineux (8 Mo maximum).')
        setFichierImage(null)
        return
      }
    }
    setFichierImage(fichier)
  }

  async function ajouterMedia(e: FormEvent) {
    e.preventDefault()
    setErreurAjout(null)
    setEnAjout(true)
    try {
      if (typeAjout === 'IMAGE') {
        if (!fichierImage) {
          setErreurAjout('Sélectionnez une image.')
          return
        }
        const donnees = new FormData()
        donnees.append('type', 'IMAGE')
        donnees.append('image', fichierImage)
        donnees.append('legende', legende)
        await requeteApiFichier(`/backoffice/galeries/${id}/medias`, donnees)
      } else {
        if (!videoUrl.trim()) {
          setErreurAjout('Indiquez un lien vidéo (YouTube, Vimeo…).')
          return
        }
        await requeteApi(`/backoffice/galeries/${id}/medias`, {
          method: 'POST',
          body: JSON.stringify({ type: 'VIDEO', video_url: videoUrl, legende }),
        })
      }
      setFichierImage(null)
      setVideoUrl('')
      setLegende('')
      await invalider()
    } catch (err) {
      if (err instanceof ApiError) {
        setErreurAjout(err.probleme.detail ?? "Le média n'a pas pu être ajouté.")
      } else {
        setErreurAjout("Le média n'a pas pu être ajouté.")
      }
    } finally {
      setEnAjout(false)
    }
  }

  async function basculerPublication(media: MediaGalerie) {
    await requeteApi(`/backoffice/medias/${media.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ publie: !media.publie }),
    })
    await invalider()
  }

  async function supprimerMedia(media: MediaGalerie) {
    await requeteApi(`/backoffice/medias/${media.id}`, { method: 'DELETE' })
    await invalider()
  }

  if (isLoading || !galerie) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/galeries"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Galeries
      </Link>

      <motion.div className="mt-4" {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          {galerie.titre}
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Code : <code className="font-mono">{galerie.code}</code>
        </p>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {galerie.medias.length === 0 && (
            <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
              Aucun média pour le moment.
            </p>
          )}
          {galerie.medias.map((media) => (
            <Carte key={media.id} className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-bouton bg-surface-tint dark:bg-white/5">
                {media.type === 'IMAGE' && media.image ? (
                  <img src={media.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Film size={24} className="text-text-muted dark:text-text-inv-muted" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  {media.legende || (media.type === 'IMAGE' ? 'Image sans légende' : media.video_url)}
                </p>
                <p className="mt-0.5 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  {media.type === 'IMAGE' ? 'Image' : 'Vidéo'} · {media.publie ? 'Publié' : 'Masqué'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => basculerPublication(media)}
                aria-label={media.publie ? 'Masquer' : 'Publier'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-tint hover:text-primary dark:text-text-inv-muted dark:hover:bg-white/5"
              >
                {media.publie ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => supprimerMedia(media)}
                aria-label="Supprimer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-error/10 hover:text-error dark:text-text-inv-muted"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </Carte>
          ))}
        </div>

        <Carte className="h-fit">
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
            Ajouter un média
          </h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setTypeAjout('IMAGE')}
              className={`flex-1 rounded-bouton border px-3 py-2 font-corps text-sm font-medium transition-colors duration-200 ease-dgap ${
                typeAjout === 'IMAGE'
                  ? 'border-primary bg-primary text-white'
                  : 'border-border text-text-strong hover:bg-surface-tint dark:border-border-dark dark:text-text-inv-strong'
              }`}
            >
              <ImageIcon size={14} className="mr-1.5 inline" aria-hidden="true" />
              Image
            </button>
            <button
              type="button"
              onClick={() => setTypeAjout('VIDEO')}
              className={`flex-1 rounded-bouton border px-3 py-2 font-corps text-sm font-medium transition-colors duration-200 ease-dgap ${
                typeAjout === 'VIDEO'
                  ? 'border-primary bg-primary text-white'
                  : 'border-border text-text-strong hover:bg-surface-tint dark:border-border-dark dark:text-text-inv-strong'
              }`}
            >
              <Film size={14} className="mr-1.5 inline" aria-hidden="true" />
              Vidéo
            </button>
          </div>

          <form onSubmit={ajouterMedia} className="mt-4 flex flex-col gap-3" noValidate>
            {typeAjout === 'IMAGE' ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fichier-media" className="font-corps text-sm font-medium text-text-strong dark:text-text-inv-strong">
                  Fichier image
                </label>
                <input
                  id="fichier-media"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={choisirImage}
                  className="block w-full font-corps text-sm text-text-body file:mr-3 file:rounded-bouton file:border-0 file:bg-primary file:px-3 file:py-2 file:font-titre file:font-semibold file:text-white dark:text-text-inv-body"
                />
              </div>
            ) : (
              <ChampTexte
                etiquette="Lien vidéo (YouTube, Vimeo…)"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            )}
            <ChampTexte
              etiquette="Légende (facultative)"
              value={legende}
              onChange={(e) => setLegende(e.target.value)}
            />
            {erreurAjout && (
              <p role="alert" className="font-corps text-sm text-error">
                {erreurAjout}
              </p>
            )}
            <Bouton type="submit" disabled={enAjout} taille="sm">
              <Upload size={16} aria-hidden="true" />
              {enAjout ? 'Ajout en cours…' : 'Ajouter'}
            </Bouton>
          </form>
        </Carte>
      </div>
    </section>
  )
}
