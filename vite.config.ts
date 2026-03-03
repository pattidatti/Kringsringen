import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Exclude large music files from initial hashing to speed up builds.
        // These will be cached at runtime instead.
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,svg,ogg}', 'assets/audio/sfx/*.wav'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20 MB
        runtimeCaching: [
          {
            urlPattern: /\/assets\/audio\/music\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kringsringen-music',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 20
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/assets\/(?!audio\/music\/)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kringsringen-assets',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  base: '/',
})
