import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { propsApparition } from '@dgap/ui'
import type { ArticleDetail as ArticleDetailType } from '../types/api'

export function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => requeteApi<ArticleDetailType>(`/articles/${slug}`),
    enabled: Boolean(slug),
  })

  const introuvable = isError && error instanceof ApiError && error.probleme.status === 404

  return (
    <>
      <Helmet>
        <title>{data ? `${data.titre} — Actualité DGAP` : 'Actualité — DGAP'}</title>
        {data?.meta_description && <meta name="description" content={data.meta_description} />}
      </Helmet>

      <section className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
        <Link
          to="/actualite"
          className="inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Actualité
        </Link>

        {isLoading && <p className="mt-6 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
        {introuvable && (
          <p className="mt-6 font-corps text-sm text-error">Cet article n'existe pas ou n'est plus publié.</p>
        )}

        {data && (
          <motion.article className="mt-6 max-w-3xl" {...propsApparition()}>
            {data.date_publication && (
              <time
                dateTime={data.date_publication}
                className="font-corps text-xs font-medium uppercase tracking-wide text-primary dark:text-accent-soft"
              >
                {new Date(data.date_publication).toLocaleDateString('fr-SN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}
            <h1 className="mt-3 font-titre text-3xl font-bold text-text-strong dark:text-text-inv-strong sm:text-4xl">
              {data.titre}
            </h1>
            <div
              className="prose prose-neutral mt-6 max-w-none font-corps text-text-body dark:text-text-inv-body"
              // Contenu produit par le back-office éditorial (Bloc C) — non fourni par l'utilisateur final.
              dangerouslySetInnerHTML={{ __html: data.contenu }}
            />
          </motion.article>
        )}
      </section>
    </>
  )
}
