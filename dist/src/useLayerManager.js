var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var extendLayerWithConfig = function (layer, config) {
    if (config.filter) {
        layer.filter = ["all", config.filter];
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
    var layerFilters = new Map();
    return {
        getActiveCustomLayerIds: function () { return Array.from(customLayerIds); },
        getActiveCustomSourceIds: function () { return Array.from(customSourcesIds); },
        getLayersFilters: function () { return layerFilters; },
        getMapInstance: function () { return map; },
        renderOrderedLayers: function (layerIds, layerConfigs, beforeLayerId) { return __awaiter(void 0, void 0, void 0, function () {
            var requiredSourceIds_1, existingLayers, existingSources;
            return __generator(this, function (_a) {
                if (!map)
                    return [2 /*return*/];
                try {
                    requiredSourceIds_1 = [];
                    // Get the sources that are required
                    layerIds.forEach(function (layerId) {
                        var layer = layers.find(function (layer) { return layer.id === layerId; });
                        if (layer === null || layer === void 0 ? void 0 : layer.source) {
                            requiredSourceIds_1.push(layer.source);
                        }
                    });
                    // Get the sources that are not in the map
                    requiredSourceIds_1.forEach(function (sourceId) {
                        if (!map.getSource(sourceId)) {
                            var source = sources.find(function (source) { return source.id === sourceId; });
                            if (source === null || source === void 0 ? void 0 : source.source) {
                                map.addSource(source.id, source.source);
                                customSourcesIds.add(source.id);
                            }
                        }
                    });
                    existingLayers = map.getStyle().layers;
                    existingLayers.forEach(function (layer) {
                        if (layerIds.indexOf(layer.id) === -1 &&
                            layers.find(function (l) { return layer.id === l.id; })) {
                            map.removeLayer(layer.id);
                            customLayerIds.delete(layer.id);
                        }
                    });
                    existingSources = map.getStyle().sources;
                    Object.keys(existingSources).forEach(function (sourceId) {
                        if (!requiredSourceIds_1.includes(sourceId) &&
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
                                if (!layerFilters.has(layerId)) {
                                    layerFilters.set(layerId, {});
                                }
                                if (layerConfigs[layerId].filter) {
                                    layerFilters.get(layerId).default =
                                        layerConfigs[layerId].filter;
                                }
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
                    return [2 /*return*/, new Promise(function (resolve) {
                            map.once("render", resolve);
                        })];
                }
                catch (error) {
                    return [2 /*return*/, Promise.reject(error)];
                }
                return [2 /*return*/];
            });
        }); },
        updateLayerFilter: function (layerId, filter, filterName) {
            if (filterName === void 0) { filterName = "default"; }
            if (!map)
                return;
            var layer = map.getLayer(layerId);
            if (layer) {
                if (!layerFilters.has(layerId)) {
                    layerFilters.set(layerId, {});
                }
                layerFilters.get(layerId)[filterName] = filter;
                map.setFilter(layerId, __spreadArray([
                    "all"
                ], Object.values(layerFilters.get(layerId)), true));
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
        addSources: function (newSources) {
            if (!map)
                return;
            newSources.forEach(function (source) {
                map.addSource(source.id, source.source);
                customSourcesIds.add(source.id);
                sources.push(source);
            });
        },
        removeSources: function (sourceIds) {
            if (!map)
                return;
            sourceIds.forEach(function (sourceId) {
                if (map.getSource(sourceId)) {
                    map.removeSource(sourceId);
                    customSourcesIds.delete(sourceId);
                    sources = sources.filter(function (source) { return source.id !== sourceId; });
                }
            });
        },
        addLayers: function (newLayers, beforeLayerId) {
            if (!map)
                return;
            newLayers.forEach(function (layer) {
                map.addLayer(layer, beforeLayerId);
                customLayerIds.add(layer.id);
                layers.push(layer);
            });
        },
        removeLayers: function (layerIds) {
            if (!map)
                return;
            layerIds.forEach(function (layerId) {
                if (map.getLayer(layerId)) {
                    map.removeLayer(layerId);
                    customLayerIds.delete(layerId);
                    layers = layers.filter(function (layer) { return layer.id !== layerId; });
                }
            });
        },
    };
};
