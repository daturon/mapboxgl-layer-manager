import { LayerConfig } from 'interfaces';
import { Layer } from 'mapbox-gl';

export const extendLayerWithConfig = (layer: Layer, config: LayerConfig): Layer => {
  if (config.filter) {
    layer.filter = ['all', config.filter];
  }
  if (config.layout) {
    layer.layout = config.layout;
  }
  if (config.paint) {
    layer.paint = config.paint;
  }

  return layer;
};
