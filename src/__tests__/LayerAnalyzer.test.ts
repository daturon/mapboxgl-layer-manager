import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LayerAnalyzer } from '../LayerAnalyzer';
import { createMockMap, type MockMap } from './helpers/mockMap';

describe('LayerAnalyzer', () => {
  let map: MockMap;
  let analyzer: LayerAnalyzer;

  beforeEach(() => {
    map = createMockMap();
    analyzer = new LayerAnalyzer(map);
    vi.useFakeTimers();
  });

  afterEach(() => {
    analyzer.stop();
    vi.useRealTimers();
  });

  // ── start / stop ───────────────────────────────────────────────────────────

  describe('start / stop', () => {
    it('attaches core event listeners on start', () => {
      analyzer.start();
      const events = (map.on as ReturnType<typeof vi.fn>).mock.calls.map(([e]) => e);
      expect(events).toContain('load');
      expect(events).toContain('idle');
      expect(events).toContain('render');
      expect(events).toContain('sourcedataloading');
      expect(events).toContain('sourcedata');
    });

    it('detaches event listeners on stop', () => {
      analyzer.start();
      analyzer.stop();
      const offEvents = (map.off as ReturnType<typeof vi.fn>).mock.calls.map(([e]) => e);
      expect(offEvents).toContain('load');
      expect(offEvents).toContain('idle');
      expect(offEvents).toContain('render');
    });

    it('does not attach listeners twice when start is called again', () => {
      analyzer.start();
      const countBefore = (map.on as ReturnType<typeof vi.fn>).mock.calls.length;
      analyzer.start();
      expect((map.on as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBefore);
    });
  });

  // ── getFrameStats ──────────────────────────────────────────────────────────

  describe('getFrameStats', () => {
    it('returns zero stats when no data has been collected', () => {
      expect(analyzer.getFrameStats()).toEqual({ avg: 0, p95: 0, max: 0, sampleCount: 0 });
    });

    it('calculates avg, p95, max from gpu-timing-frame events', () => {
      analyzer.start();
      map._emit('gpu-timing-frame', { gpuTime: 10 });
      map._emit('gpu-timing-frame', { gpuTime: 20 });
      map._emit('gpu-timing-frame', { gpuTime: 30 });

      const stats = analyzer.getFrameStats();
      expect(stats.sampleCount).toBe(3);
      expect(stats.avg).toBe(20);
      expect(stats.max).toBe(30);
    });

    it('ignores gpu-timing-frame events with gpuTime of 0', () => {
      analyzer.start();
      map._emit('gpu-timing-frame', { gpuTime: 0 });
      expect(analyzer.getFrameStats().sampleCount).toBe(0);
    });
  });

  // ── getSlowestLayers ───────────────────────────────────────────────────────

  describe('getSlowestLayers', () => {
    it('returns empty array when no GPU timing data collected', () => {
      expect(analyzer.getSlowestLayers()).toEqual([]);
    });

    it('returns top N layers sorted by GPU time descending', () => {
      analyzer.start();
      map._emit('gpu-timing-layer', { layerTimes: { 'layer-a': 5, 'layer-b': 15, 'layer-c': 10 } });

      const top2 = analyzer.getSlowestLayers(2);
      expect(top2).toHaveLength(2);
      expect(top2[0].layerId).toBe('layer-b');
      expect(top2[1].layerId).toBe('layer-c');
    });

    it('includes gpuTimeShare summing to ~1', () => {
      analyzer.start();
      map._emit('gpu-timing-layer', { layerTimes: { 'layer-a': 10, 'layer-b': 10 } });

      const layers = analyzer.getSlowestLayers(10);
      const totalShare = layers.reduce((s, l) => s + l.gpuTimeShare, 0);
      expect(totalShare).toBeCloseTo(1, 1);
    });
  });

  // ── getUnusedLayers ────────────────────────────────────────────────────────

  describe('getUnusedLayers', () => {
    it('returns empty array when no managed layers are set', () => {
      expect(analyzer.getUnusedLayers()).toEqual([]);
    });

    it('returns all managed layers when no GPU timing data exists', () => {
      analyzer.setManagedLayerIds(['layer-a', 'layer-b']);
      expect(analyzer.getUnusedLayers()).toEqual(['layer-a', 'layer-b']);
    });

    it('excludes layers that appear in GPU timing data', () => {
      analyzer.start();
      analyzer.setManagedLayerIds(['layer-a', 'layer-b']);
      map._emit('gpu-timing-layer', { layerTimes: { 'layer-a': 5 } });

      expect(analyzer.getUnusedLayers()).toEqual(['layer-b']);
    });
  });

  // ── getSourceLoadTimes ─────────────────────────────────────────────────────

  describe('getSourceLoadTimes', () => {
    it('returns empty array initially', () => {
      expect(analyzer.getSourceLoadTimes()).toEqual([]);
    });

    it('records load duration from sourcedataloading to sourcedata', () => {
      analyzer.start();

      map._emit('sourcedataloading', { sourceId: 'my-source' });
      vi.advanceTimersByTime(500);
      map._emit('sourcedata', { sourceId: 'my-source', isSourceLoaded: true });

      const times = analyzer.getSourceLoadTimes();
      expect(times).toHaveLength(1);
      expect(times[0].sourceId).toBe('my-source');
      expect(times[0].loadTimeMs).toBeGreaterThanOrEqual(500);
    });

    it('updates existing entry on repeated loads of the same source', () => {
      analyzer.start();

      map._emit('sourcedataloading', { sourceId: 'src' });
      vi.advanceTimersByTime(200);
      map._emit('sourcedata', { sourceId: 'src', isSourceLoaded: true });

      map._emit('sourcedataloading', { sourceId: 'src' });
      vi.advanceTimersByTime(800);
      map._emit('sourcedata', { sourceId: 'src', isSourceLoaded: true });

      const times = analyzer.getSourceLoadTimes();
      expect(times).toHaveLength(1);
      expect(times[0].loadTimeMs).toBeGreaterThanOrEqual(800);
    });
  });

  // ── getReport ──────────────────────────────────────────────────────────────

  describe('getReport', () => {
    it('returns a well-shaped report with null timeToIdleMs before map loads', () => {
      const report = analyzer.getReport();

      expect(report).toMatchObject({
        timeToIdleMs: null,
        frameStats: { avg: 0, sampleCount: 0 },
        layerTimes: [],
        sourceLoadTimes: [],
        rendersPerSecond: 0,
        unusedLayerIds: [],
        suggestions: expect.any(Array),
      });
    });

    it('records timeToIdleMs after load and idle events', () => {
      analyzer.start();
      map._emit('load', undefined);
      vi.advanceTimersByTime(300);
      map._emit('idle', undefined);

      const report = analyzer.getReport();
      expect(report.timeToIdleMs).toBeGreaterThanOrEqual(300);
    });
  });

  // ── getSuggestions ─────────────────────────────────────────────────────────

  describe('getSuggestions', () => {
    it('returns no suggestions when no data is available', () => {
      expect(analyzer.getSuggestions()).toEqual([]);
    });

    it('suggests unused layer cleanup', () => {
      analyzer.start();
      analyzer.setManagedLayerIds(['layer-x', 'layer-y']);
      // No gpu-timing-layer events emitted → both are "unused"

      const suggestions = analyzer.getSuggestions();
      expect(suggestions.some((s) => s.includes('unused') || s.includes('layer-x'))).toBe(true);
    });

    it('suggests performance improvement when avg frame time exceeds 33ms', () => {
      analyzer.start();
      // Emit 31 samples (threshold for suggestions to kick in)
      for (let i = 0; i < 31; i++) {
        map._emit('gpu-timing-frame', { gpuTime: 40 });
      }

      const suggestions = analyzer.getSuggestions();
      expect(suggestions.some((s) => s.includes('fps') || s.includes('frame time'))).toBe(true);
    });

    it('suggests tiling for sources with load times > 2s', () => {
      analyzer.start();
      map._emit('sourcedataloading', { sourceId: 'big-source' });
      vi.advanceTimersByTime(3000);
      map._emit('sourcedata', { sourceId: 'big-source', isSourceLoaded: true });

      const suggestions = analyzer.getSuggestions();
      expect(suggestions.some((s) => s.includes('big-source'))).toBe(true);
    });
  });
});
