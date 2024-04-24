import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import copy from 'rollup-plugin-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    copy({
      targets: [
        { src: 'src/components/options.html', dest: 'dist/assets' },
        { src: 'src/components/popup.html', dest: 'dist/assets' },
      ],
      hook: 'writeBundle',
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.tsx'),
        popup: resolve(__dirname, 'src/components/popup.tsx'),
        options: resolve(__dirname, 'src/components/options.tsx'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
