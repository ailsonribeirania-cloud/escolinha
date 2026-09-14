import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [react(), VitePWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', registerType: 'prompt', injectRegister: false,
    manifest: { id: '/', name: 'Escolinha · Um lugar para crescer', short_name: 'Escolinha', lang: 'pt-BR', start_url: '/', scope: '/', display: 'standalone', theme_color: '#245e50', background_color: '#f7f8fa', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] },
    injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], maximumFileSizeToCacheInBytes: 3000000 }
  })], server: { proxy: { '/api': 'http://127.0.0.1:3001' } }, build: { sourcemap: false }
});
