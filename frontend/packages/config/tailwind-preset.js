/**
 * Preset Tailwind partagé — reflète les tokens officiels (@dgap/ui/src/styles/tokens.ts).
 * Toute application frontale (portail, démarches, intranet, backoffice) l'étend :
 *   module.exports = { presets: [require('@dgap/config/tailwind-preset')], content: [...] }
 *
 * Mode sombre : activé via classe (`dark` posée sur <html> par @dgap/ui/ThemeProvider),
 * pas via la préférence système seule, pour laisser le choix explicite à l'utilisateur.
 */
module.exports = {
  darkMode: 'class',
  theme: {
    screens: {
      sm: '360px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    container: {
      center: true,
      padding: '1.5rem',
      screens: { xl: '1600px' },
    },
    extend: {
      colors: {
        primary: { DEFAULT: '#0B6E4F', hover: '#095C42', dark: '#123524' },
        accent: { DEFAULT: '#C9A227', soft: '#E9D9A0' },
        surface: {
          white: '#FFFFFF',
          tint: '#F2F7F4',
          muted: '#E8EFEA',
          // Fonds mode sombre — verts très sombres cohérents avec la charte (pas de noir pur).
          dark: '#0E1A15',
          'dark-alt': '#15251E',
        },
        text: {
          strong: '#123524',
          body: '#1F2A24',
          muted: '#5B6B62',
          // Textes lisibles sur fonds sombres.
          'inv-strong': '#F2F7F4',
          'inv-body': '#D7E3DD',
          'inv-muted': '#8CA598',
        },
        border: { DEFAULT: '#D9E3DC', dark: '#26362D' },
        success: '#1B7F3B',
        warning: '#B8860B',
        error: '#B00020',
        info: '#0B5FA5',
        sn: { green: '#00853F', yellow: '#FDEF42', red: '#E31B23' },
      },
      fontFamily: {
        titre: ['Marianne', 'Public Sans', 'system-ui', 'sans-serif'],
        corps: ['Inter', 'Source Sans 3', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['16px', '1.5'],
      },
      borderRadius: {
        carte: '12px',
        bouton: '8px',
      },
      boxShadow: {
        legere: '0 1px 2px rgba(18, 53, 36, 0.08)',
        portee: '0 4px 12px rgba(18, 53, 36, 0.12)',
      },
      ringColor: {
        DEFAULT: '#C9A227',
      },
      maxWidth: {
        conteneur: '1600px',
      },
      transitionTimingFunction: {
        dgap: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
