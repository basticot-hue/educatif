import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sert le site sous /educatif/. Tout le reste (manifeste, service
// worker, start_url) doit s'aligner sur ce préfixe, sinon l'installation échoue
// silencieusement : Chrome refuse un start_url hors du scope du service worker.
const BASE = '/educatif/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        id: BASE,
        name: 'Educatif',
        short_name: 'Educatif',
        description: "Ateliers d'apprentissage pour les tout-petits.",
        lang: 'fr',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        // fullscreen et non standalone : on ne veut ni barre d'état ni barre de
        // navigation pendant une séance.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#0F2E4C',
        theme_color: '#0F2E4C',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // L'app doit fonctionner hors ligne intégralement : tout est précaché,
        // il n'y a aucune ressource distante.
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Permet de tester l'installation depuis `npm run dev -- --host`.
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
