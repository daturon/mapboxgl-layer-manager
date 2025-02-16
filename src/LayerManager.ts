import {
  AnyLayer,
  AnyLayout,
  AnyPaint,
  AnySourceData,
  Expression,
  FilterOptions,
  Layer,
  Map as MapboxGLMap,
} from 'mapbox-gl';
import { ILayerManager } from './interfaces';
import { extendLayerWithConfig } from './utils';

type Source = { id: string; source: AnySourceData };
type LayerConfig = {
  filter?: Expression;
  layout?: AnyLayout;
  paint?: AnyPaint;
};

export default class LayerManager implements ILayerManager {
  private readonly map: MapboxGLMap | null;
  private sources: Source[];
  private layers: Layer[];
  private readonly customLayerIds: Set<string>;
  private readonly customSourcesIds: Set<string>;
  private readonly layerFilters: Map<string, Record<string, Expression>>;

  constructor(map: MapboxGLMap | null, sources: Source[], layers: Layer[]) {
    this.map = map;
    this.sources = sources;
    this.layers = layers;
    this.customLayerIds = new Set<string>();
    this.customSourcesIds = new Set<string>();
    this.layerFilters = new Map<string, Record<string, Expression>>();
  }

  /**
   * Retrieves the IDs of all active custom layers.
   *
   * @returns {string[]} An array containing the IDs of the active custom layers.
   */
  getActiveCustomLayerIds(): string[] {
    return Array.from(this.customLayerIds);
  }

  /**
   * Retrieves the IDs of all active custom sources.
   *
   * @returns {string[]} An array of active custom source IDs.
   */
  getActiveCustomSourceIds(): string[] {
    return Array.from(this.customSourcesIds);
  }

  /**
   * Retrieves the filters applied to the layers.
   *
   * @returns {Map<string, Record<string, Expression>>} A map where the key is the layer ID and the value is a record of filter expressions.
   */
  getLayersFilters(): Map<string, Record<string, Expression>> {
    return this.layerFilters;
  }

  /**
   * Retrieves the current instance of the Mapbox GL map.
   *
   * @returns {MapboxGLMap | null} The current Mapbox GL map instance if available, otherwise null.
   */
  getMapInstance(): MapboxGLMap | null {
    return this.map;
  }

  /**
   * Renders the specified layers in the given order, adding or removing sources and layers as necessary.
   *
   * @param layerIds - An array of layer IDs to be rendered in the specified order.
   * @param layerConfigs - An optional record of layer configurations keyed by layer ID.
   * @param beforeLayerId - An optional ID of the layer before which the new layers should be added.
   * @returns A promise that resolves when the layers have been rendered.
   *
   * @throws Will reject the promise with an error if the map is not initialized or if any other error occurs during the process.
   */
  async renderOrderedLayers(
    layerIds: string[],
    layerConfigs?: Record<string, LayerConfig>,
    beforeLayerId?: string,
  ): Promise<void> {
    if (!this.map) {
      return Promise.reject(new Error('Map is not initialized'));
    }

    try {
      const requiredSourceIds: string[] = [];

      // Get the sources that are required
      layerIds.forEach((layerId) => {
        const layer = this.layers.find((layer) => layer.id === layerId);

        if (layer?.source) {
          requiredSourceIds.push(layer.source as string);
        }
      });

      // Get the sources that are not in the map
      requiredSourceIds.forEach((sourceId) => {
        if (!this.map!.getSource(sourceId)) {
          const source = this.sources.find((source) => source.id === sourceId);

          if (source?.source) {
            this.map!.addSource(source.id, source.source);
            this.customSourcesIds.add(source.id);
          }
        }
      });

      // Remove unused layers
      const existingLayers = this.map.getStyle().layers;
      existingLayers.forEach((layer) => {
        if (layerIds.indexOf(layer.id) === -1 && this.layers.find((l) => layer.id === l.id)) {
          this.map!.removeLayer(layer.id);
          this.customLayerIds.delete(layer.id);
        }
      });

      // Remove unused sources
      const existingSources = this.map.getStyle().sources;
      Object.keys(existingSources).forEach((sourceId) => {
        if (!requiredSourceIds.includes(sourceId) && this.sources.find((s) => sourceId === s.id)) {
          this.map!.removeSource(sourceId);
          this.customSourcesIds.delete(sourceId);
        }
      });

      // Remove the rest of the layers
      layerIds.forEach((layerId) => {
        const layer = this.map!.getLayer(layerId);

        if (layer && layerIds.indexOf(layerId) !== -1) {
          this.map!.removeLayer(layerId);
          this.customLayerIds.delete(layerId);
        }
      });

      // Add new layers
      layerIds.forEach((layerId) => {
        const newLayer = this.layers.find((l) => l.id == layerId);

        if (newLayer) {
          if (layerConfigs?.[layerId]) {
            if (!this.layerFilters.has(layerId)) {
              this.layerFilters.set(layerId, {});
            }

            if (layerConfigs[layerId].filter) {
              this.layerFilters.get(layerId)!.default = layerConfigs[layerId].filter;
            }

            extendLayerWithConfig(newLayer, layerConfigs[layerId]);
          }

          this.map!.addLayer(newLayer as AnyLayer, beforeLayerId);
          this.customLayerIds.add(layerId);
        }
      });

      // Move layers to the right order
      layerIds = layerIds.slice().reverse();

      layerIds.forEach((layerId, index) => {
        const referenceLayerId = index === 0 ? undefined : layerIds[index - 1];

        if (typeof referenceLayerId !== 'undefined') {
          this.map!.moveLayer(layerId, referenceLayerId);
        }
      });

      return new Promise((resolve) => {
        this.map!.once('render', resolve);
      });
    } catch (error) {
      return Promise.reject(new Error(String(error)));
    }
  }

  /**
   * Updates the filter for a specified layer on the map.
   *
   * @param layerId - The ID of the layer to update.
   * @param filter - The filter expression to apply to the layer.
   * @param filterName - The name of the filter to update. Defaults to 'default'.
   *
   * @remarks
   * This method updates the filter for a specified layer on the map. If the layer does not have any filters,
   * it initializes an empty filter object for the layer. The filter is then added or updated in the layer's
   * filter object and applied to the layer using the `setFilter` method.
   *
   * @example
   * ```typescript
   * const layerId = 'my-layer';
   * const filter = ['==', 'property', 'value'];
   * layerManager.updateLayerFilter(layerId, filter);
   * ```
   */
  updateLayerFilter(layerId: string, filter: Expression, filterName: string = 'default'): void {
    if (!this.map) return;

    const layer = this.map.getLayer(layerId);

    if (layer) {
      if (!this.layerFilters.has(layerId)) {
        this.layerFilters.set(layerId, {});
      }

      this.layerFilters.get(layerId)![filterName] = filter;

      this.map.setFilter(layerId, ['all', ...Object.values(this.layerFilters.get(layerId)!)]);
    }
  }

  /**
   * Removes a specific filter from a layer.
   *
   * @param layerId - The ID of the layer from which the filter should be removed.
   * @param filterName - The name of the filter to remove.
   * @returns void
   *
   * @remarks
   * This method checks if the map instance and the specified layer exist. If they do,
   * it deletes the specified filter from the layer's filters and updates the layer's filters
   * on the map.
   */
  removeLayerFilter(layerId: string, filterName: string): void {
    if (!this.map) return;

    const layer = this.map.getLayer(layerId);

    if (layer && this.layerFilters.has(layerId)) {
      delete this.layerFilters.get(layerId)![filterName];

      this.map.setFilter(layerId, ['all', ...Object.values(this.layerFilters.get(layerId)!)]);
    }
  }

  /**
   * Updates the layout properties of a specified layer on the map.
   *
   * @param layerId - The ID of the layer to update.
   * @param name - The name of the layout property to update.
   * @param value - The new value to set for the layout property.
   * @param options - Optional parameters to use when updating the layout property.
   *
   * @remarks
   * This method updates the layout properties of a specified layer on the map. If the layer does not have any layout properties,
   * it initializes an empty layout object for the layer. The layout property is then added or updated in the layer's layout object
   * and applied to the layer using the `setLayoutProperty` method.
   *
   * @example
   * ```typescript
   * const layerId = 'my-layer';
   * const name = 'visibility';
   * const value = 'none';
   * layerManager.updateLayerLayout(layerId, name, value);
   * ```
   */
  updateLayerLayout(
    layerId: string,
    name: string,
    value: any,
    options?: FilterOptions | undefined,
  ): void {
    if (!this.map) return;

    const layer = this.map.getLayer(layerId);

    if (layer) {
      this.map.setLayoutProperty(layerId, name, value, options);
    }
  }

  /**
   * Updates the paint properties of a specified layer on the map.
   *
   * @param layerId - The ID of the layer to update.
   * @param name - The name of the paint property to update.
   * @param value - The new value to set for the paint property.
   * @param options - Optional parameters to use when updating the paint property.
   *
   * @remarks
   * This method updates the paint properties of a specified layer on the map. If the layer does not have any paint properties,
   * it initializes an empty paint object for the layer. The paint property is then added or updated in the layer's paint object
   * and applied to the layer using the `setPaintProperty` method.
   *
   * @example
   * ```typescript
   * const layerId = 'my-layer';
   * const name = 'fill-color';
   * const value = 'red';
   * layerManager.updateLayerPaint(layerId, name, value);
   * ```
   */
  updateLayerPaint(
    layerId: string,
    name: string,
    value: any,
    options?: FilterOptions | undefined,
  ): void {
    if (!this.map) return;

    const layer = this.map.getLayer(layerId);

    if (layer) {
      this.map.setPaintProperty(layerId, name, value, options);
    }
  }

  /**
   * Updates the state of a feature in a specified source on the map.
   *
   * @param sourceId - The ID of the source containing the feature to update.
   * @param featureId - The ID of the feature to update.
   * @param state - The new state to set for the feature.
   * @returns void
   *
   * @remarks
   * This method updates the state of a feature in a specified source on the map. If the source or feature does not exist,
   * the method will not execute. The method then updates the feature state using the `setFeatureState` method.
   *
   * @example
   * ```typescript
   * const sourceId = 'my-source';
   * const featureId = 'my-feature';
   * const state = { hover: true };
   * layerManager.updateFeatureState(sourceId, featureId, state);
   * ```
   */
  updateFeatureState(sourceId: string, featureId: string | number, state: any): void {
    if (!this.map) return;

    this.map.setFeatureState(
      {
        source: sourceId,
        id: featureId,
      },
      state,
    );
  }

  /**
   * Adds new sources to the map and keeps track of custom source IDs.
   *
   * @param {Source[]} newSources - An array of source objects to be added to the map.
   * @returns {void}
   *
   * @remarks
   * - This method will not execute if the map instance is not available.
   * - Each source object should have an `id` and a `source` property.
   * - The `id` is used to uniquely identify the source in the map.
   * - The `source` is the actual source object to be added to the map.
   * - The method also updates the internal list of custom source IDs and the sources array.
   */
  addSources(newSources: Source[]): void {
    if (!this.map) return;

    newSources.forEach((source) => {
      this.map!.addSource(source.id, source.source);
      this.customSourcesIds.add(source.id);
      this.sources.push(source);
    });
  }

  /**
   * Removes sources from the map and updates the internal list of custom source IDs.
   *
   * @param {string[]} sourceIds - An array of source IDs to be removed from the map.
   * @returns {void}
   *
   * @remarks
   * - This method will not execute if the map instance is not available.
   * - The method removes the specified sources from the map and updates the internal list of custom source IDs.  The sources array is also updated.
   * - The method will not remove sources that are not in the map.
   * - The method also removes the source from the internal list of sources.
   */
  removeSources(sourceIds: string[]): void {
    if (!this.map) return;

    sourceIds.forEach((sourceId) => {
      if (!this.map!.getSource(sourceId)) return;

      this.map!.removeSource(sourceId);
      this.customSourcesIds.delete(sourceId);
      this.sources = this.sources.filter((source) => source.id !== sourceId);
    });
  }

  /**
   * Adds new layers to the map.
   * @param newLayers - The layers to add.
   * @param beforeLayerId - The ID of the layer before which the new layers will be added.
   */
  addLayers(newLayers: Layer[], beforeLayerId?: string): void {
    if (!this.map) return;

    newLayers.forEach((layer) => {
      this.map!.addLayer(layer as AnyLayer, beforeLayerId);
      this.customLayerIds.add(layer.id);
      this.layers.push(layer);
    });
  }

  /**
   * Removes layers from the map.
   * @param layerIds - The IDs of the layers to remove.
   */
  removeLayers(layerIds: string[]): void {
    if (!this.map) return;

    layerIds.forEach((layerId) => {
      if (!this.map!.getLayer(layerId)) return;

      this.map!.removeLayer(layerId);
      this.customLayerIds.delete(layerId);
      this.layers = this.layers.filter((layer) => layer.id !== layerId);
    });
  }
}
