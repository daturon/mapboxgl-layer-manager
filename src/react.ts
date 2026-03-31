/**
 * React bindings for mapboxgl-layer-manager.
 *
 * Import from '@daturon/mapboxgl-layer-manager/react'
 *
 * @example
 * ```tsx
 * import { useLayerManager } from '@daturon/mapboxgl-layer-manager/react';
 *
 * function MapComponent({ map }: { map: mapboxgl.Map }) {
 *   const manager = useLayerManager(map, sources, layers);
 *   // manager is a stable LayerManager instance; null until map is ready
 * }
 * ```
 */
import { useEffect, useRef } from 'react';
import { Map as MapboxGLMap } from 'mapbox-gl';
import LayerManager from './LayerManager';
import type { Source, LayerManagerOptions } from './interfaces';
import type { Layer } from 'mapbox-gl';

/**
 * Creates and manages a `LayerManager` instance tied to a Mapbox GL map.
 *
 * The manager is created once when `map` becomes non-null and is automatically
 * destroyed (removing all managed layers and sources) when the component unmounts
 * or when `map` changes.
 *
 * @param map - A Mapbox GL Map instance, or null while the map is initializing.
 * @param sources - Initial sources to register with the manager.
 * @param layers - Initial layer definitions to register with the manager.
 * @param options - Optional LayerManager configuration (e.g. `{ analyzer: true }`).
 * @returns The `LayerManager` instance, or `null` if `map` is not yet available.
 */
export function useLayerManager(
  map: MapboxGLMap | null,
  sources: Source[] = [],
  layers: Layer[] = [],
  options?: LayerManagerOptions,
): LayerManager | null {
  const instanceRef = useRef<LayerManager | null>(null);

  useEffect(() => {
    if (!map) return;

    instanceRef.current = new LayerManager(map, sources, layers, options);

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // Re-create only when the map instance changes; sources/layers/options are
    // treated as initial values (consistent with how MapboxGL itself works).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return instanceRef.current;
}
