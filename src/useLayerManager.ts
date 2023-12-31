import mapboxgl, { AnyLayer, AnyLayout, AnyPaint } from "mapbox-gl";

export interface LayerManager {
  addSources: (sources: { id: string; source: mapboxgl.AnySourceData }[]) => void;
  removeSources: (sourceIds: string[]) => void;
  addLayers: (layers: mapboxgl.Layer[]) => void;
  removeLayers: (layerIds: string[]) => void;
  getCustomLayerIds: () => string[];
  getCustomSourceIds: () => string[];
  renderOrderedLayers: (
    layerIds: string[],
    config?: Record<
      string,
      {
        filter: any[] | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
        layout: AnyLayout | undefined;
        paint: AnyPaint | undefined;
      }
    >,
    beforeLayerId?: string
  ) => void;
  updateLayerFilter: (layerId: string, filter: mapboxgl.Expression) => void;
  updateLayerLayout: (
    layerId: string,
    name: string,
    value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: mapboxgl.FilterOptions | undefined
  ) => void;
  updateLayerPaint: (
    layerId: string,
    name: string,
    value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    options?: mapboxgl.FilterOptions | undefined
  ) => void;
  updateFeatureState: (
    sourceId: string,
    featureId: string | number,
    state: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => void;
}

const extendLayerWithConfig = (
  layer: mapboxgl.Layer,
  config: {
    filter: any[] | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    layout: AnyLayout | undefined;
    paint: AnyPaint | undefined;
  }
): mapboxgl.Layer => {
  if (config.filter) {
    layer.filter = config.filter;
  }
  if (config.layout) {
    layer.layout = config.layout;
  }
  if (config.paint) {
    layer.paint = config.paint;
  }

  return layer;
};

export const useLayerManager = (
  map: mapboxgl.Map | null,
  sources: { id: string; source: mapboxgl.AnySourceData }[],
  layers: mapboxgl.Layer[]
): LayerManager => {
  return {
    getCustomLayerIds: () => layers.map((layer) => layer.id),
    getCustomSourceIds: () => sources.map((source) => source.id),
    renderOrderedLayers: (
      layerIds: string[],
      layerConfigs?: Record<
        string,
        {
          filter: any[] | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
          layout: AnyLayout | undefined;
          paint: AnyPaint | undefined;
        }
      >,
      beforeLayerId?: string
    ) => {
      if (!map) return;

      const requiredSourceIds: string[] = [];

      // Get the sources that are required
      layerIds.forEach((layerId) => {
        const layer = layers.find((layer) => layer.id === layerId);

        if (layer?.source) {
          requiredSourceIds.push(layer.source as string);
        }
      });

      // Get the sources that are not in the map
      requiredSourceIds.forEach((sourceId) => {
        if (!map.getSource(sourceId)) {
          const source = sources.find((source) => source.id === sourceId);

          if (source?.source) {
            map.addSource(source.id, source.source);
          }
        }
      });

      // Remove unused layers
      const existingLayers = map.getStyle().layers;
      existingLayers.forEach((layer) => {
        if (
          layerIds.indexOf(layer.id) === -1 &&
          layers.find((l) => layer.id === l.id)
        ) {
          map.removeLayer(layer.id);
        }
      });

      // Remove unused sources
      const existingSources = map.getStyle().sources;
      Object.keys(existingSources).forEach((sourceId) => {
        if (
          !requiredSourceIds.includes(sourceId) &&
          sources.find((s) => sourceId === s.id)
        ) {
          map.removeSource(sourceId);
        }
      });

      // Remove the rest of the layers
      layerIds.forEach((layerId) => {
        const layer = map.getLayer(layerId);

        if (layer && layerIds.indexOf(layerId) !== -1) {
          map.removeLayer(layerId);
        }
      });

      // Add new layers
      layerIds.forEach((layerId) => {
        const newLayer = layers.find((l) => l.id == layerId);

        if (newLayer) {
          if (layerConfigs?.[layerId]) {
            extendLayerWithConfig(newLayer, layerConfigs[layerId]);
          }

          map.addLayer(newLayer as AnyLayer, beforeLayerId);
        }
      });

      // Move layers to the right order
      layerIds = layerIds.slice().reverse();

      layerIds.forEach((layerId, index) => {
        const referenceLayerId = index === 0 ? undefined : layerIds[index - 1];

        if (typeof referenceLayerId !== "undefined") {
          map.moveLayer(layerId, referenceLayerId);
        }
      });
    },
    updateLayerFilter: (layerId: string, filter: mapboxgl.Expression) => {
      if (!map) return;

      const layer = map.getLayer(layerId);

      if (layer) {
        map.setFilter(layerId, filter);
      }
    },
    updateLayerLayout: (
      layerId: string,
      name: string,
      value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      options?: mapboxgl.FilterOptions | undefined
    ) => {
      if (!map) return;

      const layer = map.getLayer(layerId);

      if (layer) {
        map.setLayoutProperty(layerId, name, value, options);
      }
    },
    updateLayerPaint: (
      layerId: string,
      name: string,
      value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
      options?: mapboxgl.FilterOptions | undefined
    ) => {
      if (!map) return;

      const layer = map.getLayer(layerId);

      if (layer) {
        map.setPaintProperty(layerId, name, value, options);
      }
    },
    updateFeatureState: (
      sourceId: string,
      featureId: string | number,
      state: any // eslint-disable-line @typescript-eslint/no-explicit-any
    ) => {
      if (!map) return;

      map.setFeatureState(
        {
          source: sourceId,
          id: featureId,
        },
        state
      );
    },
    addSources: (sources: { id: string; source: mapboxgl.AnySourceData }[]) => {
      if (!map) return;

      sources.forEach((source) => {
        map.addSource(source.id, source.source);
      });
    },
    removeSources: (sourceIds: string[]) => {
      if (!map) return;

      sourceIds.forEach((sourceId) => {
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      });
    },
    addLayers: (layers: mapboxgl.Layer[]) => {
      if (!map) return;

      layers.forEach((layer) => {
        map.addLayer(layer as AnyLayer);
      });
    },
    removeLayers: (layerIds: string[]) => {
      if (!map) return;

      layerIds.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      });
    }
  };
};
