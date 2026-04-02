import { vi } from 'vitest';
import type { Map as MapboxGLMap } from 'mapbox-gl';

export type MockMap = MapboxGLMap & {
  _emit: (event: string, data?: unknown) => void;
  _sources: Map<string, unknown>;
  _layers: Map<string, { id: string; type: string }>;
};

export const createMockMap = (): MockMap => {
  const _sources = new Map<string, unknown>();
  const _layers = new Map<string, { id: string; type: string }>();
  const _layoutProps: Record<string, Record<string, unknown>> = {};
  const _listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  const map = {
    _sources,
    _layers,

    getSource: vi.fn((id: string) => _sources.get(id)),
    addSource: vi.fn((id: string, source: unknown) => {
      _sources.set(id, source);
    }),
    removeSource: vi.fn((id: string) => {
      _sources.delete(id);
    }),

    getLayer: vi.fn((id: string) => _layers.get(id)),
    addLayer: vi.fn((layer: { id: string; type: string }) => {
      _layers.set(layer.id, layer);
    }),
    removeLayer: vi.fn((id: string) => {
      _layers.delete(id);
    }),

    getStyle: vi.fn(() => ({
      layers: Array.from(_layers.values()),
      sources: Object.fromEntries(_sources),
    })),

    setFilter: vi.fn(),
    setPaintProperty: vi.fn(),
    setLayoutProperty: vi.fn((id: string, name: string, value: unknown) => {
      if (!_layoutProps[id]) _layoutProps[id] = {};
      _layoutProps[id][name] = value;
    }),
    getLayoutProperty: vi.fn((id: string, name: string) => _layoutProps[id]?.[name]),

    setFeatureState: vi.fn(),
    moveLayer: vi.fn(),

    // Returns a minimal canvas stub whose WebGL context exposes the
    // EXT_disjoint_timer_query_webgl2 extension with getQueryParameter so that
    // LayerAnalyzer.start() enables GPU timing in tests.
    getCanvas: vi.fn(() => ({
      getContext: (type: string) => {
        if (type === 'webgl2') {
          return {
            getExtension: (name: string) => {
              if (name === 'EXT_disjoint_timer_query_webgl2') {
                return { getQueryParameter: vi.fn() };
              }
              return null;
            },
          };
        }
        return null;
      },
    })),

    // Immediately invokes the callback so `await renderOrderedLayers()` resolves
    once: vi.fn((_event: string, handler: () => void) => {
      handler();
    }),

    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (_listeners[event]) {
        _listeners[event] = _listeners[event].filter((h) => h !== handler);
      }
    }),

    /** Emit an event to all registered listeners — use in tests to simulate map events. */
    _emit: (event: string, data?: unknown) => {
      (_listeners[event] ?? []).forEach((h) => h(data));
    },
  };

  return map as unknown as MockMap;
};
