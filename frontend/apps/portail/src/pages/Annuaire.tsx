import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin, Phone, Clock } from 'lucide-react'
import { requeteApi } from '@dgap/api-client'
import { propsApparition } from '@dgap/ui'
import type { Etablissement, Pagination } from '../types/api'

/**
 * Style vectoriel libre fourni par le projet MapLibre (aucune clé, aucun service
 * tiers propriétaire — cohérent avec l'exigence de souveraineté, §4.2).
 */
const STYLE_CARTE = 'https://demotiles.maplibre.org/style.json'

export function Annuaire() {
  const conteneurCarte = useRef<HTMLDivElement>(null)
  const carte = useRef<maplibregl.Map | null>(null)
  const marqueurs = useRef<maplibregl.Marker[]>([])
  const [selectionne, setSelectionne] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['etablissements'],
    queryFn: () => requeteApi<Pagination<Etablissement>>('/etablissements'),
  })

  useEffect(() => {
    if (!conteneurCarte.current || carte.current) return
    carte.current = new maplibregl.Map({
      container: conteneurCarte.current,
      style: STYLE_CARTE,
      center: [-14.4524, 14.4974],
      zoom: 5.4,
      attributionControl: {},
    })
    carte.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    return () => {
      carte.current?.remove()
      carte.current = null
    }
  }, [])

  useEffect(() => {
    const map = carte.current
    if (!map || !data) return

    marqueurs.current.forEach((m) => m.remove())
    marqueurs.current = []

    for (const etab of data.results) {
      if (!etab.latitude || !etab.longitude) continue
      const el = document.createElement('button')
      el.setAttribute('aria-label', etab.nom)
      el.style.width = '16px'
      el.style.height = '16px'
      el.style.borderRadius = '9999px'
      el.style.border = '2px solid white'
      el.style.background = etab.id === selectionne ? '#C9A227' : '#0B6E4F'
      el.style.cursor = 'pointer'
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)'
      el.addEventListener('click', () => setSelectionne(etab.id))

      const marqueur = new maplibregl.Marker({ element: el })
        .setLngLat([Number(etab.longitude), Number(etab.latitude)])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(etab.nom))
        .addTo(map)
      marqueurs.current.push(marqueur)
    }
  }, [data, selectionne])

  function centrerSur(etab: Etablissement) {
    setSelectionne(etab.id)
    if (carte.current && etab.latitude && etab.longitude) {
      carte.current.flyTo({ center: [Number(etab.longitude), Number(etab.latitude)], zoom: 9 })
    }
  }

  return (
    <>
      <Helmet>
        <title>Annuaire des établissements — Direction Générale de l'Administration Pénitentiaire</title>
        <meta
          name="description"
          content="Retrouvez les établissements pénitentiaires du Sénégal, leurs coordonnées, horaires et conditions de visite."
        />
      </Helmet>

      <section className="bg-surface-tint dark:bg-surface-dark-alt">
        <div className="mx-auto max-w-conteneur px-6 py-16 sm:px-8">
          <motion.div {...propsApparition()}>
            <h1 className="font-titre text-4xl font-bold text-text-strong dark:text-text-inv-strong sm:text-5xl">
              Annuaire des établissements
            </h1>
            <p className="mt-4 max-w-2xl font-corps text-lg text-text-muted dark:text-text-inv-muted">
              Coordonnées, horaires et conditions de visite des établissements pénitentiaires du
              Sénégal.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-conteneur px-6 py-12 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-2">
            {isLoading && (
              <p className="font-corps text-sm text-text-muted dark:text-text-inv-muted">Chargement…</p>
            )}
            {isError && (
              <p className="font-corps text-sm text-error">
                Impossible de charger l'annuaire pour le moment.
              </p>
            )}
            {data?.results.map((etab) => (
              <button
                key={etab.id}
                onClick={() => centrerSur(etab)}
                className={`rounded-carte border p-5 text-left shadow-legere transition-shadow duration-200 ease-dgap hover:shadow-portee
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                           dark:bg-surface-dark-alt
                           ${
                             selectionne === etab.id
                               ? 'border-accent bg-accent-soft/20 dark:border-accent-soft'
                               : 'border-border bg-white dark:border-border-dark'
                           }`}
              >
                <p className="font-titre text-base font-semibold text-text-strong dark:text-text-inv-strong">
                  {etab.nom}
                </p>
                <p className="mt-1 font-corps text-xs uppercase tracking-wide text-primary dark:text-accent-soft">
                  {etab.direction_regionale.nom}
                </p>
                <div className="mt-3 space-y-1.5 font-corps text-sm text-text-muted dark:text-text-inv-muted">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} aria-hidden="true" />
                    {etab.adresse}
                  </p>
                  {etab.horaires_visite && (
                    <p className="flex items-center gap-1.5">
                      <Clock size={14} aria-hidden="true" />
                      {etab.horaires_visite}
                    </p>
                  )}
                  {etab.telephone && (
                    <p className="flex items-center gap-1.5">
                      <Phone size={14} aria-hidden="true" />
                      {etab.telephone}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="order-1 lg:order-2 lg:col-span-3">
            <div
              ref={conteneurCarte}
              role="application"
              aria-label="Carte des établissements pénitentiaires"
              className="h-[420px] w-full overflow-hidden rounded-carte border border-border dark:border-border-dark lg:sticky lg:top-32 lg:h-[640px]"
            />
            {/* Alternative tabulaire pour l'accessibilité (§8) : le tableau reprend les mêmes données que la carte. */}
            <table className="sr-only">
              <caption>Liste des établissements avec coordonnées</caption>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Adresse</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                </tr>
              </thead>
              <tbody>
                {data?.results.map((etab) => (
                  <tr key={etab.id}>
                    <td>{etab.nom}</td>
                    <td>{etab.adresse}</td>
                    <td>{etab.latitude}</td>
                    <td>{etab.longitude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
