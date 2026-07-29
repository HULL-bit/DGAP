import { useEffect, useState, type ChangeEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, ImageIcon, Trash2, Upload } from 'lucide-react'
import { requeteApi, requeteApiFichier, ApiError } from '@dgap/api-client'
import { Bouton, ChampTexte, Carte, propsApparition } from '@dgap/ui'
import type { ProduitBoutique } from '../types/api'

const EXTENSIONS_AUTORISEES = ['.jpg', '.jpeg', '.png', '.webp']
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024

interface Formulaire {
  nom: string
  slug: string
  categorie: string
  description: string
  prix: string
  prix_promotionnel: string
  ordre: string
}

export function ProduitEditeur() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [champs, setChamps] = useState<Formulaire | null>(null)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Formulaire, string>>>({})
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [enTeleversement, setEnTeleversement] = useState(false)
  const [erreurImage, setErreurImage] = useState<string | null>(null)

  const { data: produit, isLoading } = useQuery({
    queryKey: ['backoffice-produit-detail', id],
    queryFn: () => requeteApi<ProduitBoutique>(`/backoffice/boutique/produits/${id}`),
  })

  useEffect(() => {
    if (produit) {
      setChamps({
        nom: produit.nom,
        slug: produit.slug,
        categorie: produit.categorie,
        description: produit.description,
        prix: produit.prix,
        prix_promotionnel: produit.prix_promotionnel ?? '',
        ordre: produit.ordre.toString(),
      })
    }
  }, [produit])

  async function invalider() {
    await queryClient.invalidateQueries({ queryKey: ['backoffice-produit-detail', id] })
    await queryClient.invalidateQueries({ queryKey: ['backoffice-produits'] })
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
      await requeteApi(`/backoffice/boutique/produits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...champs,
          prix_promotionnel: champs.prix_promotionnel || null,
          ordre: Number(champs.ordre) || 0,
        }),
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

  async function basculerDisponibilite() {
    if (!produit) return
    await requeteApi(`/backoffice/boutique/produits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ disponible: !produit.disponible }),
    })
    await invalider()
  }

  async function televerserImage(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const nomMinuscule = fichier.name.toLowerCase()
    if (!EXTENSIONS_AUTORISEES.some((ext) => nomMinuscule.endsWith(ext))) {
      setErreurImage('Formats acceptés : JPG, PNG, WEBP.')
      return
    }
    if (fichier.size > TAILLE_MAX_OCTETS) {
      setErreurImage('Fichier trop volumineux (8 Mo maximum).')
      return
    }
    setErreurImage(null)
    setEnTeleversement(true)
    try {
      const donnees = new FormData()
      donnees.append('image', fichier)
      await requeteApiFichier(`/backoffice/boutique/produits/${id}/image`, donnees)
      await invalider()
    } catch {
      setErreurImage("L'image n'a pas pu être téléversée.")
    } finally {
      setEnTeleversement(false)
    }
  }

  async function supprimerImage() {
    await requeteApi(`/backoffice/boutique/produits/${id}/image`, { method: 'DELETE' })
    await invalider()
  }

  async function supprimer() {
    await requeteApi(`/backoffice/boutique/produits/${id}`, { method: 'DELETE' })
    navigate('/boutique')
  }

  if (isLoading || !produit || !champs) {
    return <p className="mx-auto max-w-conteneur px-6 py-10 font-corps text-sm text-text-muted">Chargement…</p>
  }

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <Link
        to="/boutique"
        className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Boutique
      </Link>

      <motion.div className="mt-4 flex items-center justify-between gap-4" {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">{produit.nom}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={basculerDisponibilite}
            aria-label={produit.disponible ? 'Masquer' : 'Rendre disponible'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-tint hover:text-primary dark:text-text-inv-muted dark:hover:bg-white/5"
          >
            {produit.disponible ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
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
            etiquette="Nom"
            required
            value={champs.nom}
            onChange={(e) => majChamp('nom', e.target.value)}
            erreur={erreurs.nom}
          />
          <ChampTexte
            etiquette="Slug"
            required
            value={champs.slug}
            onChange={(e) => majChamp('slug', e.target.value)}
            erreur={erreurs.slug}
          />
          <ChampTexte
            etiquette="Catégorie"
            value={champs.categorie}
            onChange={(e) => majChamp('categorie', e.target.value)}
            erreur={erreurs.categorie}
          />
          <ChampTexte
            etiquette="Description"
            value={champs.description}
            onChange={(e) => majChamp('description', e.target.value)}
            erreur={erreurs.description}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampTexte
              etiquette="Prix (FCFA)"
              type="number"
              min="0"
              required
              value={champs.prix}
              onChange={(e) => majChamp('prix', e.target.value)}
              erreur={erreurs.prix}
            />
            <ChampTexte
              etiquette="Prix promotionnel (facultatif, FCFA)"
              type="number"
              min="0"
              value={champs.prix_promotionnel}
              onChange={(e) => majChamp('prix_promotionnel', e.target.value)}
              erreur={erreurs.prix_promotionnel}
            />
          </div>
          <ChampTexte
            etiquette="Ordre d'affichage"
            type="number"
            min="0"
            value={champs.ordre}
            onChange={(e) => majChamp('ordre', e.target.value)}
            erreur={erreurs.ordre}
          />

          {message && <p className="font-corps text-sm text-text-body dark:text-text-inv-body">{message}</p>}

          <Bouton onClick={enregistrer} disabled={enregistrement} className="self-start">
            {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>

        <Carte className="h-fit">
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
            Photo du produit
          </h2>
          <div className="mt-3 flex h-40 items-center justify-center overflow-hidden rounded-bouton bg-surface-tint dark:bg-white/5">
            {produit.image_url ? (
              <img src={produit.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={32} className="text-text-muted dark:text-text-inv-muted" aria-hidden="true" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-bouton bg-primary px-3.5 py-2 font-corps text-sm font-semibold text-white transition-colors duration-200 ease-dgap hover:bg-primary-dark">
              <Upload size={16} aria-hidden="true" />
              {enTeleversement ? 'Téléversement…' : produit.image_url ? "Remplacer l'image" : 'Téléverser une image'}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="sr-only"
                disabled={enTeleversement}
                onChange={televerserImage}
              />
            </label>
            {produit.image_url && (
              <button
                type="button"
                onClick={supprimerImage}
                className="font-corps text-sm font-medium text-error hover:underline"
              >
                Retirer
              </button>
            )}
          </div>
          {erreurImage && (
            <p role="alert" className="mt-2 font-corps text-sm text-error">
              {erreurImage}
            </p>
          )}
        </Carte>
      </div>
    </section>
  )
}
