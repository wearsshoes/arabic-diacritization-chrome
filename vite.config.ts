import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    hmr: {
      port: 24601,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    sourcemap: true, // Ensure source maps are generated
    outDir: 'dist',
  },
});
