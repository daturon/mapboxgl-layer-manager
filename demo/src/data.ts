import type { Source } from '@daturon/mapboxgl-layer-manager';
import type { Layer } from 'mapbox-gl';

// ── Great-circle arc generator ────────────────────────────────────────────────

function generateArc(from: [number, number], to: [number, number], steps = 50): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [lon1, lat1] = from.map(toRad);
  const [lon2, lat2] = to.map(toRad);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2),
      ),
    );

  if (d === 0) return [from];

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lon = toDeg(Math.atan2(y, x));
    points.push([lon, lat]);
  }
  return points;
}

// ── World Capitals (embedded GeoJSON) ─────────────────────────────────────────

export const CAPITALS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-77.0369, 38.9072] },
      properties: { name: 'Washington D.C.', country: 'USA', population: 705749 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-0.1278, 51.5074] },
      properties: { name: 'London', country: 'UK', population: 8982000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [2.3522, 48.8566] },
      properties: { name: 'Paris', country: 'France', population: 2161000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [13.405, 52.52] },
      properties: { name: 'Berlin', country: 'Germany', population: 3645000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [37.6173, 55.7558] },
      properties: { name: 'Moscow', country: 'Russia', population: 12506000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [116.4074, 39.9042] },
      properties: { name: 'Beijing', country: 'China', population: 21893095 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [139.6917, 35.6895] },
      properties: { name: 'Tokyo', country: 'Japan', population: 13960000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [77.1025, 28.7041] },
      properties: { name: 'New Delhi', country: 'India', population: 32941000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [31.2357, 30.0444] },
      properties: { name: 'Cairo', country: 'Egypt', population: 10100000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-47.9292, -15.7801] },
      properties: { name: 'Brasília', country: 'Brazil', population: 3015000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-58.3816, -34.6037] },
      properties: { name: 'Buenos Aires', country: 'Argentina', population: 3054300 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [18.4241, -33.9249] },
      properties: { name: 'Cape Town', country: 'South Africa', population: 4618000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-99.1332, 19.4326] },
      properties: { name: 'Mexico City', country: 'Mexico', population: 9209944 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [149.13, -35.2809] },
      properties: { name: 'Canberra', country: 'Australia', population: 462213 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [32.8597, 39.9334] },
      properties: { name: 'Ankara', country: 'Turkey', population: 5663322 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [46.7219, 24.6877] },
      properties: { name: 'Riyadh', country: 'Saudi Arabia', population: 7676654 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [51.389, 35.6892] },
      properties: { name: 'Tehran', country: 'Iran', population: 9259009 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [73.0479, 33.6844] },
      properties: { name: 'Islamabad', country: 'Pakistan', population: 1014825 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [106.865, -6.2088] },
      properties: { name: 'Jakarta', country: 'Indonesia', population: 9607787 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [36.8219, -1.2921] },
      properties: { name: 'Nairobi', country: 'Kenya', population: 4397073 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-0.187, 5.6037] },
      properties: { name: 'Accra', country: 'Ghana', population: 2557000 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-74.0721, 4.711] },
      properties: { name: 'Bogotá', country: 'Colombia', population: 8380801 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-75.6972, 45.4215] },
      properties: { name: 'Ottawa', country: 'Canada', population: 994837 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [12.4964, 41.9028] },
      properties: { name: 'Rome', country: 'Italy', population: 2873494 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-3.7038, 40.4168] },
      properties: { name: 'Madrid', country: 'Spain', population: 3223334 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [126.978, 37.5665] },
      properties: { name: 'Seoul', country: 'South Korea', population: 9733509 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [100.5018, 13.7563] },
      properties: { name: 'Bangkok', country: 'Thailand', population: 10539415 },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [3.3792, 6.5244] },
      properties: { name: 'Lagos', country: 'Nigeria', population: 15388000 },
    },
  ],
};

// City coordinate lookup by name
const cityCoords: Record<string, [number, number]> = Object.fromEntries(
  CAPITALS_GEOJSON.features.map((f) => [
    f.properties.name,
    f.geometry.coordinates as [number, number],
  ]),
);

// ── Flight routes (great-circle arcs between capitals) ────────────────────────

const ROUTE_PAIRS: [string, string][] = [
  ['Washington D.C.', 'London'],
  ['Washington D.C.', 'Mexico City'],
  ['Washington D.C.', 'Ottawa'],
  ['Washington D.C.', 'Bogotá'],
  ['London', 'Paris'],
  ['London', 'Berlin'],
  ['London', 'Cape Town'],
  ['London', 'Lagos'],
  ['Paris', 'Rome'],
  ['Paris', 'Madrid'],
  ['Berlin', 'Moscow'],
  ['Moscow', 'Beijing'],
  ['Moscow', 'Tehran'],
  ['Beijing', 'Tokyo'],
  ['Beijing', 'Islamabad'],
  ['Beijing', 'Seoul'],
  ['Tokyo', 'Bangkok'],
  ['Tokyo', 'Canberra'],
  ['Bangkok', 'Jakarta'],
  ['New Delhi', 'Riyadh'],
  ['Cairo', 'Nairobi'],
  ['Cairo', 'Ankara'],
  ['Nairobi', 'Cape Town'],
  ['Nairobi', 'Accra'],
  ['Brasília', 'Buenos Aires'],
  ['Brasília', 'Bogotá'],
  ['Seoul', 'Bangkok'],
];

export const FLIGHT_ROUTES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: ROUTE_PAIRS.filter(([a, b]) => cityCoords[a] && cityCoords[b]).map(([a, b]) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: generateArc(cityCoords[a], cityCoords[b], 60),
    },
    properties: { from_city: a, to_city: b },
  })),
};

// ── Region label centroids ────────────────────────────────────────────────────

export const REGION_LABELS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-100, 55] },
      properties: { name: 'North America' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-55, -15] },
      properties: { name: 'South America' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [20, 15] },
      properties: { name: 'Africa' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [15, 52] },
      properties: { name: 'Europe' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [80, 30] },
      properties: { name: 'Asia' },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [135, -27] },
      properties: { name: 'Oceania' },
    },
  ],
};

// ── Data sources ──────────────────────────────────────────────────────────────

export const SOURCES: Source[] = [
  // Mapbox vector tilesets — available with any token
  {
    id: 'country-boundaries',
    source: { type: 'vector', url: 'mapbox://mapbox.country-boundaries-v1' },
  },
  {
    id: 'mapbox-terrain',
    source: { type: 'vector', url: 'mapbox://mapbox.mapbox-terrain-v2' },
  },
  // GeoJSON sources
  {
    id: 'demo-capitals',
    source: { type: 'geojson', data: CAPITALS_GEOJSON },
  },
  {
    id: 'earthquakes',
    source: {
      type: 'geojson',
      data: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
    },
  },
  {
    id: 'demo-flight-routes',
    source: { type: 'geojson', data: FLIGHT_ROUTES_GEOJSON },
  },
  {
    id: 'demo-region-labels',
    source: { type: 'geojson', data: REGION_LABELS_GEOJSON },
  },
];

// ── Layer definitions (11 layers, 5 types) ────────────────────────────────────

// Worldview filter — include features visible from all worldviews plus US
const WORLDVIEW_FILTER = [
  'any',
  ['==', ['get', 'worldview'], 'all'],
  ['==', ['get', 'worldview'], 'US'],
];

export const LAYERS: Layer[] = [
  // ─ 1. Landcover fills (fill)
  {
    id: 'demo-landcover',
    type: 'fill',
    source: 'mapbox-terrain',
    'source-layer': 'demo-landcover',
    paint: {
      'fill-color': [
        'match',
        ['get', 'class'],
        'wood',
        '#1a472a',
        'scrub',
        '#2d5a27',
        'grass',
        '#3a7d44',
        'crop',
        '#5a7a3a',
        'snow',
        '#d0e8f0',
        '#1e2a1e',
      ],
      'fill-opacity': 0.6,
    },
  } as unknown as Layer,

  // ─ 2. Country fills (fill)
  {
    id: 'demo-country-fill',
    type: 'fill',
    source: 'country-boundaries',
    'source-layer': 'country_boundaries',
    filter: WORLDVIEW_FILTER,
    paint: {
      'fill-color': [
        'match',
        ['get', 'region'],
        'Africa',
        '#7b2d8b',
        'Americas',
        '#1565c0',
        'Asia Pacific',
        '#2e7d32',
        'Europe',
        '#6a1b9a',
        'Middle East',
        '#e65100',
        'South Asia',
        '#00695c',
        '#37474f',
      ],
      'fill-opacity': 0.35,
    },
  } as unknown as Layer,

  // ─ 3. Country borders (line)
  {
    id: 'demo-country-borders',
    type: 'line',
    source: 'country-boundaries',
    'source-layer': 'country_boundaries',
    filter: WORLDVIEW_FILTER,
    paint: {
      'line-color': '#546e7a',
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 8, 1.5],
      'line-opacity': 0.7,
    },
  } as unknown as Layer,

  // ─ 4. Terrain contours (line)
  {
    id: 'demo-terrain-contours',
    type: 'line',
    source: 'mapbox-terrain',
    'source-layer': 'contour',
    paint: {
      'line-color': '#4a5568',
      'line-width': 0.5,
      'line-opacity': 0.4,
    },
  } as unknown as Layer,

  // ─ 5. Flight routes (line)
  {
    id: 'demo-flight-routes',
    type: 'line',
    source: 'demo-flight-routes',
    paint: {
      'line-color': '#fbbf24',
      'line-width': 1.2,
      'line-opacity': 0.7,
      'line-dasharray': [3, 2],
    },
  } as unknown as Layer,

  // ─ 6. Earthquake heatmap (heatmap)
  {
    id: 'demo-earthquakes-heat',
    type: 'heatmap',
    source: 'earthquakes',
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 0, 0, 9, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)',
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 9, 40],
      'heatmap-opacity': 0.8,
    },
  } as unknown as Layer,

  // ─ 7. Earthquake individual points (circle)
  {
    id: 'demo-earthquake-points',
    type: 'circle',
    source: 'earthquakes',
    minzoom: 3,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 4, 4, 7, 12, 9, 24],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'mag'],
        4,
        '#fef08a',
        6,
        '#f97316',
        8,
        '#dc2626',
      ],
      'circle-opacity': 0.75,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(0,0,0,0.4)',
    },
  } as unknown as Layer,

  // ─ 8. World capitals (circle)
  {
    id: 'demo-capitals',
    type: 'circle',
    source: 'demo-capitals',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4, 8, 10],
      'circle-color': '#4fc3f7',
      'circle-opacity': 0.9,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': 'rgba(255,255,255,0.6)',
    },
  } as unknown as Layer,

  // ─ 9. Capital city labels (symbol)
  {
    id: 'demo-capitals-labels',
    type: 'symbol',
    source: 'demo-capitals',
    minzoom: 3,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 11,
      'text-offset': [0, 1.5],
      'text-anchor': 'top',
      'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': '#e2e8f0',
      'text-halo-color': 'rgba(0,0,0,0.75)',
      'text-halo-width': 1,
    },
  } as unknown as Layer,

  // ─ 10. Region / continent labels (symbol)
  {
    id: 'demo-region-labels',
    type: 'symbol',
    source: 'demo-region-labels',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 1, 14, 4, 22],
      'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      'text-letter-spacing': 0.15,
      'text-transform': 'uppercase',
    },
    paint: {
      'text-color': 'rgba(226,232,240,0.25)',
      'text-halo-color': 'rgba(0,0,0,0)',
      'text-halo-width': 0,
    },
  } as unknown as Layer,
];

// Default layer order (bottom → top visual stack)
export const DEFAULT_LAYER_ORDER = [
  'demo-landcover',
  'demo-country-fill',
  'demo-country-borders',
  'demo-terrain-contours',
  'demo-flight-routes',
  'demo-earthquakes-heat',
  'demo-earthquake-points',
  'demo-capitals',
  'demo-capitals-labels',
  'demo-region-labels',
];

// ── Preset configurations ─────────────────────────────────────────────────────

export interface PresetView {
  center: [number, number];
  zoom: number;
  pitch?: number;
}

export interface Preset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  layerOrder: string[];
  view?: PresetView;
}

export const PRESETS: Preset[] = [
  {
    id: 'full',
    label: 'Full Overview',
    emoji: '🌍',
    description: 'All 10 layers — fill, line, circle, symbol, heatmap',
    layerOrder: DEFAULT_LAYER_ORDER,
    view: { center: [10, 20], zoom: 1.8, pitch: 0 },
  },
  {
    id: 'geopolitical',
    label: 'Geopolitical',
    emoji: '🗺️',
    description: 'Political map with flight routes above country fills',
    layerOrder: [
      'demo-country-fill',
      'demo-country-borders',
      'demo-flight-routes',
      'demo-capitals',
      'demo-capitals-labels',
      'demo-region-labels',
    ],
    view: { center: [20, 30], zoom: 2.5, pitch: 0 },
  },
  {
    id: 'seismic',
    label: 'Seismic Activity',
    emoji: '🌋',
    description: 'Terrain contours + earthquake heatmap and individual events',
    layerOrder: [
      'demo-landcover',
      'demo-country-fill',
      'demo-terrain-contours',
      'demo-earthquakes-heat',
      'demo-earthquake-points',
      'demo-capitals',
    ],
    view: { center: [155, 20], zoom: 2.0, pitch: 0 },
  },
  {
    id: 'terrain',
    label: 'Natural Terrain',
    emoji: '🏔️',
    description: 'Landcover fills + elevation contour lines — zooms to Alps for detail',
    layerOrder: [
      'demo-landcover',
      'demo-terrain-contours',
      'demo-country-borders',
      'demo-region-labels',
    ],
    view: { center: [11.4, 47.3], zoom: 7, pitch: 40 },
  },
  {
    id: 'air-traffic',
    label: 'Air Traffic',
    emoji: '✈️',
    description: 'Flight routes as the star — country fills below, capitals above',
    layerOrder: [
      'demo-country-fill',
      'demo-country-borders',
      'demo-flight-routes',
      'demo-capitals',
      'demo-capitals-labels',
    ],
    view: { center: [10, 30], zoom: 2.2, pitch: 0 },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    emoji: '✦',
    description: 'Clean capital city points and labels only',
    layerOrder: ['demo-capitals', 'demo-capitals-labels'],
    view: { center: [30, 25], zoom: 3.0, pitch: 0 },
  },
];

// ── Animated plane icon (inline SDF — 32×32 white arrow pointing up) ───────────

export function createPlaneIcon(): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 32;
  const data = new Uint8ClampedArray(size * size * 4);

  // Draw a simple upward-pointing plane silhouette
  const body: [number, number][] = [
    [16, 3],
    [18, 7],
    [18, 18],
    [16, 18],
    [14, 18],
    [14, 7],
  ];
  const wingL: [number, number][] = [
    [14, 10],
    [5, 16],
    [5, 18],
    [14, 15],
  ];
  const wingR: [number, number][] = [
    [18, 10],
    [27, 16],
    [27, 18],
    [18, 15],
  ];
  const tailL: [number, number][] = [
    [14, 18],
    [10, 22],
    [10, 24],
    [14, 21],
  ];
  const tailR: [number, number][] = [
    [18, 18],
    [22, 22],
    [22, 24],
    [18, 21],
  ];

  function fillPoly(poly: [number, number][]): void {
    const minY = Math.min(...poly.map((p) => p[1]));
    const maxY = Math.max(...poly.map((p) => p[1]));
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      const n = poly.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [x0, y0] = poly[j];
        const [x1, y1] = poly[i];
        if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
          xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = xs[k]; x <= xs[k + 1]; x++) {
          if (x >= 0 && x < size && y >= 0 && y < size) {
            const idx = (y * size + x) * 4;
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  fillPoly(body);
  fillPoly(wingL);
  fillPoly(wingR);
  fillPoly(tailL);
  fillPoly(tailR);

  return { width: size, height: size, data };
}

// ── Moving planes source/layer (animation-only, not in any preset) ────────────

export const PLANES_LAYER: Layer = {
  id: 'demo-planes',
  type: 'symbol',
  source: 'demo-planes',
  layout: {
    'icon-image': 'demo-plane',
    'icon-rotate': ['get', 'bearing'] as unknown as number,
    'icon-rotation-alignment': 'map',
    'icon-size': 0.7,
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
  },
  paint: {
    'icon-color': '#fbbf24',
    'icon-opacity': 0.95,
  },
} as unknown as Layer;

// ── Source groups for Add/Remove UI ──────────────────────────────────────────

export interface SourceGroup {
  sourceIds: string[];
  label: string;
  emoji: string;
  layerIds: string[];
}

export const SOURCE_GROUPS: SourceGroup[] = [
  {
    sourceIds: ['country-boundaries'],
    label: 'Country Boundaries',
    emoji: '🗾',
    layerIds: ['demo-country-fill', 'demo-country-borders'],
  },
  {
    sourceIds: ['mapbox-terrain'],
    label: 'Terrain',
    emoji: '🏔️',
    layerIds: ['demo-landcover', 'demo-terrain-contours'],
  },
  {
    sourceIds: ['demo-flight-routes'],
    label: 'Flight Routes',
    emoji: '✈️',
    layerIds: ['demo-flight-routes'],
  },
  {
    sourceIds: ['earthquakes'],
    label: 'Earthquakes',
    emoji: '🌋',
    layerIds: ['demo-earthquakes-heat', 'demo-earthquake-points'],
  },
  {
    sourceIds: ['demo-capitals'],
    label: 'World Capitals',
    emoji: '🔵',
    layerIds: ['demo-capitals', 'demo-capitals-labels'],
  },
  {
    sourceIds: ['demo-region-labels'],
    label: 'Region Labels',
    emoji: '🏷️',
    layerIds: ['demo-region-labels'],
  },
];

// ── Legacy layer groups (filter chips for Layers tab) ────────────────────────

export interface LayerGroup {
  id: string;
  label: string;
  emoji: string;
  layerIds: string[];
  defaultOpacity: number;
  opacityProperty: string;
  filters?: { label: string; expression: unknown[] | null }[];
}

export const LAYER_GROUPS: LayerGroup[] = [
  {
    id: 'capitals-group',
    label: 'World Capitals',
    emoji: '🔵',
    layerIds: ['demo-capitals', 'demo-capitals-labels'],
    defaultOpacity: 0.9,
    opacityProperty: 'circle-opacity',
    filters: [
      { label: 'All', expression: null },
      { label: '>500K', expression: ['>', ['get', 'population'], 500000] },
      { label: '>1M', expression: ['>', ['get', 'population'], 1000000] },
      { label: '>5M', expression: ['>', ['get', 'population'], 5000000] },
    ],
  },
  {
    id: 'earthquakes-group',
    label: 'Earthquakes (4.5+)',
    emoji: '🌋',
    layerIds: ['demo-earthquakes-heat', 'demo-earthquake-points'],
    defaultOpacity: 0.8,
    opacityProperty: 'heatmap-opacity',
    filters: [
      { label: 'All', expression: null },
      { label: 'M≥5', expression: ['>=', ['get', 'mag'], 5] },
      { label: 'M≥6', expression: ['>=', ['get', 'mag'], 6] },
      { label: 'M≥7', expression: ['>=', ['get', 'mag'], 7] },
    ],
  },
  {
    id: 'country-group',
    label: 'Country Boundaries',
    emoji: '🗾',
    layerIds: ['demo-country-fill', 'demo-country-borders'],
    defaultOpacity: 0.35,
    opacityProperty: 'fill-opacity',
  },
  {
    id: 'terrain-group',
    label: 'Terrain',
    emoji: '🏔️',
    layerIds: ['demo-landcover', 'demo-terrain-contours'],
    defaultOpacity: 0.6,
    opacityProperty: 'fill-opacity',
  },
  {
    id: 'routes-group',
    label: 'Flight Routes',
    emoji: '✈️',
    layerIds: ['demo-flight-routes'],
    defaultOpacity: 0.7,
    opacityProperty: 'line-opacity',
  },
];

// Layer type metadata for UI badges
export const LAYER_TYPE: Record<string, string> = {
  'demo-planes': 'symbol',
  'demo-landcover': 'fill',
  'demo-country-fill': 'fill',
  'demo-country-borders': 'line',
  'demo-terrain-contours': 'line',
  'demo-flight-routes': 'line',
  'demo-earthquakes-heat': 'heatmap',
  'demo-earthquake-points': 'circle',
  'demo-capitals': 'circle',
  'demo-capitals-labels': 'symbol',
  'demo-region-labels': 'symbol',
};
