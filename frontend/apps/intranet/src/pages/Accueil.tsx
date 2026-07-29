import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Newspaper,
  GraduationCap,
  FileText,
  Package,
  PenSquare,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { Carte, propsApparition, conteneurEnCascade, elementEnCascade } from '@dgap/ui'
import { useAuth } from '../auth/AuthContext'
import { URL_BACKOFFICE } from '../config'
import type { ArticleListe, NoteDeService, Pagination } from '../types/api'

interface Raccourci {
  scope: string
  libelle: string
  icone: LucideIcon
  href: string
}

const RACCOURCIS: Raccourci[] = [
  { scope: 'visites:instruire', libelle: 'Instruire les demandes de visite', icone: CalendarCheck, href: `${URL_BACKOFFICE}/visites` },
  { scope: 'concours:gerer', libelle: 'Gérer les avis de concours', icone: GraduationCap, href: `${URL_BACKOFFICE}/concours` },
  { scope: 'concours:instruire', libelle: 'Instruire les candidatures', icone: GraduationCap, href: `${URL_BACKOFFICE}/candidatures` },
  { scope: 'contenus:rediger', libelle: 'Rédiger un article', icone: PenSquare, href: URL_BACKOFFICE },
  { scope: 'documents:gerer', libelle: 'Gérer les documents officiels', icone: FileText, href: `${URL_BACKOFFICE}/documents` },
  { scope: 'boutique:gerer', libelle: 'Gérer la boutique', icone: Package, href: `${URL_BACKOFFICE}/boutique` },
]

export function Accueil() {
  const { utilisateur } = useAuth()

  const { data: notes } = useQuery({
    queryKey: ['intranet-notes-accueil'],
    queryFn: () => requeteApi<Pagination<NoteDeService>>('/intranet/notes?limit=3'),
    retry: false,
  })

  const { data: articles } = useQuery({
    queryKey: ['articles-accueil-intranet'],
    queryFn: () => requeteApi<Pagination<ArticleListe>>('/articles?limit=3'),
    retry: false,
  })

  const raccourcisVisibles = RACCOURCIS.filter((r) => utilisateur?.scopes.includes(r.scope))

  return (
    <section className="mx-auto max-w-conteneur px-6 py-10 sm:px-8">
      <motion.div {...propsApparition()}>
        <h1 className="font-titre text-2xl font-bold text-text-strong dark:text-text-inv-strong">
          Bonjour {utilisateur?.prenom}
        </h1>
        <p className="mt-1 font-corps text-sm text-text-muted dark:text-text-inv-muted">
          Tableau de bord — notes de service, actualités et raccourcis métier.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary dark:text-accent-soft" aria-hidden="true" />
                <h2 className="font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">
                  Notes de service récentes
                </h2>
              </div>
              <Link
                to="/notes-de-service"
                className="inline-flex items-center gap-1 font-corps text-sm font-medium text-primary hover:underline dark:text-accent-soft"
              >
                Toutes les notes
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <motion.div
              className="mt-4 flex flex-col gap-3"
              variants={conteneurEnCascade()}
              initial="hidden"
              animate="visible"
            >
              {(notes?.results ?? []).map((note) => (
                <motion.div key={note.id} variants={elementEnCascade}>
                  <Carte className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                        {note.titre}
                      </p>
                      <p className="mt-1 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                        {note.perimetre_cible_libelle}
                      </p>
                    </div>
                    {!note.lu && (
                      <span className="shrink-0 rounded-full bg-accent-soft/30 px-2.5 py-1 font-corps text-xs font-semibold text-primary dark:text-accent-soft">
                        Non lue
                      </span>
                    )}
                  </Carte>
                </motion.div>
              ))}
              {notes && notes.results.length === 0 && (
                <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">
                  Aucune note de service pour le moment.
                </p>
              )}
            </motion.div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <Newspaper size={18} className="text-primary dark:text-accent-soft" aria-hidden="true" />
              <h2 className="font-titre text-lg font-semibold text-text-strong dark:text-text-inv-strong">
                Actualités
              </h2>
            </div>
            <motion.div
              className="mt-4 flex flex-col gap-3"
              variants={conteneurEnCascade()}
              initial="hidden"
              animate="visible"
            >
              {(articles?.results ?? []).map((article) => (
                <motion.div key={article.id} variants={elementEnCascade}>
                  <Carte>
                    <p className="font-corps text-sm font-semibold text-text-strong dark:text-text-inv-strong">
                      {article.titre}
                    </p>
                    {article.chapo && (
                      <p className="mt-1 line-clamp-2 font-corps text-xs text-text-muted dark:text-text-inv-muted">
                        {article.chapo}
                      </p>
                    )}
                  </Carte>
                </motion.div>
              ))}
            </motion.div>
          </section>
        </div>

        {raccourcisVisibles.length > 0 && (
          <Carte className="h-fit">
            <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-text-muted dark:text-text-inv-muted">
              Raccourcis métier
            </h2>
            <div className="mt-3 flex flex-col gap-1">
              {raccourcisVisibles.map((r) => (
                <a
                  key={r.scope}
                  href={r.href}
                  className="flex items-center gap-2.5 rounded-bouton px-2 py-2.5 font-corps text-sm text-text-body transition-colors duration-200 ease-dgap hover:bg-surface-tint dark:text-text-inv-body dark:hover:bg-white/5"
                >
                  <r.icone size={16} className="shrink-0 text-primary dark:text-accent-soft" aria-hidden="true" />
                  {r.libelle}
                </a>
              ))}
            </div>
          </Carte>
        )}
      </div>
    </section>
  )
}
