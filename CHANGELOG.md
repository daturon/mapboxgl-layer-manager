# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0]

### Added

- `LayerManagerOptions.debug` — set `{ debug: true }` to enable `console.warn` messages for
  no-op method calls (e.g. uninitialized map, missing layer IDs). Silent by default.

### Fixed

- `setLayerOpacity` no longer maps `hillshade` layers to `hillshade-exaggeration`, which
  controls terrain relief intensity and is not an opacity property. Hillshade layers are now
  correctly treated as having no opacity paint property.
- `renderOrderedLayers` now preserves the original `Error` object (including stack trace)
  when rejecting; previously all errors were re-wrapped with `String(error)`.
- `setLayerOpacity` now clamps the `opacity` argument to the valid range [0, 1].

## [1.3.0]

### Added

- `LayerAnalyzer` class — collects per-layer GPU timing, source load times, frame stats, time-to-idle, and generates heuristic optimization suggestions.
- `LayerManager` now accepts an optional `options` parameter. Pass `{ analyzer: true }` to auto-create and start a `LayerAnalyzer` accessible via `manager.analyzer`.
- `setLayerOpacity(layerId, opacity)` convenience method.
- `toggleLayerVisibility(layerId)` convenience method.
- `destroy()` method — removes all managed layers/sources and stops the analyzer. Call on component unmount.
- React hook `useLayerManager` exported from the `/react` sub-path entry point.
- Dual CJS + ESM build output via `tsup`.
- `peerDependencies` for `mapbox-gl` (required) and `react` (optional).

### Fixed

- Named export: `import { LayerManager } from '...'` now works as documented.
- Fixed broken bare specifier `'interfaces'` → `'./interfaces'` in `utils.ts`.
- Fixed loose equality `==` → `===` when looking up layers by ID.
- `extendLayerWithConfig` no longer mutates the original layer object, preventing nested `['all', ['all', ...]]` filter accumulation on repeated `renderOrderedLayers` calls.
- Removed duplicate `LayerConfig` type definition in `LayerManager.ts`.
- Fixed `ILayerManager.addLayers` signature to include optional `beforeLayerId` parameter.
- Fixed `"require": "./dist/index.cjs"` export — CJS output is now actually produced.
- Added `"types"` field to exports map for correct TypeScript resolution.

### Changed

- Build tool switched from `tsc` to `tsup` for dual-format output.
- `updateLayerLayout`, `updateLayerPaint` value parameters typed as `unknown` instead of `any`.
- `updateFeatureState` state parameter typed as `Record<string, unknown>` instead of `any`.
- `tsconfig.json`: added `moduleResolution: "bundler"`.

## [1.2.3]

### Fixed

- Minor internal adjustments.

## [1.2.2]

### Fixed

- Fixed the import of the LayerManager class.

## [1.2.1]

### Changed

- Updated the README.md file.

## [1.2.0]

### Changed

- Revised the structure of the project.
- Using the layer manager requires creating a new instance of the class instead of using the old useLayerManager function.