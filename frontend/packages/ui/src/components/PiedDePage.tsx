import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Facebook, Twitter, Instagram, Youtube, ArrowRight, Check } from 'lucide-react'
import EmblemeMonoBlanc from '../assets/brand/emblem-mono-white.svg?react'

const liensReseaux = [
  { nom: 'Facebook', icone: Facebook, href: 'https://facebook.com' },
  { nom: 'Twitter', icone: Twitter, href: 'https://twitter.com' },
  { nom: 'Instagram', icone: Instagram, href: 'https://instagram.com' },
  { nom: 'Youtube', icone: Youtube, href: 'https://youtube.com' },
]

const colonneLiens = [
  { libelle: 'Actualité', href: '/actualite' },
  { libelle: "Historique de l'A.P.", href: '/a-propos/historique' },
  { libelle: 'Documents officiels', href: '/publications' },
  { libelle: 'Galerie d’images', href: '/galerie' },
  { libelle: 'FAQ', href: '/faq' },
  { libelle: 'SOS Détenus', href: '/sos-detenus' },
]

const colonneJuridique = [
  { libelle: 'DRAPs', href: '/publications/draps' },
  { libelle: 'Procédures', href: '/publications/procedures' },
  { libelle: 'Lois et textes pénaux', href: '/publications/lois-et-textes' },
  { libelle: 'Mentions légales', href: '/mentions-legales' },
  { libelle: "Conditions d'utilisation", href: '/conditions-utilisation' },
  { libelle: 'Politique de confidentialité', href: '/donnees-personnelles' },
]

/** Lien de pied de page avec soulignement animé (largeur 0 → pleine au survol). */
function LienPied({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group relative inline-block py-0.5 font-corps text-sm text-white/75 hover:text-white">
      {children}
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-accent-soft transition-transform duration-300 ease-dgap group-hover:scale-x-100"
      />
    </a>
  )
}

/**
 * Pied de page institutionnel — coordonnées, tutelle, liens légaux, réseaux
 * officiels, newsletter (§1.1, §9.3 noindex zones internes). L'inscription à la
 * newsletter est un formulaire client uniquement pour l'instant : aucune API
 * `notifications`/`demarches` n'existe encore pour la traiter (Bloc B).
 */
export function PiedDePage() {
  const { t } = useTranslation()
  const anneeCourante = new Date().getFullYear()
  const [courriel, setCourriel] = useState('')
  const [inscrit, setInscrit] = useState(false)

  function soumettreNewsletter(e: FormEvent) {
    e.preventDefault()
    if (!courriel) return
    setInscrit(true)
  }

  return (
    <footer className="relative overflow-hidden bg-primary-dark text-white/90">
      {/* Halos décoratifs sobres, cohérents avec le reste du portail */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-accent-soft/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative mx-auto grid max-w-conteneur gap-12 px-6 py-20 sm:px-8 md:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <EmblemeMonoBlanc className="h-16 w-auto" aria-hidden="true" />
          <p className="font-corps text-sm text-white/70">{t('piedDePage.devise')}</p>
          <ul className="mt-2 space-y-2 font-corps text-sm text-white/75">
            <li>Liberté 6 Extension, Immeuble Ferdinand Coly, Dakar — Sénégal</li>
            <li>Lun–Ven, 8h–18h</li>
            <li>
              <a href="tel:+221338694780" className="hover:text-white">
                +221 33 869 47 80
              </a>
            </li>
            <li>
              <a href="mailto:contact@administrationpenitentiaire.sn" className="hover:text-white">
                contact@administrationpenitentiaire.sn
              </a>
            </li>
          </ul>

          <div className="mt-2 flex items-center gap-3">
            {liensReseaux.map((r) => (
              <a
                key={r.nom}
                href={r.href}
                aria-label={r.nom}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80
                           transition-all duration-200 ease-dgap hover:scale-110 hover:border-accent hover:bg-accent hover:text-primary-dark"
              >
                <r.icone size={17} strokeWidth={1.75} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-accent-soft">
            {t('piedDePage.liens')}
          </h2>
          <ul className="mt-4 space-y-3">
            {colonneLiens.map((l) => (
              <li key={l.href}>
                <LienPied href={l.href}>{l.libelle}</LienPied>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-accent-soft">
            {t('piedDePage.juridique')}
          </h2>
          <ul className="mt-4 space-y-3">
            {colonneJuridique.map((l) => (
              <li key={l.href}>
                <LienPied href={l.href}>{l.libelle}</LienPied>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-titre text-sm font-semibold uppercase tracking-wide text-accent-soft">
            {t('piedDePage.newsletter')}
          </h2>
          <p className="mt-4 font-corps text-sm text-white/70">{t('piedDePage.newsletterTexte')}</p>
          {inscrit ? (
            <p className="mt-4 flex items-center gap-2 font-corps text-sm font-medium text-accent-soft">
              <Check size={18} aria-hidden="true" />
              {t('piedDePage.newsletterMerci')}
            </p>
          ) : (
            <form onSubmit={soumettreNewsletter} className="mt-4 flex flex-col gap-2">
              <label htmlFor="newsletter-email" className="sr-only">
                {t('piedDePage.newsletterPlaceholder')}
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={courriel}
                onChange={(e) => setCourriel(e.target.value)}
                placeholder={t('piedDePage.newsletterPlaceholder')}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 font-corps text-sm text-white
                           placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <button
                type="submit"
                className="group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full
                           bg-accent px-4 py-2.5 font-corps text-sm font-bold text-primary-dark
                           transition-transform duration-150 ease-dgap hover:scale-[1.02]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent
                             transition-transform duration-700 ease-dgap group-hover:translate-x-full"
                />
                <span className="relative">{t('piedDePage.newsletterBouton')}</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" className="relative" />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="relative border-t border-white/10 px-6 py-5 text-center font-corps text-xs text-white/60">
        © {anneeCourante} Direction Générale de l'Administration Pénitentiaire — {t('piedDePage.droitsReserves')}
      </div>
    </footer>
  )
}
