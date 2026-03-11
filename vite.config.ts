import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const buildTime = Date.now();

function versionFilePlugin(): Plugin {
  return {
    name: 'version-file',
    buildStart() {
      writeFileSync(resolve('public/version.json'), JSON.stringify({ buildTime }));
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    versionFilePlugin(),
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // Exclude large music files from initial hashing to speed up builds.
        // These will be cached at runtime instead.
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,svg,ogg}', 'assets/audio/sfx/*.wav'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20 MB
        runtimeCaching: [
          {
            urlPattern: /\/version\.json$/,
            handler: 'NetworkOnly',  // Never cache version.json in SW
          },
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
