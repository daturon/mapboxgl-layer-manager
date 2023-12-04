import mapboxgl, { AnyLayout, AnyPaint } from "mapbox-gl";
export interface LayerManager {
    getCustomLayerIds: () => string[];
    getCustomSourceIds: () => string[];
    renderOrderedLayers: (layerIds: string[], config?: Record<string, {
        filter: any[] | undefined;
        layout: AnyLayout | undefined;
        paint: AnyPaint | undefined;
    }>, beforeLayerId?: string) => void;
    updateLayerFilter: (layerId: string, filter: mapboxgl.Expression) => void;
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
