import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    external: ['mapbox-gl'],
  },
  {
    entry: { react: 'src/react.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom', 'mapbox-gl'],
  },
]);
