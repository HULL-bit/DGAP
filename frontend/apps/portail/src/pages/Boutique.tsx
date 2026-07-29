import { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Package } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import type { Pagination, ProduitBoutique } from '../types/api'

function formaterPrix(valeur: string): string {
  return `${Number(valeur).toLocaleString('fr-SN')} FCFA`
}

export function Boutique() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['boutique'],
    queryFn: () => requeteApi<Pagination<ProduitBoutique>>('/boutique/produits?limit=100'),
  })

  const parCategorie = useMemo(() => {
    const groupes = new Map<string, ProduitBoutique[]>()
    for (const produit of data?.results ?? []) {
      const cle = produit.categorie || 'Autres produits'
      const liste = groupes.get(cle) ?? []
      liste.push(produit)
      groupes.set(cle, liste)
    }
    return groupes
  }, [data])

  return (
    <>
      <Helmet>
        <title>Boutique — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Produits fabriqués par les personnes détenues dans le cadre des ateliers de réinsertion : jus locaux, produits d'entretien, mobilier, céréales."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Boutique
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Des produits fabriqués par les personnes détenues dans le cadre des ateliers de travail et de
              réinsertion. Catalogue de présentation — pour toute commande, contactez l'établissement concerné.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
        {isLoading && <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
        {isError && <p className="font-corps text-sm text-error">Impossible de charger la boutique.</p>}

        <div className="flex flex-col gap-12">
          {Array.from(parCategorie.entries()).map(([categorie, produits]) => (
            <div key={categorie}>
              <h2 className="font-titre text-xl font-bold text-text-strong dark:text-text-inv-strong">{categorie}</h2>
              <motion.div
                className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                variants={conteneurEnCascade()}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {produits.map((produit) => (
                  <motion.div
                    key={produit.id}
                    variants={elementEnCascade}
                    className="overflow-hidden rounded-carte border border-border bg-white shadow-legere transition-shadow duration-200 ease-dgap hover:shadow-portee dark:border-border-dark dark:bg-surface-dark-alt"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary-dark">
                      {produit.image_url ? (
                        <img src={produit.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package size={40} strokeWidth={1.5} aria-hidden="true" className="text-white/70" />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                        {produit.nom}
                      </p>
                      {produit.description && (
                        <p className="mt-1 line-clamp-2 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                          {produit.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-baseline gap-2">
                        {produit.prix_promotionnel ? (
                          <>
                            <span className="font-titre text-lg font-bold text-primary dark:text-accent-soft">
                              {formaterPrix(produit.prix_promotionnel)}
                            </span>
                            <span className="font-corps text-sm text-text-muted line-through dark:text-text-inv-muted">
                              {formaterPrix(produit.prix)}
                            </span>
                          </>
                        ) : (
                          <span className="font-titre text-lg font-bold text-text-strong dark:text-text-inv-strong">
                            {formaterPrix(produit.prix)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}

          {!isLoading && parCategorie.size === 0 && (
            <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun produit disponible pour le moment.</p>
          )}
        </div>

        <p className="mt-12 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Pour toute question ou commande, <Link to="/contact" className="font-medium text-primary hover:underline dark:text-accent-soft">contactez-nous</Link>.
        </p>
      </section>
    </>
  )
}
