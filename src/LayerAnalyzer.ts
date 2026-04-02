import { Map as MapboxGLMap, MapSourceDataEvent } from 'mapbox-gl';

// GPU timing events are part of mapbox-gl v3 but not yet in @types/mapbox-gl
interface GPUTimingFrameEvent {
  cpuTime: number;
  gpuTime: number;
}

interface GPUTimingLayerEvent {
  layerTimes: Record<string, number>;
}

export interface FrameStats {
  /** Average GPU frame time in ms. */
  avg: number;
  /** 95th percentile GPU frame time in ms. */
  p95: number;
  /** Maximum GPU frame time in ms. */
  max: number;
  /** Number of samples collected. */
  sampleCount: number;
}

export interface SourceLoadTime {
  sourceId: string;
  /** Time from first `sourcedataloading` to `sourcedata` (isSourceLoaded=true), in ms. */
  loadTimeMs: number;
}

export interface LayerTimeStat {
  layerId: string;
  /** Average GPU render time in ms. */
  avgGpuTimeMs: number;
  /** Fraction of total GPU time spent on this layer (0–1). */
  gpuTimeShare: number;
}

export interface AnalyzerReport {
  /** Time in ms from map `load` to first `idle` event. null if not reached yet. */
  timeToIdleMs: number | null;
  frameStats: FrameStats;
  /** Per-layer GPU timing stats, sorted by avgGpuTimeMs descending. */
  layerTimes: LayerTimeStat[];
  sourceLoadTimes: SourceLoadTime[];
  /** Approximate render events per second over the last measurement window. */
  rendersPerSecond: number;
  /** Managed layer IDs that have never appeared in GPU timing data (likely not visible). */
  unusedLayerIds: string[];
  /** Human-readable optimization suggestions based on collected data. */
  suggestions: string[];
}

export class LayerAnalyzer {
  private readonly map: MapboxGLMap;
  private loadTime: number | null = null;
  private firstIdleTime: number | null = null;
  private frameGpuTimes: number[] = [];
  private layerGpuAccum: Record<string, number[]> = {};
  private sourceLoadStart: Record<string, number> = {};
  private collectedSourceLoadTimes: SourceLoadTime[] = [];
  private renderCount = 0;
  private renderWindowStart = Date.now();
  private _rendersPerSecond = 0;
  private managedLayerIds: string[] = [];
  private active = false;
  private gpuTimingEnabled = false;

  // Bound handlers kept for cleanup
  private readonly onLoad: () => void;
  private readonly onIdle: () => void;
  private readonly onRender: () => void;
  private readonly onGpuFrame: (e: GPUTimingFrameEvent) => void;
  private readonly onGpuLayer: (e: GPUTimingLayerEvent) => void;
  private readonly onSourceDataLoading: (e: MapSourceDataEvent) => void;
  private readonly onSourceData: (e: MapSourceDataEvent) => void;

  constructor(map: MapboxGLMap) {
    this.map = map;

    this.onLoad = () => {
      this.loadTime = Date.now();
    };

    this.onIdle = () => {
      if (this.firstIdleTime === null && this.loadTime !== null) {
        this.firstIdleTime = Date.now();
      }
    };

    this.onRender = () => {
      this.renderCount++;
      const now = Date.now();
      const elapsed = now - this.renderWindowStart;
      if (elapsed >= 1000) {
        this._rendersPerSecond = Math.round(this.renderCount / (elapsed / 1000));
        this.renderCount = 0;
        this.renderWindowStart = now;
      }
    };

    this.onGpuFrame = (e: GPUTimingFrameEvent) => {
      if (e.gpuTime > 0) {
        this.frameGpuTimes.push(e.gpuTime);
        if (this.frameGpuTimes.length > 300) this.frameGpuTimes.shift();
      }
    };

    this.onGpuLayer = (e: GPUTimingLayerEvent) => {
      for (const [layerId, time] of Object.entries(e.layerTimes)) {
        if (!this.layerGpuAccum[layerId]) this.layerGpuAccum[layerId] = [];
        this.layerGpuAccum[layerId].push(time);
        if (this.layerGpuAccum[layerId].length > 300) this.layerGpuAccum[layerId].shift();
      }
    };

    this.onSourceDataLoading = (e: MapSourceDataEvent) => {
      if (e.sourceId && !this.sourceLoadStart[e.sourceId]) {
        this.sourceLoadStart[e.sourceId] = Date.now();
      }
    };

    this.onSourceData = (e: MapSourceDataEvent) => {
      if (e.sourceId && e.isSourceLoaded && this.sourceLoadStart[e.sourceId]) {
        const loadTimeMs = Date.now() - this.sourceLoadStart[e.sourceId];
        delete this.sourceLoadStart[e.sourceId];
        const idx = this.collectedSourceLoadTimes.findIndex((s) => s.sourceId === e.sourceId);
        if (idx >= 0) {
          this.collectedSourceLoadTimes[idx] = { sourceId: e.sourceId, loadTimeMs };
        } else {
          this.collectedSourceLoadTimes.push({ sourceId: e.sourceId, loadTimeMs });
        }
      }
    };
  }

  /** Start collecting performance data from the map. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.map.on('load', this.onLoad);
    this.map.on('idle', this.onIdle);
    this.map.on('render', this.onRender);
    this.map.on('sourcedataloading', this.onSourceDataLoading);
    this.map.on('sourcedata', this.onSourceData);
    // gpu-timing-* events are v3+ and not yet in @types/mapbox-gl
    // Only enable if the extension object itself exposes getQueryParameter.
    // With EXT_disjoint_timer_query_webgl2 in WebGL2, getQueryParameter is
    // promoted to the gl context rather than the extension object, so
    // mapbox-gl's queryGpuTimers (which calls ext.getQueryParameter) would
    // crash. Guard against that by verifying the method exists on the extension.
    const canvas = this.map.getCanvas();
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext =
        gl.getExtension('EXT_disjoint_timer_query_webgl2') ||
        gl.getExtension('EXT_disjoint_timer_query');
      this.gpuTimingEnabled = !!(ext && typeof (ext as any).getQueryParameter === 'function');
    }
    if (this.gpuTimingEnabled) {
      (this.map as unknown as Record<string, Function>)['on']('gpu-timing-frame', this.onGpuFrame);
      (this.map as unknown as Record<string, Function>)['on']('gpu-timing-layer', this.onGpuLayer);
    }
  }

  /** Stop collecting data and detach all event listeners. */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.map.off('load', this.onLoad);
    this.map.off('idle', this.onIdle);
    this.map.off('render', this.onRender);
    this.map.off('sourcedataloading', this.onSourceDataLoading);
    this.map.off('sourcedata', this.onSourceData);
    if (this.gpuTimingEnabled) {
      (this.map as unknown as Record<string, Function>)['off']('gpu-timing-frame', this.onGpuFrame);
      (this.map as unknown as Record<string, Function>)['off']('gpu-timing-layer', this.onGpuLayer);
      this.gpuTimingEnabled = false;
    }
  }

  /** Inform the analyzer which layer IDs are managed, enabling unused-layer detection. */
  setManagedLayerIds(ids: string[]): void {
    this.managedLayerIds = [...ids];
  }

  /** Frame-level GPU timing statistics. */
  getFrameStats(): FrameStats {
    const times = [...this.frameGpuTimes];
    if (times.length === 0) return { avg: 0, p95: 0, max: 0, sampleCount: 0 };

    const sorted = times.slice().sort((a, b) => a - b);
    const avg = times.reduce((s, v) => s + v, 0) / times.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const max = sorted[sorted.length - 1];
    return {
      avg: +avg.toFixed(2),
      p95: +p95.toFixed(2),
      max: +max.toFixed(2),
      sampleCount: times.length,
    };
  }

  /** Returns the top N layers by average GPU render time. */
  getSlowestLayers(n = 5): LayerTimeStat[] {
    return this._buildLayerTimeStats()
      .sort((a, b) => b.avgGpuTimeMs - a.avgGpuTimeMs)
      .slice(0, n);
  }

  /**
   * Returns managed layer IDs that have never appeared in GPU render timing data,
   * suggesting they are invisible or not contributing to render.
   */
  getUnusedLayers(): string[] {
    if (this.managedLayerIds.length === 0) return [];
    const rendered = new Set(Object.keys(this.layerGpuAccum));
    return this.managedLayerIds.filter((id) => !rendered.has(id));
  }

  /** Returns per-source load times collected since `start()`. */
  getSourceLoadTimes(): SourceLoadTime[] {
    return [...this.collectedSourceLoadTimes];
  }

  /** Returns heuristic optimization suggestions based on collected data. */
  getSuggestions(): string[] {
    const suggestions: string[] = [];
    const frameStats = this.getFrameStats();
    const slowLayers = this.getSlowestLayers(3);
    const unusedLayers = this.getUnusedLayers();
    const slowSources = this.collectedSourceLoadTimes.filter((s) => s.loadTimeMs > 2000);

    if (frameStats.sampleCount > 30) {
      if (frameStats.avg > 33) {
        suggestions.push(
          `Average frame time is ${frameStats.avg}ms (below 30fps) — consider reducing layer count or simplifying geometry.`,
        );
      }
      if (frameStats.p95 > 50) {
        suggestions.push(
          `p95 frame time is ${frameStats.p95}ms — intermittent spikes detected. Heavy layers may be causing jank during interaction.`,
        );
      }
      if (slowLayers.length > 0 && slowLayers[0].gpuTimeShare > 0.3) {
        const top = slowLayers[0];
        suggestions.push(
          `Layer "${top.layerId}" uses ${Math.round(top.gpuTimeShare * 100)}% of GPU time — consider simplifying its geometry or paint expressions.`,
        );
      }
    }

    if (unusedLayers.length > 0) {
      suggestions.push(
        `${unusedLayers.length} layer(s) appear unused (no GPU activity): ${unusedLayers.join(', ')}. Consider lazy-loading or removing them.`,
      );
    }

    slowSources.forEach((s) => {
      suggestions.push(
        `Source "${s.sourceId}" took ${(s.loadTimeMs / 1000).toFixed(1)}s to load — consider switching to vector tiles or pre-tiling the data.`,
      );
    });

    if (this._rendersPerSecond > 60 && frameStats.avg > 16) {
      suggestions.push(
        `Map is rendering ${this._rendersPerSecond} frames/sec with high frame times — check for unnecessary continuous animations or frequent data updates.`,
      );
    }

    return suggestions;
  }

  /** Returns a full performance report snapshot. */
  getReport(): AnalyzerReport {
    return {
      timeToIdleMs:
        this.loadTime !== null && this.firstIdleTime !== null
          ? this.firstIdleTime - this.loadTime
          : null,
      frameStats: this.getFrameStats(),
      layerTimes: this._buildLayerTimeStats().sort((a, b) => b.avgGpuTimeMs - a.avgGpuTimeMs),
      sourceLoadTimes: this.getSourceLoadTimes(),
      rendersPerSecond: this._rendersPerSecond,
      unusedLayerIds: this.getUnusedLayers(),
      suggestions: this.getSuggestions(),
    };
  }

  private _buildLayerTimeStats(): LayerTimeStat[] {
    const entries = Object.entries(this.layerGpuAccum);
    if (entries.length === 0) return [];

    const avgs = entries.map(([layerId, times]) => ({
      layerId,
      avgGpuTimeMs: times.reduce((s, v) => s + v, 0) / times.length,
    }));
    const total = avgs.reduce((s, e) => s + e.avgGpuTimeMs, 0);

    return avgs.map((e) => ({
      layerId: e.layerId,
      avgGpuTimeMs: +e.avgGpuTimeMs.toFixed(3),
      gpuTimeShare: total > 0 ? +(e.avgGpuTimeMs / total).toFixed(3) : 0,
    }));
  }
}
