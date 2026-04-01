import { describe, it, expect, beforeEach, vi } from 'vitest';
import LayerManager from '../LayerManager';
import { createMockMap, type MockMap } from './helpers/mockMap';
import type { Layer } from 'mapbox-gl';
import type { Source } from '../interfaces';

const makeSource = (id: string): Source => ({
  id,
  source: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
});

const makeLayer = (id: string, sourceId: string): Layer =>
  ({ id, type: 'circle', source: sourceId }) as unknown as Layer;

describe('LayerManager', () => {
  let map: MockMap;
  let manager: LayerManager;

  beforeEach(() => {
    map = createMockMap();
    manager = new LayerManager(map);
  });

  // ── Constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('accepts null map without throwing', () => {
      expect(() => new LayerManager(null)).not.toThrow();
    });

    it('has empty state initially', () => {
      expect(manager.getActiveCustomLayerIds()).toEqual([]);
      expect(manager.getActiveCustomSourceIds()).toEqual([]);
      expect(manager.getLayersFilters().size).toBe(0);
    });

    it('has no analyzer by default', () => {
      expect(manager.analyzer).toBeNull();
    });

    it('sources and layers default to empty arrays', () => {
      const mgr = new LayerManager(map);
      expect(mgr.getActiveCustomLayerIds()).toEqual([]);
    });

    it('creates an analyzer when { analyzer: true } is passed', () => {
      const mgr = new LayerManager(map, [], [], { analyzer: true });
      expect(mgr.analyzer).not.toBeNull();
    });
  });

  // ── getMapInstance ─────────────────────────────────────────────────────────

  describe('getMapInstance', () => {
    it('returns the map passed to the constructor', () => {
      expect(manager.getMapInstance()).toBe(map);
    });

    it('returns null when constructed with null', () => {
      expect(new LayerManager(null).getMapInstance()).toBeNull();
    });
  });

  // ── addSources / removeSources ─────────────────────────────────────────────

  describe('addSources / removeSources', () => {
    it('adds a source to the map and tracks it', () => {
      manager.addSources([makeSource('s1')]);

      expect(map.addSource).toHaveBeenCalledWith('s1', expect.any(Object));
      expect(manager.getActiveCustomSourceIds()).toContain('s1');
    });

    it('adds multiple sources', () => {
      manager.addSources([makeSource('s1'), makeSource('s2')]);
      expect(manager.getActiveCustomSourceIds()).toEqual(expect.arrayContaining(['s1', 's2']));
    });

    it('removes a source and stops tracking it', () => {
      manager.addSources([makeSource('s1')]);
      manager.removeSources(['s1']);

      expect(map.removeSource).toHaveBeenCalledWith('s1');
      expect(manager.getActiveCustomSourceIds()).not.toContain('s1');
    });

    it('does not call removeSource for an id not in the map', () => {
      manager.removeSources(['nonexistent']);
      expect(map.removeSource).not.toHaveBeenCalled();
    });

    it('is a no-op when map is null', () => {
      const mgr = new LayerManager(null);
      expect(() => mgr.addSources([makeSource('s1')])).not.toThrow();
    });
  });

  // ── addLayers / removeLayers ───────────────────────────────────────────────

  describe('addLayers / removeLayers', () => {
    it('adds a layer to the map and tracks it', () => {
      const layer = makeLayer('l1', 's1');
      manager.addLayers([layer]);

      expect(map.addLayer).toHaveBeenCalledWith(layer, undefined);
      expect(manager.getActiveCustomLayerIds()).toContain('l1');
    });

    it('respects the beforeLayerId argument', () => {
      const layer = makeLayer('l1', 's1');
      manager.addLayers([layer], 'background');
      expect(map.addLayer).toHaveBeenCalledWith(layer, 'background');
    });

    it('removes a layer and stops tracking it', () => {
      manager.addLayers([makeLayer('l1', 's1')]);
      manager.removeLayers(['l1']);

      expect(map.removeLayer).toHaveBeenCalledWith('l1');
      expect(manager.getActiveCustomLayerIds()).not.toContain('l1');
    });

    it('does not call removeLayer for an id not in the map', () => {
      manager.removeLayers(['nonexistent']);
      expect(map.removeLayer).not.toHaveBeenCalled();
    });
  });

  // ── updateLayerFilter / removeLayerFilter ──────────────────────────────────

  describe('updateLayerFilter / removeLayerFilter', () => {
    beforeEach(() => {
      manager.addLayers([makeLayer('l1', 's1')]);
    });

    it('calls setFilter with the named filter wrapped in all', () => {
      const filter = ['==', 'type', 'park'] as unknown as import('mapbox-gl').Expression;
      manager.updateLayerFilter('l1', filter, 'cat');

      expect(map.setFilter).toHaveBeenCalledWith('l1', ['all', filter]);
    });

    it('defaults filterName to "default"', () => {
      const filter = ['==', 'a', '1'] as unknown as import('mapbox-gl').Expression;
      manager.updateLayerFilter('l1', filter);

      expect(manager.getLayersFilters().get('l1')?.default).toBe(filter);
    });

    it('composes multiple named filters', () => {
      const f1 = ['==', 'a', '1'] as unknown as import('mapbox-gl').Expression;
      const f2 = ['==', 'b', '2'] as unknown as import('mapbox-gl').Expression;
      manager.updateLayerFilter('l1', f1, 'f1');
      manager.updateLayerFilter('l1', f2, 'f2');

      expect(map.setFilter).toHaveBeenLastCalledWith('l1', ['all', f1, f2]);
    });

    it('removes a named filter without affecting others', () => {
      const f1 = ['==', 'a', '1'] as unknown as import('mapbox-gl').Expression;
      const f2 = ['==', 'b', '2'] as unknown as import('mapbox-gl').Expression;
      manager.updateLayerFilter('l1', f1, 'f1');
      manager.updateLayerFilter('l1', f2, 'f2');
      manager.removeLayerFilter('l1', 'f1');

      expect(map.setFilter).toHaveBeenLastCalledWith('l1', ['all', f2]);
    });

    it('is a no-op when the layer does not exist', () => {
      const filter = ['==', 'x', '1'] as unknown as import('mapbox-gl').Expression;
      manager.updateLayerFilter('nonexistent', filter);
      expect(map.setFilter).not.toHaveBeenCalled();
    });
  });

  // ── setLayerOpacity ────────────────────────────────────────────────────────

  describe('setLayerOpacity', () => {
    it('sets circle-opacity for a circle layer', () => {
      manager.addLayers([makeLayer('l1', 's1')]);
      manager.setLayerOpacity('l1', 0.5);

      expect(map.setPaintProperty).toHaveBeenCalledWith('l1', 'circle-opacity', 0.5);
    });

    it('sets fill-opacity for a fill layer', () => {
      const fillLayer = { id: 'fl', type: 'fill', source: 's1' } as unknown as Layer;
      manager.addLayers([fillLayer]);
      manager.setLayerOpacity('fl', 0.3);

      expect(map.setPaintProperty).toHaveBeenCalledWith('fl', 'fill-opacity', 0.3);
    });

    it('is a no-op for an unknown layer id', () => {
      manager.setLayerOpacity('nonexistent', 0.5);
      expect(map.setPaintProperty).not.toHaveBeenCalled();
    });
  });

  // ── toggleLayerVisibility ──────────────────────────────────────────────────

  describe('toggleLayerVisibility', () => {
    beforeEach(() => {
      manager.addLayers([makeLayer('l1', 's1')]);
    });

    it('sets visibility to none when currently visible', () => {
      vi.spyOn(map, 'getLayoutProperty').mockReturnValueOnce('visible');
      manager.toggleLayerVisibility('l1');
      expect(map.setLayoutProperty).toHaveBeenCalledWith('l1', 'visibility', 'none');
    });

    it('sets visibility to visible when currently none', () => {
      vi.spyOn(map, 'getLayoutProperty').mockReturnValueOnce('none');
      manager.toggleLayerVisibility('l1');
      expect(map.setLayoutProperty).toHaveBeenCalledWith('l1', 'visibility', 'visible');
    });
  });

  // ── updateLayerPaint / updateLayerLayout ───────────────────────────────────

  describe('updateLayerPaint / updateLayerLayout', () => {
    beforeEach(() => {
      manager.addLayers([makeLayer('l1', 's1')]);
    });

    it('delegates to map.setPaintProperty', () => {
      manager.updateLayerPaint('l1', 'circle-color', '#ff0000');
      expect(map.setPaintProperty).toHaveBeenCalledWith('l1', 'circle-color', '#ff0000', undefined);
    });

    it('delegates to map.setLayoutProperty', () => {
      manager.updateLayerLayout('l1', 'visibility', 'none');
      expect(map.setLayoutProperty).toHaveBeenCalledWith('l1', 'visibility', 'none', undefined);
    });
  });

  // ── updateFeatureState ─────────────────────────────────────────────────────

  describe('updateFeatureState', () => {
    it('calls map.setFeatureState with the correct arguments', () => {
      manager.updateFeatureState('src', 42, { hover: true });
      expect(map.setFeatureState).toHaveBeenCalledWith({ source: 'src', id: 42 }, { hover: true });
    });
  });

  // ── destroy ────────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('removes all managed layers and sources', () => {
      manager.addSources([makeSource('s1')]);
      manager.addLayers([makeLayer('l1', 's1')]);
      manager.destroy();

      expect(map.removeLayer).toHaveBeenCalledWith('l1');
      expect(map.removeSource).toHaveBeenCalledWith('s1');
    });

    it('clears all internal tracking state', () => {
      manager.addSources([makeSource('s1')]);
      manager.addLayers([makeLayer('l1', 's1')]);
      manager.destroy();

      expect(manager.getActiveCustomLayerIds()).toEqual([]);
      expect(manager.getActiveCustomSourceIds()).toEqual([]);
      expect(manager.getLayersFilters().size).toBe(0);
    });

    it('does not throw when map is null', () => {
      expect(() => new LayerManager(null).destroy()).not.toThrow();
    });

    it('stops and clears the analyzer', () => {
      const mgr = new LayerManager(map, [], [], { analyzer: true });
      expect(mgr.analyzer).not.toBeNull();
      mgr.destroy();
      expect(mgr.analyzer).toBeNull();
    });
  });

  // ── renderOrderedLayers ────────────────────────────────────────────────────

  describe('renderOrderedLayers', () => {
    it('rejects when map is null', async () => {
      const mgr = new LayerManager(null, [makeSource('s1')], [makeLayer('l1', 's1')]);
      await expect(mgr.renderOrderedLayers(['l1'])).rejects.toThrow('Map is not initialized');
    });

    it('adds source and layer for the requested layer id', async () => {
      const mgr = new LayerManager(map, [makeSource('s1')], [makeLayer('l1', 's1')]);
      await mgr.renderOrderedLayers(['l1']);

      expect(map.addSource).toHaveBeenCalledWith('s1', expect.any(Object));
      expect(map.addLayer).toHaveBeenCalled();
      expect(mgr.getActiveCustomLayerIds()).toContain('l1');
    });

    it('removes layers not in the new set', async () => {
      const mgr = new LayerManager(
        map,
        [makeSource('s1'), makeSource('s2')],
        [makeLayer('l1', 's1'), makeLayer('l2', 's2')],
      );
      await mgr.renderOrderedLayers(['l1', 'l2']);

      // Now render with only l1 — l2 should be removed
      // (reset mock call history to detect discrete remove call)
      vi.clearAllMocks();
      // add 'l2' to _layers so getStyle sees it
      map._layers.set('l2', { id: 'l2', type: 'circle' });

      await mgr.renderOrderedLayers(['l1']);
      expect(map.removeLayer).toHaveBeenCalledWith('l2');
    });

    it('re-adds layers to ensure correct ordering on repeated calls', async () => {
      const mgr = new LayerManager(map, [makeSource('s1')], [makeLayer('l1', 's1')]);
      await mgr.renderOrderedLayers(['l1']);

      vi.clearAllMocks();
      await mgr.renderOrderedLayers(['l1']);

      expect(map.removeLayer).toHaveBeenCalledWith('l1');
      expect(map.addLayer).toHaveBeenCalled();
    });
  });
});
