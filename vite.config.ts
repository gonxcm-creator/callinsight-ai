/** Vite config: React, hash-base /callinsight-ai/, PWA service worker. */
/** Deploy target: GitHub Pages under that base path. */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/callinsight-ai/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CallInsight AI',
        short_name: 'CallInsight',
        description: 'Analiza llamadas inmobiliarias y genera plan de seguimiento',
        theme_color: '#0b6e4f',
        background_color: '#f7f6f3',
        display: 'standalone',
        start_url: '/callinsight-ai/',
        scope: '/callinsight-ai/',
        lang: 'es',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,ico}'],
      },
    }),
  ],
})
