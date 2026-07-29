import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import { categoriesReinsertion } from '../data/reinsertion'
import type { GalerieResume } from '../types/api'

const degrades = [
  ['#0B6E4F', '#123524'],
  ['#123524', '#C9A227'],
  ['#0B6E4F', '#0B5FA5'],
  ['#095C42', '#1B7F3B'],
]

export function ReinsertionIndex() {
  const { data: galeries } = useQuery({
    queryKey: ['galeries', 'reinsertion-'],
    queryFn: () => requeteApi<GalerieResume[]>('/galeries?prefixe=reinsertion-'),
    retry: false,
  })

  function couvertureDe(slug: string): string {
    return galeries?.find((g) => g.code === `reinsertion-${slug}`)?.couverture ?? ''
  }

  return (
    <>
      <Helmet>
        <title>La Réinsertion — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Ateliers de travail et de formation proposés aux personnes détenues : menuiserie, mécanique, couture, boulangerie et plus encore."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">La Réinsertion</h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Ateliers de travail, formation et production : autant de voies vers une meilleure
              réinsertion sociale des personnes détenues.
            </p>
          </motion.div>
        </div>
      </section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={conteneurEnCascade()}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {categoriesReinsertion.map((categorie, i) => {
            const [de, a] = degrades[i % degrades.length]!
            const couverture = couvertureDe(categorie.slug)
            return (
              <motion.div key={categorie.slug} variants={elementEnCascade}>
                <Link
                  to={`/reinsertion/${categorie.slug}`}
                  className="group block overflow-hidden rounded-carte border border-border bg-white shadow-legere dark:border-border-dark dark:bg-surface-dark-alt
                             transition-shadow duration-200 ease-dgap hover:shadow-portee
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div
                    className="relative flex h-36 items-center justify-center overflow-hidden"
                    style={couverture ? undefined : { background: `linear-gradient(135deg, ${de}, ${a})` }}
                  >
                    {couverture && (
                      <>
                        <img
                          src={couverture}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-dgap group-hover:scale-105"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0"
                          aria-hidden="true"
                        />
                      </>
                    )}
                    <categorie.icone
                      size={40}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className={
                        couverture
                          ? 'relative text-white drop-shadow-md transition-transform duration-300 ease-dgap group-hover:scale-110'
                          : 'text-white/90 transition-transform duration-300 ease-dgap group-hover:scale-110'
                      }
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">{categorie.titre}</h2>
                    <p className="mt-2 line-clamp-2 font-corps text-sm text-text-muted dark:text-text-inv-muted">{categorie.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 font-corps text-sm font-medium text-primary">
                      Découvrir
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                        className="transition-transform duration-200 ease-dgap group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.section>
    </>
  )
}
