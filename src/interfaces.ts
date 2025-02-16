import { AnySourceData, Layer, Expression, AnyLayout, AnyPaint, FilterOptions } from 'mapbox-gl';

export interface ILayerManager {
  addSources: (sources: { id: string; source: AnySourceData }[]) => void;
  removeSources: (sourceIds: string[]) => void;
  addLayers: (layers: Layer[]) => void;
  removeLayers: (layerIds: string[]) => void;
  getActiveCustomLayerIds: () => string[];
  getActiveCustomSourceIds: () => string[];
  getLayersFilters: () => Map<string, Record<string, Expression>>;
  getMapInstance: () => mapboxgl.Map | null;
  renderOrderedLayers: (
    layerIds: string[],
    config?: Record<
      string,
      {
        filter: Expression | undefined;
        layout: AnyLayout | undefined;
        paint: AnyPaint | undefined;
      }
    >,
    beforeLayerId?: string,
  ) => Promise<void>;
  updateLayerFilter: (layerId: string, filter: Expression, filterName?: string) => void;
  removeLayerFilter: (layerId: string, filterName: string) => void;
  updateLayerLayout: (
    layerId: string,
    name: string,
    value: any,
    options?: FilterOptions | undefined,
  ) => void;
  updateLayerPaint: (
    layerId: string,
    name: string,
    value: any,
    options?: FilterOptions | undefined,
  ) => void;
  updateFeatureState: (sourceId: string, featureId: string | number, state: any) => void;
}

export interface LayerConfig {
  filter?: Expression;
  layout?: AnyLayout;
  paint?: AnyPaint;
}
