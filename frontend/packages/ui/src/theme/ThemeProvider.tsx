import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'clair' | 'sombre'

interface ContexteTheme {
  theme: Theme
  basculer: () => void
}

const ContexteThemeReact = createContext<ContexteTheme | null>(null)

const CLE_STOCKAGE = 'dgap-theme'

function themeInitial(): Theme {
  if (typeof window === 'undefined') return 'clair'
  const enregistre = window.localStorage.getItem(CLE_STOCKAGE)
  if (enregistre === 'clair' || enregistre === 'sombre') return enregistre
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair'
}

/**
 * Fournisseur de thème clair/sombre — pose la classe `dark` sur `<html>` (consommée
 * par `darkMode: 'class'` du preset Tailwind). Choix explicite persistant
 * (localStorage), initialisé une fois depuis la préférence système.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(themeInitial)

  useEffect(() => {
    const racine = document.documentElement
    racine.classList.toggle('dark', theme === 'sombre')
    racine.style.colorScheme = theme === 'sombre' ? 'dark' : 'light'
    window.localStorage.setItem(CLE_STOCKAGE, theme)
  }, [theme])

  function basculer() {
    setTheme((t) => (t === 'clair' ? 'sombre' : 'clair'))
  }

  return (
    <ContexteThemeReact.Provider value={{ theme, basculer }}>{children}</ContexteThemeReact.Provider>
  )
}

export function useTheme(): ContexteTheme {
  const contexte = useContext(ContexteThemeReact)
  if (!contexte) throw new Error('useTheme doit être utilisé sous <ThemeProvider>')
  return contexte
}
