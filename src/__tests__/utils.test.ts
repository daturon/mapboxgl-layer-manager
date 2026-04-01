import { describe, it, expect } from 'vitest';
import { extendLayerWithConfig } from '../utils';
import type { Layer } from 'mapbox-gl';

const baseLayer: Layer = {
  id: 'test-layer',
  type: 'circle',
  source: 'test-source',
} as unknown as Layer;

describe('extendLayerWithConfig', () => {
  it('returns a new object and does not mutate the original', () => {
    const filter = ['==', 'type', 'park'] as unknown as import('mapbox-gl').Expression;
    const result = extendLayerWithConfig(baseLayer, { filter });

    expect(result).not.toBe(baseLayer);
    expect(baseLayer.filter).toBeUndefined();
  });

  it('wraps the filter in ["all", filter]', () => {
    const filter = ['==', 'type', 'park'] as unknown as import('mapbox-gl').Expression;
    const result = extendLayerWithConfig(baseLayer, { filter });

    expect(result.filter).toEqual(['all', filter]);
  });

  it('does not add filter when none provided', () => {
    const result = extendLayerWithConfig(baseLayer, {});
    expect(result.filter).toBeUndefined();
  });

  it('applies layout override', () => {
    const layout = { visibility: 'none' } as unknown as import('mapbox-gl').AnyLayout;
    const result = extendLayerWithConfig(baseLayer, { layout });
    expect(result.layout).toBe(layout);
  });

  it('applies paint override', () => {
    const paint = { 'circle-radius': 8 } as unknown as import('mapbox-gl').AnyPaint;
    const result = extendLayerWithConfig(baseLayer, { paint });
    expect(result.paint).toBe(paint);
  });

  it('does not nest filters on repeated calls with the same base layer', () => {
    const filter = ['==', 'type', 'park'] as unknown as import('mapbox-gl').Expression;
    const r1 = extendLayerWithConfig(baseLayer, { filter });
    const r2 = extendLayerWithConfig(baseLayer, { filter });

    // Both results have the same depth — mutation bug would cause ['all', ['all', ...]] on second call
    expect(r1.filter).toEqual(['all', filter]);
    expect(r2.filter).toEqual(['all', filter]);
  });
});
