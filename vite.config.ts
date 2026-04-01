import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  resolve: {
    alias: {
      '@daturon/mapboxgl-layer-manager': resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'demo-dist'),
    emptyOutDir: true,
  },
  base: process.env.VITE_BASE_URL ?? '/',
});
