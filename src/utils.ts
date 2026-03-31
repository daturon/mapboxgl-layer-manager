import { LayerConfig } from './interfaces';
import { Layer } from 'mapbox-gl';

export const extendLayerWithConfig = (layer: Layer, config: LayerConfig): Layer => {
  const cloned: Layer = { ...layer };
  if (config.filter) {
    cloned.filter = ['all', config.filter];
  }
  if (config.layout) {
    cloned.layout = config.layout;
  }
  if (config.paint) {
    cloned.paint = config.paint;
  }
  return cloned;
};
