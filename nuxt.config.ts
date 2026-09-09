import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#0a0a0b' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Fastvest' },
      ],
    },
  },
  routeRules: {
    '/': { prerender: true },
  },
  modules: ['@nuxtjs/color-mode', '@vueuse/nuxt', '@vite-pwa/nuxt', '@nuxt/fonts'],
  fonts: {
    provider: 'google',
    families: [
      { name: 'Domine', weights: [400, 500, 600, 700] },
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  css: ['~/assets/css/main.css'],
  components: [
    {
      path: '~/components/ui',
      prefix: 'Ui',
      ignore: ['**/index.ts'],
    },
    {
      path: '~/components',
      pathPrefix: false,
      ignore: ['**/ui/**', '**/index.ts'],
    },
  ],
  alias: {
    '@': fileURLToPath(new URL('./app', import.meta.url)),
  },
  typescript: {
    strict: true,
  },
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },
  pwa: {
    manifest: {
      name: 'Fastvest',
      short_name: 'Fastvest',
      description: 'Fast, local-first portfolio tracker with live market prices.',
      lang: 'en',
      theme_color: '#0a0a0b',
      background_color: '#0a0a0b',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', '**/*.webmanifest'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
          },
        },
      ],
    },
    registerType: 'prompt',
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true,
    },
  },
})