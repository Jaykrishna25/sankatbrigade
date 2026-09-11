import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// './' keeps every asset reference relative, so the same `dist/` folder works on
// Cloudflare Pages (served from the domain root) AND on GitHub Pages
// (served from https://<user>.github.io/<repo>/) with no rebuild.
// Routing is hash based for the same reason - see src/utils/router.ts.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // `npm run dev:ai` runs server/index.mjs on 8787 so the optional AI layer
    // can be exercised locally. Without it, /api/assistant simply fails and the
    // assistant stays deterministic — which is the default, supported state.
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
