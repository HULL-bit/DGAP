import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { propsApparition } from '@dgap/ui'
import { trouverCategorie } from '../data/reinsertion'

const degradesGalerie = [
  ['#0B6E4F', '#123524'],
  ['#123524', '#C9A227'],
  ['#0B6E4F', '#0B5FA5'],
  ['#095C42', '#1B7F3B'],
  ['#C9A227', '#123524'],
  ['#0B5FA5', '#123524'],
]

/**
 * Page dynamique par atelier — un seul gabarit paramétré par `slug` plutôt que
 * treize pages dupliquées (§16 — pas de sur-ingénierie). Les vignettes sont des
 * dégradés de charte : aucune photographie d'atelier réelle n'est encore
 * disponible (Bloc B — médiathèque).
 */
export function ReinsertionCategorie() {
  const { slug } = useParams<{ slug: string }>()
  const categorie = trouverCategorie(slug)

  if (!categorie) {
    return <Navigate to="/reinsertion" replace />
  }

  return (
    <>
      <Helmet>
        <title>{categorie.titre} — La Réinsertion — DGAP</title>
        <meta name="description" content={categorie.description} />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <Link
            to="/reinsertion"
            className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            La Réinsertion
          </Link>
          <motion.div className="mt-4" {...propsApparition()}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
                <categorie.icone size={26} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h1 className="font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong sm:text-4xl">{categorie.titre}</h1>
            </div>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">{categorie.description}</p>
          </motion.div>
        </div>
      </section>

      <motion.section className="mx-auto max-w-conteneur px-6 py-20 sm:px-8" {...propsApparition()}>
        <h2 className="font-titre text-xl font-bold text-text-strong dark:text-text-inv-strong">Galerie</h2>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Vignettes de démonstration — à remplacer par les photographies officielles de l'atelier.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {degradesGalerie.map(([de, a], i) => (
            <div
              key={i}
              className="aspect-square rounded-carte"
              style={{ background: `linear-gradient(135deg, ${de}, ${a})` }}
              aria-hidden="true"
            />
          ))}
        </div>
      </motion.section>
    </>
  )
}
