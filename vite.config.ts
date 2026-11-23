import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Հանրային API հարցումներ, որոնք պահվում են քեշում՝ offline դիտման համար։ */
const PUBLIC_API_PATTERN = /\/api\/v1\/(faculties|cohorts\/[^/]+\/schedule|settings|catalog\/lecturers|reports\/lecturer-schedule)/

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // Կայքի հիմնական ճանապարհը։ Եթե կայքը տեղադրված է ենթաթղթապանակում, նշեք VITE_BASE_PATH-ում։
    base: env.VITE_BASE_PATH || '/',

    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: './',
          name: 'Ակադեմիական դասացուցակ',
          short_name: 'Դասացուցակ',
          description: 'Համալսարանի ֆակուլտետների դասացուցակի կազմման և դիտման համակարգ',
          lang: 'hy',
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#1e3a8a',
          background_color: '#f8fafc',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ url, request }) => request.method === 'GET' && PUBLIC_API_PATTERN.test(url.pathname),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'public-api',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],

    server: {
      host: true,
      port: 5173,
      // Մշակման ժամանակ API հարցումները ուղարկվում են տեղային սերվերին (server/ թղթապանակ)
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
