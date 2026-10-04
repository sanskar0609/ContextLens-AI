import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Configuration for ContextLens AI Chrome Extension
 *
 * Build layout explanation
 * ─────────────────────────
 * Chrome extensions have three distinct script environments with different
 * module-loading constraints:
 *
 *   1. Side Panel (React SPA)
 *      → Bundled by Vite/Rollup as a normal web app.
 *      → Entry: index.html → src/main.jsx → React tree
 *
 *   2. Background Service Worker
 *      → Needs to be a static file Chrome can register as a SW.
 *      → Declared with "type": "module" in manifest → supports ES modules.
 *      → Lives in public/background/service-worker.js (Vite copies verbatim).
 *
 *   3. Content Scripts (extractor.js + content.js)
 *      → CANNOT use ES module imports at runtime (Chrome restriction).
 *      → Must be plain IIFE-safe JavaScript.
 *      → Live in public/content/ (Vite copies verbatim, no bundling).
 *
 * The `public/` directory is Vite's static-assets folder — everything
 * inside is copied as-is to `dist/` at build time. That is how
 * manifest.json, the service worker, and content scripts reach dist/.
 *
 * Vite ONLY bundles the React side panel (index.html entry).
 */
export default defineConfig({
  plugins: [react()],

  /* ── Import aliases ── */
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  /* ── Static assets (copied verbatim to dist/) ── */
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      /* Single entry: only the React side panel is bundled */
      input: {
        sidepanel: resolve(__dirname, 'index.html'),
      },

      output: {
        /* Predictable filenames so the HTML can reference them */
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },

  /* ── Dev server ── */
  server: {
    port: 5173,
    strictPort: true,
  },
});
