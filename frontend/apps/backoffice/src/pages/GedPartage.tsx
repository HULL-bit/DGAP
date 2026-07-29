import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { requeteApi, ApiError } from '@dgap/api-client'
import { Carte, propsApparition } from '@dgap/ui'
import { motion } from 'framer-motion'

interface TelechargementPartage {
  fichier_url: string
  titre: string
}

export function GedPartage() {
  const { jeton } = useParams<{ jeton: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['ged-partage', jeton],
    queryFn: () => requeteApi<TelechargementPartage>(`/backoffice/ged/partage/${jeton}`),
  })

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          Lien de partage
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Accès interne à durée limitée — chaque consultation est journalisée.
        </p>
      </motion.div>

      <Carte className="mt-6 max-w-lg">
        {isLoading && <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>}
        {error && (
          <p className="font-corps text-sm text-error">
            {error instanceof ApiError && error.probleme.status === 410
              ? 'Ce lien de partage a expiré.'
              : "Ce lien n'est pas ou plus valide."}
          </p>
        )}
        {data && (
          <>
            <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">{data.titre}</p>
            <a
              href={data.fichier_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
            >
              <FileText size={16} aria-hidden="true" />
              Voir le fichier
            </a>
          </>
        )}
      </Carte>
    </section>
  )
}
