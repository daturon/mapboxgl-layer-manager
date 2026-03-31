# Mapbox GL Layer Manager

![npm version](https://img.shields.io/npm/v/@daturon/mapboxgl-layer-manager)

**The Layer Manager for Mapbox GL** is a powerful utility that simplifies the management of layers and sources in the **Mapbox GL** environment. This package allows easy **layer reordering, visibility toggling, opacity adjustments, and other modifications**, making it an essential tool for developers working with interactive maps.

It supports dynamic management of multiple sources and layers, allowing developers to **dynamically change active sources, reorder layers efficiently, and automatically free unused resources** to optimize performance.

New in v1.3: built-in **Performance Analyzer** that surfaces per-layer GPU timing, source load times, frame stats, and actionable optimization suggestions — and a first-class **React hook** (`useLayerManager`) for seamless SPA integration.

---

## Features

- **Easy Layer and Source Management** – Add, remove, and update layers and sources effortlessly.
- **Dynamic Layer Reordering** – Change layer positions in real-time.
- **Customize Layer Styling** – Adjust **opacity, visibility, and colors** dynamically.
- **Manage Multiple Sources** – Attach and detach different sources on the fly.
- **Automatic Resource Cleanup** – Unused sources and layers are removed automatically to improve efficiency.
- **Advanced Filtering System** – Filters have unique identifiers, making them easy to enable/disable dynamically.
- **Performance Analyzer** – Collect GPU timing, frame stats, and source load times; get heuristic optimization suggestions.
- **React Hook** – `useLayerManager` for clean lifecycle management with automatic destroy on unmount.

---

## Installation

```sh
npm install @daturon/mapboxgl-layer-manager
```

`mapbox-gl` (>=3.0.0) is a required peer dependency. React (>=16.8.0) is optional — only needed if you use the React hook.

---

## Usage

### 1. Import and Initialize

```ts
import { LayerManager } from '@daturon/mapboxgl-layer-manager';

const map = new mapboxgl.Map({ /* ... */ });

const sources = [
  { id: 'my-source', source: { type: 'geojson', data: myGeoJSONData } },
];

const layers = [
  {
    id: 'my-layer',
    type: 'circle',
    source: 'my-source',
    paint: { 'circle-radius': 5, 'circle-color': '#ff0000' },
  },
];

const manager = new LayerManager(map, sources, layers);
```

### 2. Render Layers in Order

```ts
// Adds sources, removes unused ones, and renders layers in the given order.
// Call again whenever the active layer set changes.
await manager.renderOrderedLayers(['my-layer'], {
  'my-layer': {
    filter: ['==', ['get', 'type'], 'park'],
    paint: { 'circle-color': '#00ff00' },
  },
});
```

### 3. Modify Layer Properties

```ts
manager.setLayerOpacity('my-layer', 0.5);
manager.toggleLayerVisibility('my-layer');

manager.updateLayerPaint('my-layer', 'circle-color', '#0000ff');
manager.updateLayerLayout('my-layer', 'visibility', 'none');
```

### 4. Manage Filters Dynamically

```ts
// Filters are named, so multiple independent filters compose automatically.
manager.updateLayerFilter('my-layer', ['==', ['get', 'category'], 'park'], 'category-filter');
manager.updateLayerFilter('my-layer', ['>', ['get', 'area'], 500], 'area-filter');

// Remove one filter without affecting the other.
manager.removeLayerFilter('my-layer', 'area-filter');
```

### 5. Add / Remove Sources and Layers Imperatively

```ts
manager.addSources([{ id: 'new-source', source: { type: 'geojson', data: newData } }]);
manager.addLayers([{ id: 'new-layer', type: 'fill', source: 'new-source', paint: {} }]);

manager.removeLayers(['new-layer']);
manager.removeSources(['new-source']);
```

### 6. Feature State

```ts
manager.updateFeatureState('my-source', featureId, { hover: true });
```

### 7. Cleanup

```ts
// Removes all managed layers and sources from the map.
manager.destroy();
```

---

## Performance Analyzer

Enable the built-in analyzer to collect GPU timing, frame stats, and source load durations, then call `getReport()` or `getSuggestions()` for actionable insights.

```ts
import { LayerManager, LayerAnalyzer } from '@daturon/mapboxgl-layer-manager';

// Option A — enable via LayerManager option:
const manager = new LayerManager(map, sources, layers, { analyzer: true });
const report = manager.analyzer!.getReport();

// Option B — standalone (works without LayerManager):
const analyzer = new LayerAnalyzer(map);
analyzer.start();

// ... after some map interaction ...

const report = analyzer.getReport();
console.log(report.timeToIdleMs);         // ms from load → first idle
console.log(report.frameStats);           // { avg, p95, max, sampleCount }
console.log(report.layerTimes);           // per-layer GPU time + share
console.log(report.sourceLoadTimes);      // per-source load duration
console.log(report.unusedLayerIds);       // layers with no GPU activity
console.log(report.suggestions);          // ["Layer X uses 45% of GPU time..."]

analyzer.getSlowestLayers(3);             // top 3 layers by GPU time
analyzer.getUnusedLayers();               // layers never rendered
analyzer.stop();
```

---

## React Hook

Import from the `/react` sub-path. The manager is created when `map` becomes non-null and destroyed automatically on unmount.

```tsx
import { useLayerManager } from '@daturon/mapboxgl-layer-manager/react';

function MapLayers({ map }: { map: mapboxgl.Map | null }) {
  const manager = useLayerManager(map, sources, layers, { analyzer: true });

  useEffect(() => {
    if (!manager) return;
    manager.renderOrderedLayers(['my-layer']);
  }, [manager]);

  return null;
}
```

---

## API Reference

### `LayerManager`

| Method | Description |
|---|---|
| `new LayerManager(map, sources?, layers?, options?)` | Create a manager. `sources` and `layers` are initial registrations. Pass `{ analyzer: true }` to enable the analyzer. |
| `renderOrderedLayers(ids, configs?, beforeId?)` | Render the given layers in order, auto-adding/removing sources and layers as needed. Returns a Promise that resolves after the next render. |
| `addSources(sources)` | Register and add sources to the map. |
| `removeSources(ids)` | Remove sources from the map and internal registry. |
| `addLayers(layers, beforeId?)` | Add layers to the map. |
| `removeLayers(ids)` | Remove layers from the map. |
| `setLayerOpacity(id, opacity)` | Set a layer's opacity (0–1). Auto-detects the correct paint property by layer type. |
| `toggleLayerVisibility(id)` | Toggle a layer between `'visible'` and `'none'`. |
| `updateLayerFilter(id, filter, name?)` | Set or update a named filter. Multiple named filters compose with `'all'`. |
| `removeLayerFilter(id, name)` | Remove a named filter. |
| `updateLayerPaint(id, name, value, options?)` | Update a paint property. |
| `updateLayerLayout(id, name, value, options?)` | Update a layout property. |
| `updateFeatureState(sourceId, featureId, state)` | Set feature state for hover/selection effects. |
| `getActiveCustomLayerIds()` | Returns IDs of all currently active managed layers. |
| `getActiveCustomSourceIds()` | Returns IDs of all currently active managed sources. |
| `getLayersFilters()` | Returns the full filter map. |
| `getMapInstance()` | Returns the underlying `mapboxgl.Map`. |
| `analyzer` | The `LayerAnalyzer` instance (if `{ analyzer: true }` was passed). |
| `destroy()` | Remove all managed layers/sources and stop the analyzer. |

### `LayerAnalyzer`

| Method | Description |
|---|---|
| `new LayerAnalyzer(map)` | Create a standalone analyzer for a map instance. |
| `start()` | Begin collecting performance data. |
| `stop()` | Detach all event listeners. |
| `setManagedLayerIds(ids)` | Register layer IDs to track for unused-layer detection. |
| `getReport()` | Full snapshot: frame stats, layer times, source load times, suggestions. |
| `getFrameStats()` | `{ avg, p95, max, sampleCount }` GPU frame times. |
| `getSlowestLayers(n?)` | Top N layers by average GPU render time. |
| `getUnusedLayers()` | Managed layers with no GPU activity recorded. |
| `getSourceLoadTimes()` | Per-source load durations from `sourcedataloading` → loaded. |
| `getSuggestions()` | Array of human-readable optimization tips. |

---

[![Watch the demo](https://img.youtube.com/vi/2fY3GIyvchk/0.jpg)](https://www.youtube.com/watch?v=2fY3GIyvchk)

---

## Contributing

1. Fork and clone the repository.
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Lint: `npm run lint`
5. Open a pull request with your changes.

---

## License

MIT — see [LICENSE](LICENSE).

## Links

- **GitHub**: [daturon/mapboxgl-layer-manager](https://github.com/daturon/mapboxgl-layer-manager)
- **Issues**: [GitHub Issues](https://github.com/daturon/mapboxgl-layer-manager/issues)
- **npm**: [@daturon/mapboxgl-layer-manager](https://www.npmjs.com/package/@daturon/mapboxgl-layer-manager)

