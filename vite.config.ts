import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Makes Corven installable as a desktop app (Chrome/Edge on Windows and
      // macOS). The service worker caches only this app's own files; API
      // calls always go to the network.
      VitePWA({
        // Never reload the IDE by itself: an update waits for the user to
        // accept it (src/features/pwa/UpdatePrompt.tsx).
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Corven IDE',
          short_name: 'Corven',
          description: 'Cloud IDE for building, testing and deploying CKB smart contracts.',
          start_url: '/dashboard',
          scope: '/',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          background_color: '#0A0B0D',
          theme_color: '#0A0B0D',
          categories: ['developer', 'productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Workspaces', url: '/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Devnets', url: '/nodes', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          // The main bundle is ~2.7 MB.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Client-side routes (/dashboard, /ide/:id, ...) load the app shell.
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
