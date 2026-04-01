import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: { tsconfig: 'tsconfig.build.json' },
    clean: true,
    external: ['mapbox-gl'],
  },
  {
    entry: { react: 'src/react.ts' },
    format: ['esm', 'cjs'],
    dts: { tsconfig: 'tsconfig.build.json' },
    external: ['react', 'react-dom', 'mapbox-gl'],
  },
]);
