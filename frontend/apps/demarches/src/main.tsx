import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { creerI18n } from '@dgap/i18n'
import { ThemeProvider } from '@dgap/ui'
import { App } from './App'
import './styles.css'

const clientRequetes = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={creerI18n()}>
      <QueryClientProvider client={clientRequetes}>
        <BrowserRouter>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
)
