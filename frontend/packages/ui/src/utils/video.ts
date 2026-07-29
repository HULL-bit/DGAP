/**
 * Convertit un lien vidéo public (YouTube, Vimeo) en URL d'incorporation utilisable
 * dans une balise `<iframe>`. Aucun téléversement de fichier vidéo dans ce projet
 * (§ décision produit — pas de pipeline de transcodage/CDN vidéo) : les galeries
 * n'acceptent que des liens vers des plateformes tierces.
 */
export function urlIncorporationVideo(url: string): string | null {
  try {
    const u = new URL(url)

    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`
      const chemin = u.pathname.split('/').filter(Boolean)
      if (chemin[0] === 'embed' && chemin[1]) return `https://www.youtube-nocookie.com/embed/${chemin[1]}`
      return null
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return url
  } catch {
    return null
  }
}
