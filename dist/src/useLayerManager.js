var extendLayerWithConfig = function (layer, config) {
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
export var useLayerManager = function (map, sources, layers) {
    var customLayerIds = new Set();
    var customSourcesIds = new Set();
    return {
        getActiveCustomLayerIds: function () { return Array.from(customLayerIds); },
        getActiveCustomSourceIds: function () { return Array.from(customSourcesIds); },
        renderOrderedLayers: function (layerIds, layerConfigs, beforeLayerId) {
            if (!map)
                return;
            var requiredSourceIds = [];
            // Get the sources that are required
            layerIds.forEach(function (layerId) {
                var layer = layers.find(function (layer) { return layer.id === layerId; });
                if (layer === null || layer === void 0 ? void 0 : layer.source) {
                    requiredSourceIds.push(layer.source);
                }
            });
            // Get the sources that are not in the map
            requiredSourceIds.forEach(function (sourceId) {
                if (!map.getSource(sourceId)) {
                    var source = sources.find(function (source) { return source.id === sourceId; });
                    if (source === null || source === void 0 ? void 0 : source.source) {
                        map.addSource(source.id, source.source);
                        customSourcesIds.add(source.id);
                    }
                }
            });
            // Remove unused layers
            var existingLayers = map.getStyle().layers;
            existingLayers.forEach(function (layer) {
                if (layerIds.indexOf(layer.id) === -1 &&
                    layers.find(function (l) { return layer.id === l.id; })) {
                    map.removeLayer(layer.id);
                    customLayerIds.delete(layer.id);
                }
            });
            // Remove unused sources
            var existingSources = map.getStyle().sources;
            Object.keys(existingSources).forEach(function (sourceId) {
                if (!requiredSourceIds.includes(sourceId) &&
                    sources.find(function (s) { return sourceId === s.id; })) {
                    map.removeSource(sourceId);
                    customSourcesIds.delete(sourceId);
                }
            });
            // Remove the rest of the layers
            layerIds.forEach(function (layerId) {
                var layer = map.getLayer(layerId);
                if (layer && layerIds.indexOf(layerId) !== -1) {
                    map.removeLayer(layerId);
                    customLayerIds.delete(layerId);
                }
            });
            // Add new layers
            layerIds.forEach(function (layerId) {
                var newLayer = layers.find(function (l) { return l.id == layerId; });
                if (newLayer) {
                    if (layerConfigs === null || layerConfigs === void 0 ? void 0 : layerConfigs[layerId]) {
                        extendLayerWithConfig(newLayer, layerConfigs[layerId]);
                    }
                    map.addLayer(newLayer, beforeLayerId);
                    customLayerIds.add(layerId);
                }
            });
            // Move layers to the right order
            layerIds = layerIds.slice().reverse();
            layerIds.forEach(function (layerId, index) {
                var referenceLayerId = index === 0 ? undefined : layerIds[index - 1];
                if (typeof referenceLayerId !== "undefined") {
                    map.moveLayer(layerId, referenceLayerId);
                }
            });
        },
        updateLayerFilter: function (layerId, filter) {
            if (!map)
                return;
            var layer = map.getLayer(layerId);
            if (layer) {
                map.setFilter(layerId, filter);
            }
        },
        updateLayerLayout: function (layerId, name, value, // eslint-disable-line @typescript-eslint/no-explicit-any
        options) {
            if (!map)
                return;
            var layer = map.getLayer(layerId);
            if (layer) {
                map.setLayoutProperty(layerId, name, value, options);
            }
        },
        updateLayerPaint: function (layerId, name, value, // eslint-disable-line @typescript-eslint/no-explicit-any
        options) {
            if (!map)
                return;
            var layer = map.getLayer(layerId);
            if (layer) {
                map.setPaintProperty(layerId, name, value, options);
            }
        },
        updateFeatureState: function (sourceId, featureId, state // eslint-disable-line @typescript-eslint/no-explicit-any
        ) {
            if (!map)
                return;
            map.setFeatureState({
                source: sourceId,
                id: featureId,
            }, state);
        },
        addSources: function (sources) {
            if (!map)
                return;
            sources.forEach(function (source) {
                map.addSource(source.id, source.source);
                customSourcesIds.add(source.id);
            });
        },
        removeSources: function (sourceIds) {
            if (!map)
                return;
            sourceIds.forEach(function (sourceId) {
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                    customSourcesIds.delete(sourceId);
                }
            });
        },
        addLayers: function (layers, beforeLayerId) {
            if (!map)
                return;
            layers.forEach(function (layer) {
                map.addLayer(layer, beforeLayerId);
                customLayerIds.add(layer.id);
            });
        },
        removeLayers: function (layerIds) {
            if (!map)
                return;
            layerIds.forEach(function (layerId) {
                if (map.getLayer(layerId)) {
                    map.removeLayer(layerId);
                    customLayerIds.delete(layerId);
                }
            });
        }
    };
};
