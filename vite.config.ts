import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

const base = process.env.BASE_PATH ?? '';

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registro manual no +layout.svelte
      scope: `${base}/`,
      base: `${base}/`,
      manifest: {
        name: 'Santinhos MG 2026',
        short_name: 'Santinhos MG',
        description: 'Deputados federais de MG que tentam a reeleição em 2026.',
        lang: 'pt-BR',
        start_url: `${base}/`,
        scope: `${base}/`,
        display: 'standalone',
        theme_color: '#cdc4b1',
        background_color: '#dde2da',
        icons: [
          { src: 'icones/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icones/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icones/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: [
          'client/**/*.{js,css,html,ico,svg,png,jpg,webp,woff,woff2,json}',
          'prerendered/**/*.html'
        ],
        // Fotos de quem não é deputado (708, WP13) ficam fora do pré-cache: sem rede, iniciais (NFR-022).
        globIgnores: ['client/fotos/tse/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // O plugin só liga estes dois sozinho quando injectRegister é 'auto'; com registro manual
        // é preciso explicitar, senão a primeira visita não fica controlada pelo SW (offline falha)
        // e a versão nova espera todas as abas fecharem (NFR-007).
        clientsClaim: true,
        skipWaiting: true
      },
      // kit.base: sem ele o plugin usa o base do Vite do build SSR ('/'), e a entrada da página
      // e o navigateFallback saem como '/' mesmo com BASE_PATH (precache fora do escopo).
      kit: { base: `${base}/`, includeVersionFile: true, trailingSlash: 'always' }
    })
  ],
  test: { include: ['tests/unit/**/*.test.ts'] }
});
