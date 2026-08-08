import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// PWA: autoUpdate + precache del build; dev SIN service worker (evita caché sucia).
export default defineConfig({
  base: '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: false },
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'maskable-512.png',
      ],
      manifest: {
        name: 'Esto no es un panfleto',
        short_name: 'Panfleto',
        description:
          'Un juego de decisiones sobre la resistencia estudiantil venezolana de 2014.',
        lang: 'es-VE',
        theme_color: '#12130f',
        background_color: '#12130f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,webp,svg}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
