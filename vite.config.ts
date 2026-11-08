import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'Mpesa.jpeg', 'Ecocash.jpeg'],
      manifest: {
        name: 'SME Finance',
        short_name: 'SME Finance',
        description: 'Ledger for Lesotho Merchants',
        theme_color: '#0d9488', // ✅ Changed from purple to Teal
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        // ✅ FIX: Allow files up to 5 MB to be precached (default is 2 MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // ✅ FIX: Split vendor libraries into smaller files
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return id.toString().split('node_modules/')[1].split('/')[0].toString();
          }
        },
      },
    },
  },
})