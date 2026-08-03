import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Empreinte de la version, affichée dans l'espace parent.
 *
 * Sans elle, impossible de savoir si la tablette exécute la dernière version ou
 * une ancienne retenue par le service worker — et la question se pose à chaque
 * déploiement.
 */
function buildStamp(): { commit: string; date: string } {
  try {
    return {
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      date: execSync('git log -1 --format=%cI').toString().trim(),
    };
  } catch {
    // Construction hors dépôt (archive, environnement sans git).
    return { commit: 'inconnu', date: new Date().toISOString() };
  }
}

const stamp = buildStamp();

// GitHub Pages sert le site sous /educatif/. Tout le reste (manifeste, service
// worker, start_url) doit s'aligner sur ce préfixe, sinon l'installation échoue
// silencieusement : Chrome refuse un start_url hors du scope du service worker.
const BASE = '/educatif/';

export default defineConfig({
  base: BASE,
  define: {
    __BUILD_COMMIT__: JSON.stringify(stamp.commit),
    __BUILD_DATE__: JSON.stringify(stamp.date),
  },
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
        /*
         * `standalone` et non `fullscreen`.
         *
         * L'application ne se lançait pas une fois installée sur la tablette.
         * `fullscreen` est le mode le plus exigeant : selon le constructeur et
         * la surcouche Android, une application installée qui le réclame peut
         * ne jamais s'ouvrir. `standalone` est de très loin le mode le mieux
         * pris en charge — pas de barre d'adresse non plus, seule la barre
         * d'état subsiste.
         *
         * Le vrai plein écran reste demandé au premier geste de l'enfant, via
         * l'API Fullscreen : nous en gardons ainsi le contrôle, et son échec
         * éventuel ne compromet plus le lancement.
         */
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        /*
         * L'orientation n'est plus imposée par le manifeste, pour la même
         * raison : c'est une contrainte de plus au lancement. Le verrouillage
         * paysage est demandé depuis le code, où son échec est sans conséquence.
         */
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
