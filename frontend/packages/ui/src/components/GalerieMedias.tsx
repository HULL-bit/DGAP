import { Film } from 'lucide-react'
import { urlIncorporationVideo } from '../utils/video'

export interface MediaGalerieAffiche {
  id: string
  type: 'IMAGE' | 'VIDEO'
  image: string | null
  video_url: string
  legende: string
}

export interface GalerieMediasProps {
  medias: MediaGalerieAffiche[]
}

/**
 * Grille de médias (images + vidéos incorporées) réutilisée par les pages publiques
 * consommant une galerie (réinsertion, vie des détenus, article). Les vidéos sont
 * des liens externes incorporés (YouTube/Vimeo), jamais des fichiers auto-hébergés.
 */
export function GalerieMedias({ medias }: GalerieMediasProps) {
  if (medias.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {medias.map((media) => {
        if (media.type === 'IMAGE' && media.image) {
          return (
            <figure key={media.id} className="aspect-square overflow-hidden rounded-carte">
              <img src={media.image} alt={media.legende} className="h-full w-full object-cover" />
            </figure>
          )
        }
        const urlIncorporation = media.type === 'VIDEO' ? urlIncorporationVideo(media.video_url) : null
        if (urlIncorporation) {
          return (
            <div key={media.id} className="aspect-square overflow-hidden rounded-carte bg-black">
              <iframe
                src={urlIncorporation}
                title={media.legende || 'Vidéo'}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
        return (
          <div
            key={media.id}
            className="flex aspect-square items-center justify-center rounded-carte bg-surface-tint text-text-muted dark:bg-white/5 dark:text-text-inv-muted"
          >
            <Film size={24} aria-hidden="true" />
          </div>
        )
      })}
    </div>
  )
}
