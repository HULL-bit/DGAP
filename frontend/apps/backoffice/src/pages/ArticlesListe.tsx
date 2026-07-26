import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Badge, Bouton, propsApparition, conteneurEnCascade, elementEnCascade, type TonBadge } from '@dgap/ui'
import type { ArticleBackoffice, Pagination, StatutContenu } from '../types/api'
import { LIBELLES_STATUT } from '../types/api'

const TON_PAR_STATUT: Record<StatutContenu, TonBadge> = {
  BROUILLON: 'neutre',
  RELECTURE: 'attente',
  VALIDE: 'attente',
  PUBLIE: 'succes',
  ARCHIVE: 'alerte',
}

const FILTRES: { valeur: StatutContenu | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'BROUILLON', libelle: 'Brouillons' },
  { valeur: 'RELECTURE', libelle: 'En relecture' },
  { valeur: 'VALIDE', libelle: 'Validés' },
  { valeur: 'PUBLIE', libelle: 'Publiés' },
  { valeur: 'ARCHIVE', libelle: 'Archivés' },
]

export function ArticlesListe() {
  const [filtre, setFiltre] = useState<StatutContenu | ''>('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['backoffice-articles'],
    queryFn: () => requeteApi<Pagination<ArticleBackoffice>>('/backoffice/articles'),
  })

  const articles = (data?.results ?? []).filter((a) => !filtre || a.statut === filtre)

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div className="flex items-center justify-between gap-4" {...propsApparition()}>
        <div>
          <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
            Contenus éditoriaux
          </h1>
          <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
            Articles d'actualité — workflow rédacteur → valideur → publié.
          </p>
        </div>
        <Link to="/articles/nouveau">
          <Bouton className="gap-1.5">
            <Plus size={18} aria-hidden="true" />
            Nouvel article
          </Bouton>
        </Link>
      </motion.div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.valeur || 'tous'}
            type="button"
            onClick={() => setFiltre(f.valeur)}
            className={`rounded-full px-3.5 py-2 font-corps text-sm font-semibold transition-colors duration-200 ease-dgap
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                       ${
                         filtre === f.valeur
                           ? 'bg-primary text-white'
                           : 'bg-surface-tint text-text-strong hover:bg-surface-muted dark:bg-white/5 dark:text-text-inv-body'
                       }`}
          >
            {f.libelle}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
      {isError && <p className="mt-8 font-corps text-sm text-error">Impossible de charger les contenus.</p>}

      <motion.div
        className="mt-6 divide-y divide-border rounded-carte border border-border bg-white dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-alt"
        variants={conteneurEnCascade()}
        initial="hidden"
        animate="visible"
      >
        {articles.map((article) => (
          <motion.div key={article.id} variants={elementEnCascade}>
            <Link
              to={`/articles/${article.id}`}
              className="flex items-center justify-between gap-4 p-5 hover:bg-surface-tint dark:hover:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                  {article.titre}
                </p>
                <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                  Modifié le{' '}
                  {new Date(article.modifie_le).toLocaleDateString('fr-SN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Badge ton={TON_PAR_STATUT[article.statut]} libelle={LIBELLES_STATUT[article.statut]} />
            </Link>
          </motion.div>
        ))}
        {!isLoading && articles.length === 0 && (
          <p className="p-5 font-corps text-sm text-text-muted dark:text-text-inv-muted">Aucun contenu.</p>
        )}
      </motion.div>
    </section>
  )
}
