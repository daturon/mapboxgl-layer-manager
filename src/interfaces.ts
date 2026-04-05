import {
  AnySourceData,
  Layer,
  Expression,
  AnyLayout,
  AnyPaint,
  Map as MapboxGLMap,
} from 'mapbox-gl';

export type Source = { id: string; source: AnySourceData };

/** Options passed to Mapbox GL style setter methods. */
export interface StyleSetterOptions {
  validate?: boolean;
}

export interface LayerConfig {
  filter?: Expression;
  layout?: AnyLayout;
  paint?: AnyPaint;
}

export interface LayerManagerOptions {
  /** Automatically create and start a LayerAnalyzer for this manager instance. */
  analyzer?: boolean;
  /** Enable console warnings for no-op method calls (e.g. null map, missing layers). */
  debug?: boolean;
}

export interface ILayerManager {
  addSources: (sources: Source[]) => void;
  removeSources: (sourceIds: string[]) => void;
  addLayers: (layers: Layer[], beforeLayerId?: string) => void;
  removeLayers: (layerIds: string[]) => void;
  getActiveCustomLayerIds: () => string[];
  getActiveCustomSourceIds: () => string[];
  getLayersFilters: () => Map<string, Record<string, Expression>>;
  getMapInstance: () => MapboxGLMap | null;
  renderOrderedLayers: (
    layerIds: string[],
    layerConfigs?: Record<string, LayerConfig>,
    beforeLayerId?: string,
  ) => Promise<void>;
  updateLayerFilter: (layerId: string, filter: Expression, filterName?: string) => void;
  removeLayerFilter: (layerId: string, filterName: string) => void;
  updateLayerLayout: (
    layerId: string,
    name: string,
    value: unknown,
    options?: StyleSetterOptions,
  ) => void;
  updateLayerPaint: (
    layerId: string,
    name: string,
    value: unknown,
    options?: StyleSetterOptions,
  ) => void;
  updateFeatureState: (
    sourceId: string,
    featureId: string | number,
    state: Record<string, unknown>,
  ) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  toggleLayerVisibility: (layerId: string) => void;
  destroy: () => void;
}
