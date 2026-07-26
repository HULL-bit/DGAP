import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Search, Sun, Moon, Phone, Clock } from 'lucide-react'
import EmblemeCouleur from '../assets/brand/emblem-color.svg?react'
import EmblemeMonoBlanc from '../assets/brand/emblem-mono-white.svg?react'
import { useTheme } from '../theme/ThemeProvider'

export interface LienNav {
  libelle: string
  href: string
  actif?: boolean
}

export interface EnTeteEtatProps {
  liens: LienNav[]
  onRecherche?: (terme: string) => void
  /** Ancre visuellement l'app courante (portail, démarches, intranet, back-office). */
  zone?: 'portail' | 'demarches' | 'intranet' | 'backoffice'
  actions?: ReactNode
  /** Langue courante et bascule — omis si l'app n'est pas encore bilingue. */
  langue?: 'fr' | 'en'
  onChangerLangue?: (langue: 'fr' | 'en') => void
}

/**
 * Bandeau État — armoiries, intitulés officiels, navigation, recherche.
 * Structure imposée EF-101 : République du Sénégal / Ministère de la Justice / DGAP.
 * Nav flottante arrondie (glass) avec pastille indicatrice animée en layout partagé
 * (glisse d'un lien à l'autre au survol, se pose sur le lien actif au repos) —
 * 100% utilisable au clavier ; menu mobile accessible (simple disclosure).
 */
export function EnTeteEtat({ liens, onRecherche, actions, langue, onChangerLangue }: EnTeteEtatProps) {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [terme, setTerme] = useState('')
  const [survole, setSurvole] = useState<string | null>(null)
  const { theme, basculer } = useTheme()

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-primary-dark py-1.5 text-center font-corps text-xs text-white/90">
        République du Sénégal — Ministère de la Justice — Direction Générale de l'Administration
        Pénitentiaire
      </div>

      <div className="hidden items-center justify-center gap-6 border-b border-white/10 bg-primary-dark/95 py-2 font-corps text-xs text-white/85 sm:flex">
        <a href="tel:+221338694780" className="inline-flex items-center gap-1.5 hover:text-white">
          <Phone size={13} strokeWidth={2} aria-hidden="true" />
          Tel : +221 33 869 47 80
        </a>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} strokeWidth={2} aria-hidden="true" />
          Heures de visite : Lun – Ven, 8h – 16h
        </span>
      </div>

      <div className="px-3 pt-4 sm:px-8">
        <div
          className="mx-auto flex max-w-conteneur items-center gap-6 rounded-full border border-border/80
                     bg-white/75 px-6 py-4 shadow-legere backdrop-blur-md
                     supports-[backdrop-filter]:bg-white/60
                     dark:border-border-dark/80 dark:bg-surface-dark-alt/80 dark:supports-[backdrop-filter]:bg-surface-dark-alt/70"
        >
          <a href="/" className="flex shrink-0 items-center gap-3" aria-label="Accueil DGAP">
            <EmblemeCouleur className="h-14 w-auto dark:hidden" aria-hidden="true" />
            <EmblemeMonoBlanc className="hidden h-14 w-auto dark:block" aria-hidden="true" />
            <span className="hidden font-titre text-base font-semibold leading-tight text-text-strong dark:text-text-inv-strong sm:block">
              Administration
              <br />
              Pénitentiaire
            </span>
          </a>

          <nav
            aria-label="Navigation principale"
            className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:flex
                       [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseLeave={() => setSurvole(null)}
          >
            {liens.map((lien) => {
              const misEnValeur = survole ? survole === lien.href : Boolean(lien.actif)
              return (
                <a
                  key={lien.href}
                  href={lien.href}
                  aria-current={lien.actif ? 'page' : undefined}
                  onMouseEnter={() => setSurvole(lien.href)}
                  className={`relative inline-flex items-center justify-center whitespace-nowrap rounded-full
                             px-5 py-3.5 text-center font-corps text-[13px] font-bold uppercase tracking-wide
                             transition-colors duration-200 ease-dgap
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             ${
                               misEnValeur
                                 ? 'text-white'
                                 : 'bg-surface-tint/70 text-text-strong hover:bg-surface-tint dark:bg-white/5 dark:text-text-inv-body dark:hover:bg-white/10'
                             }`}
                >
                  {misEnValeur && (
                    <motion.span
                      layoutId="pastille-nav"
                      className="absolute inset-0 rounded-full bg-primary shadow-legere"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative">{lien.libelle}</span>
                </a>
              )
            })}
          </nav>

          {onRecherche && (
            <form
              role="search"
              className="ml-auto hidden items-center gap-2 rounded-full border border-border/80 bg-white/80 px-4 py-2.5
                         dark:border-border-dark/80 dark:bg-white/5 xl:flex"
              onSubmit={(e) => {
                e.preventDefault()
                onRecherche(terme)
              }}
            >
              <Search size={18} strokeWidth={1.75} aria-hidden="true" className="text-text-muted dark:text-text-inv-muted" />
              <label htmlFor="recherche-globale" className="sr-only">
                Rechercher sur le site
              </label>
              <input
                id="recherche-globale"
                type="search"
                value={terme}
                onChange={(e) => setTerme(e.target.value)}
                placeholder="Rechercher…"
                className="w-36 bg-transparent font-corps text-sm text-text-body outline-none
                           placeholder:text-text-muted dark:text-text-inv-body dark:placeholder:text-text-inv-muted"
              />
            </form>
          )}

          {onChangerLangue && (
            <div
              role="group"
              aria-label="Choix de la langue"
              className="hidden shrink-0 items-center gap-0.5 rounded-full border border-border/80 bg-white/80 p-1
                         dark:border-border-dark/80 dark:bg-white/5 xl:flex"
            >
              {(['fr', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangerLangue(code)}
                  aria-pressed={langue === code}
                  className={`rounded-full px-2.5 py-1.5 font-corps text-xs font-bold uppercase transition-colors duration-200 ease-dgap
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             ${
                               langue === code
                                 ? 'bg-primary text-white'
                                 : 'text-text-muted hover:text-text-strong dark:text-text-inv-muted dark:hover:text-text-inv-strong'
                             }`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={basculer}
            aria-label={theme === 'sombre' ? 'Passer au thème clair' : 'Passer au thème sombre'}
            className="hidden shrink-0 items-center justify-center rounded-full border border-border/80 bg-white/80 p-2.5 text-text-strong
                       transition-colors duration-200 ease-dgap hover:bg-surface-tint
                       dark:border-border-dark/80 dark:bg-white/5 dark:text-text-inv-strong dark:hover:bg-white/10
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent xl:flex"
          >
            {theme === 'sombre' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>

          {actions}

          <button
            type="button"
            className="ml-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-text-strong
                       transition-colors duration-200 ease-dgap hover:bg-surface-tint
                       dark:text-text-inv-strong dark:hover:bg-white/10 xl:hidden
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOuvert((v) => !v)}
          >
            {menuOuvert ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>

        {menuOuvert && (
          <nav
            id="menu-mobile"
            aria-label="Navigation mobile"
            className="mx-auto mt-2 flex max-w-conteneur flex-col gap-1 rounded-2xl border border-border/80
                       bg-white/95 p-3 shadow-portee backdrop-blur-md
                       dark:border-border-dark/80 dark:bg-surface-dark-alt/95 xl:hidden"
          >
            {liens.map((lien) => (
              <a
                key={lien.href}
                href={lien.href}
                aria-current={lien.actif ? 'page' : undefined}
                className={`rounded-full px-4 py-3 text-center font-corps text-base font-bold
                           transition-colors duration-200 ease-dgap
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           ${
                             lien.actif
                               ? 'bg-primary text-white'
                               : 'bg-surface-tint/70 text-text-strong hover:bg-surface-tint dark:bg-white/5 dark:text-text-inv-body dark:hover:bg-white/10'
                           }`}
              >
                {lien.libelle}
              </a>
            ))}
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={basculer}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border/80 px-4 py-3 font-corps text-sm font-bold
                           text-text-strong dark:border-border-dark/80 dark:text-text-inv-strong"
              >
                {theme === 'sombre' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
                {theme === 'sombre' ? 'Thème clair' : 'Thème sombre'}
              </button>

              {onChangerLangue && (
                <div
                  role="group"
                  aria-label="Choix de la langue"
                  className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/80 p-1 dark:border-border-dark/80"
                >
                  {(['fr', 'en'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onChangerLangue(code)}
                      aria-pressed={langue === code}
                      className={`rounded-full px-3 py-2 font-corps text-xs font-bold uppercase transition-colors duration-200 ease-dgap
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                                 ${
                                   langue === code
                                     ? 'bg-primary text-white'
                                     : 'text-text-muted hover:text-text-strong dark:text-text-inv-muted dark:hover:text-text-inv-strong'
                                 }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
