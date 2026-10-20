import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'mask-icon.svg',
        'logo.svg',
        'Mpesa.jpeg',
        'Ecocash.jpeg',
        'pwa-192x192.png',
        'pwa-512x512.png'
      ],
      manifest: {
        name: 'SME Finance',
        short_name: 'SME Finance', // <--- CHANGED FROM KHOTSO-PAY
        description: 'Offline-first Ledger for Lesotho Merchants',
        theme_color: '#7c3aed',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png', // <--- REPLACE THIS FILE IN YOUR PUBLIC FOLDER
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // <--- REPLACE THIS FILE IN YOUR PUBLIC FOLDER
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
})