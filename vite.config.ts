import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Local dev proxies the relay path to a locally-run worker (wrangler dev on
// :8787) so fetching feeds works without a deployed worker. In production the
// client points VITE_RELAY_URL at the deployed Worker origin instead.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'RSS Reader',
        short_name: 'RSS Reader',
        description:
          'A local-first RSS reader. Feeds, folders and bookmarks stored on this device.',
        start_url: './',
        display: 'standalone',
        background_color: '#f2f2f3',
        theme_color: '#5980a6',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell only. Feed content is the source-of-truth in
        // localStorage, so we deliberately do not cache feed responses here.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/relay': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'relay/**/*.test.ts'],
  },
});
