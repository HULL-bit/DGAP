import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Package, Plus } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Badge, Bouton, ChampTexte, Carte, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { Pagination, ProduitBoutique } from '../types/api'

interface FormulaireProduit {
  nom: string
  slug: string
  categorie: string
  prix: string
}

const FORMULAIRE_VIDE: FormulaireProduit = { nom: '', slug: '', categorie: '', prix: '' }

export function ProduitsListe() {
  const queryClient = useQueryClient()
  const [filtre, setFiltre] = useState('')
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)
  const [champs, setChamps] = useState<FormulaireProduit>(FORMULAIRE_VIDE)
  const [erreurs, setErreurs] = useState<Partial<Record<keyof FormulaireProduit, string>>>({})
  const [enCreation, setEnCreation] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backoffice-produits'],
    queryFn: () => requeteApi<Pagination<ProduitBoutique>>('/backoffice/boutique/produits?limit=100'),
  })

  const produits = data?.results ?? []
  const categories = useMemo(
    () => Array.from(new Set((data?.results ?? []).map((p) => p.categorie).filter(Boolean))).sort(),
    [data],
  )
  const produitsFiltres = produits.filter((p) => !filtre || p.categorie === filtre)

  function majChamp(champ: keyof FormulaireProduit, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  async function creer(e: FormEvent) {
    e.preventDefault()
    setErreurs({})
    setEnCreation(true)
    try {
      await requeteApi('/backoffice/boutique/produits', { method: 'POST', body: JSON.stringify(champs) })
      await queryClient.invalidateQueries({ queryKey: ['backoffice-produits'] })
      setChamps(FORMULAIRE_VIDE)
      setAfficherFormulaire(false)
    } catch (err) {
      if (err instanceof ApiError && err.probleme.erreurs_champs) {
        const parChamp: Partial<Record<keyof FormulaireProduit, string>> = {}
        for (const [champ, messages] of Object.entries(err.probleme.erreurs_champs)) {
          parChamp[champ as keyof FormulaireProduit] = messages[0]
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
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">Boutique</h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Vitrine des produits fabriqués par les personnes détenues — catalogue de présentation, sans paiement en ligne.
          </p>
        </div>
        <Bouton onClick={() => setAfficherFormulaire((v) => !v)} className="gap-1.5">
          <Plus size={18} aria-hidden="true" />
          Nouveau produit
        </Bouton>
      </motion.div>

      {afficherFormulaire && (
        <Carte className="mt-6 max-w-2xl">
          <form onSubmit={creer} className="flex flex-col gap-4" noValidate>
            <ChampTexte
              etiquette="Nom"
              required
              value={champs.nom}
              onChange={(e) => majChamp('nom', e.target.value)}
              erreur={erreurs.nom}
            />
            <ChampTexte
              etiquette="Slug (identifiant technique)"
              required
              value={champs.slug}
              onChange={(e) => majChamp('slug', e.target.value)}
              erreur={erreurs.slug}
            />
            <ChampTexte
              etiquette="Catégorie (ex. Jus locaux, Produits d'entretien, Mobilier)"
              value={champs.categorie}
              onChange={(e) => majChamp('categorie', e.target.value)}
              erreur={erreurs.categorie}
            />
            <ChampTexte
              etiquette="Prix (FCFA)"
              type="number"
              min="0"
              required
              value={champs.prix}
              onChange={(e) => majChamp('prix', e.target.value)}
              erreur={erreurs.prix}
            />
            <Bouton type="submit" disabled={enCreation} className="self-start">
              {enCreation ? 'Création…' : 'Créer le produit'}
            </Bouton>
          </form>
        </Carte>
      )}

      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFiltre('')}
            className={`rounded-full px-3.5 py-2 font-corps text-sm font-semibold transition-colors duration-200 ease-dgap
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                       ${
                         filtre === ''
                           ? 'bg-primary text-white'
                           : 'bg-surface-tint text-text-strong hover:bg-surface-muted dark:bg-white/5 dark:text-text-inv-body'
                       }`}
          >
            Toutes
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFiltre(c)}
              className={`rounded-full px-3.5 py-2 font-corps text-sm font-semibold transition-colors duration-200 ease-dgap
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                         ${
                           filtre === c
                             ? 'bg-primary text-white'
                             : 'bg-surface-tint text-text-strong hover:bg-surface-muted dark:bg-white/5 dark:text-text-inv-body'
                         }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les produits.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {produitsFiltres.map((produit) => {
          const ton: TonBadge = produit.disponible ? 'succes' : 'neutre'
          return (
            <motion.div key={produit.id} variants={elementEnCascade}>
              <Link
                to={`/boutique/${produit.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-tint text-primary dark:bg-white/10 dark:text-accent-soft">
                    {produit.image_url ? (
                      <img src={produit.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package size={18} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                      {produit.nom}
                    </p>
                    <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                      {produit.categorie && `${produit.categorie} · `}
                      {Number(produit.prix).toLocaleString('fr-SN')} FCFA
                    </p>
                  </div>
                </div>
                <Badge ton={ton} libelle={produit.disponible ? 'Disponible' : 'Masqué'} />
              </Link>
            </motion.div>
          )
        })}
        {!isLoading && produitsFiltres.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun produit.</p>
        )}
      </motion.div>
    </section>
  )
}
