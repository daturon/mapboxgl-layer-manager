import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { LayerManager } from '@daturon/mapboxgl-layer-manager';
import { SOURCES, LAYERS, DEFAULT_LAYER_ORDER, createPlaneIcon } from './data';
import { Panel } from './panel';
import './style.css';

// ── Token flow ────────────────────────────────────────────────────────────────

const envToken: string = (import.meta as unknown as Record<string, Record<string, string>>).env
  ?.VITE_MAPBOX_TOKEN;
const storedToken = sessionStorage.getItem('mapbox_token');
const token = envToken || storedToken;

if (token) {
  document.getElementById('token-screen')?.remove();
  initApp(token);
} else {
  showTokenForm();
}

function showTokenForm(): void {
  document.getElementById('token-screen')!.removeAttribute('hidden');
  const form = document.getElementById('token-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('token-input') as HTMLInputElement;
    const t = input.value.trim();
    if (t.startsWith('pk.')) {
      sessionStorage.setItem('mapbox_token', t);
      document.getElementById('token-screen')!.remove();
      initApp(t);
    } else {
      input.classList.add('input-error');
      input.placeholder = 'Token must start with pk. — please check and retry';
    }
  });
}

// ── App init ──────────────────────────────────────────────────────────────────

let panel: Panel | null = null;

function initApp(accessToken: string): void {
  document.getElementById('app')!.removeAttribute('hidden');

  mapboxgl.accessToken = accessToken;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [10, 20],
    zoom: 1.8,
    projection: 'globe',
  });

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  const manager = new LayerManager(map, SOURCES, LAYERS, { analyzer: true });

  map.on('load', async () => {
    // Add atmosphere for the globe projection
    map.setFog({
      color: 'rgb(15, 17, 23)',
      'high-color': 'rgb(30, 40, 80)',
      'horizon-blend': 0.02,
      'space-color': 'rgb(5, 5, 15)',
      'star-intensity': 0.6,
    });

    const firstSymbolId = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;

    // Register inline plane icon (SDF allows icon-color tinting)
    if (!map.hasImage('demo-plane')) {
      map.addImage('demo-plane', createPlaneIcon(), { sdf: true });
    }

    try {
      await manager.renderOrderedLayers(DEFAULT_LAYER_ORDER, undefined, firstSymbolId);
    } catch (err) {
      console.error('Failed to render layers:', err);
    }

    // Pre-add planes source + layer (hidden, below firstSymbolId) so toggle is a simple visibility switch
    try {
      map.addSource('demo-planes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      const planesLayerSpec = {
        id: 'demo-planes',
        type: 'symbol',
        source: 'demo-planes',
        layout: {
          'icon-image': 'demo-plane',
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-size': 0.7,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          visibility: 'none',
        },
        paint: {
          'icon-color': '#fbbf24',
          'icon-opacity': 0.95,
        },
      } as Parameters<typeof map.addLayer>[0];
      map.addLayer(planesLayerSpec, firstSymbolId);
    } catch (err) {
      console.warn('Could not pre-add planes layer:', err);
    }

    panel = new Panel(manager, firstSymbolId);
    panel.mount(document.getElementById('panel')!);
  });

  map.on('error', (e) => {
    // Surface auth errors helpfully
    if ((e.error as Error & { status?: number })?.status === 401) {
      sessionStorage.removeItem('mapbox_token');
      alert('Invalid Mapbox token. Please refresh the page and enter a valid public token (pk.…).');
    }
  });

  window.addEventListener('beforeunload', () => {
    panel?.destroy();
    manager.destroy();
  });
}
