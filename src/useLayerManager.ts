import mapboxgl, { AnyLayer, AnyLayout, AnyPaint } from "mapbox-gl";

export interface LayerManager {
  renderOrderedLayers: (
    layerIds: string[],
    config?: Record<
      string,
      {
        filter: any[] | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
        layout: AnyLayout | undefined;
        paint: AnyPaint | undefined;
      }
    >
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
    renderOrderedLayers: (
      layerIds: string[],
      layerConfigs?: Record<
        string,
        {
          filter: any[] | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
          layout: AnyLayout | undefined;
          paint: AnyPaint | undefined;
        }
      >
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

          map.addLayer(newLayer as AnyLayer);
        }
      });

      // Move layers to the right order
      layerIds
        .slice()
        .reverse()
        .forEach((layerId, index) => {
          const referenceLayerId =
            index === 0 ? undefined : layerIds[index - 1];
          map.moveLayer(layerId, referenceLayerId);
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
  };
};
