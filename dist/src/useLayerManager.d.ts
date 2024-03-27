import mapboxgl, { AnyLayout, AnyPaint, Expression } from "mapbox-gl";
export interface LayerManager {
    addSources: (sources: {
        id: string;
        source: mapboxgl.AnySourceData;
    }[]) => void;
    removeSources: (sourceIds: string[]) => void;
    addLayers: (layers: mapboxgl.Layer[]) => void;
    removeLayers: (layerIds: string[]) => void;
    getActiveCustomLayerIds: () => string[];
    getActiveCustomSourceIds: () => string[];
    getLayersFilters: () => Map<string, Record<string, mapboxgl.Expression>>;
    getMapInstance: () => mapboxgl.Map | null;
    renderOrderedLayers: (layerIds: string[], config?: Record<string, {
        filter: Expression | undefined;
        layout: AnyLayout | undefined;
        paint: AnyPaint | undefined;
    }>, beforeLayerId?: string) => void;
    updateLayerFilter: (layerId: string, filter: mapboxgl.Expression, filterName?: string) => void;
    updateLayerLayout: (layerId: string, name: string, value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: mapboxgl.FilterOptions | undefined) => void;
    updateLayerPaint: (layerId: string, name: string, value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: mapboxgl.FilterOptions | undefined) => void;
    updateFeatureState: (sourceId: string, featureId: string | number, state: any) => void;
}
export declare const useLayerManager: (map: mapboxgl.Map | null, sources: {
    id: string;
    source: mapboxgl.AnySourceData;
}[], layers: mapboxgl.Layer[]) => LayerManager;
