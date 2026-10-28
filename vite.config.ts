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
        theme_color: '#7c3aed', // Changed to match your purple logo
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
      }
    })
  ],
})