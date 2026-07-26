import { defineConfig } from 'orval'

/**
 * Génère le client typé à partir du schéma OpenAPI 3.1 exposé par le backend
 * (docs/api/openapi.yaml, produit par drf-spectacular). Lancer `make openapi`
 * côté backend avant `pnpm --filter @dgap/api-client generate`.
 */
export default defineConfig({
  dgap: {
    input: '../../../docs/api/openapi.yaml',
    output: {
      target: './src/genere/client.ts',
      schemas: './src/genere/modeles',
      client: 'react-query',
      httpClient: 'fetch',
      baseUrl: '/api/v1',
      override: {
        mutator: { path: './src/client.ts', name: 'requeteApi' },
      },
    },
  },
})
