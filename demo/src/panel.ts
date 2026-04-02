import type { LayerManager } from '@daturon/mapboxgl-layer-manager';
import type { LayerAnalyzer, AnalyzerReport } from '@daturon/mapboxgl-layer-manager';
import type { Expression, Layer, GeoJSONSource } from 'mapbox-gl';
import {
  LAYER_GROUPS,
  LAYERS,
  LAYER_TYPE,
  PRESETS,
  SOURCE_GROUPS,
  DEFAULT_LAYER_ORDER,
  SOURCES,
  FLIGHT_ROUTES_GEOJSON,
  type LayerGroup,
  type SourceGroup,
  type Preset,
} from './data';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'layers' | 'presets' | 'add-remove';

interface GroupState {
  visible: boolean;
  opacity: number;
  activeFilterIdx: number;
}

// ── Panel class ───────────────────────────────────────────────────────────────

export class Panel {
  private manager: LayerManager;
  private analyzer: LayerAnalyzer | null;

  private activeTab: TabId = 'layers';
  private activePresetId: string = 'full';
  private layerOrder: string[] = [...DEFAULT_LAYER_ORDER].reverse();
  private visibleLayerIds: Set<string> = new Set(DEFAULT_LAYER_ORDER);
  private groupStates: Record<string, GroupState> = {};

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private reportEl: HTMLElement | null = null;
  private countdownEl: HTMLElement | null = null;
  private countdown = 3;

  private beforeLayerId: string | undefined;

  private container: HTMLElement | null = null;
  private tabContentEl: HTMLElement | null = null;
  private stateEl: HTMLElement | null = null;

  // ── Animation state ────────────────────────────────────────────────────────
  private animGlobeSpin = false;
  private animRouteDashes = false;
  private animPulseQuakes = false;
  private animMovingPlanes = false;
  private animFrameId: number | null = null;
  private animStartTime = 0;
  private spinPaused = false;
  private spinResumeTimer: ReturnType<typeof setTimeout> | null = null;
  private spinContainer: HTMLElement | null = null;
  private spinPauseFn: (() => void) | null = null;
  private spinResumeFn: (() => void) | null = null;
  private planeProgress: number[] = FLIGHT_ROUTES_GEOJSON.features.map(() => Math.random());

  constructor(manager: LayerManager, beforeLayerId?: string) {
    this.manager = manager;
    this.analyzer = manager.analyzer;
    this.beforeLayerId = beforeLayerId;
    for (const group of LAYER_GROUPS) {
      this.groupStates[group.id] = {
        visible: true,
        opacity: group.defaultOpacity,
        activeFilterIdx: 0,
      };
    }
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    container.appendChild(this.buildPanel());
    this.startAnalyzerRefresh();
  }

  destroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.stopAnimLoop();
    this.detachSpinHandlers();
    // Hide planes on destroy (source/layer are owned by the map)
    const map = this.manager.getMapInstance();
    if (map?.getLayer('demo-planes')) {
      map.setLayoutProperty('demo-planes', 'visibility', 'none');
    }
  }

  // ── Panel DOM ─────────────────────────────────────────────────────────────

  private buildPanel(): DocumentFragment {
    const frag = document.createDocumentFragment();
    frag.appendChild(
      el('div', 'panel-header', [
        el('h2', '', [], { textContent: 'Layer Manager' }),
        el('span', 'panel-badge', [], { textContent: 'Live Demo' }),
      ]),
    );
    frag.appendChild(this.buildTabs());
    this.tabContentEl = el('div', 'tab-content');
    this.tabContentEl.appendChild(this.buildActiveTabContent());
    frag.appendChild(this.tabContentEl);
    this.stateEl = el('section', 'panel-section state-inspector');
    this.fillStateInspector(this.stateEl);
    frag.appendChild(this.stateEl);
    frag.appendChild(this.buildAnimationsSection());
    frag.appendChild(this.buildAnalyzerSection());
    return frag;
  }

  private buildTabs(): HTMLElement {
    const tabs: { id: TabId; label: string; icon: string }[] = [
      { id: 'layers', label: 'Layers', icon: '\u2261' },
      { id: 'presets', label: 'Presets', icon: '\u26a1' },
      { id: 'add-remove', label: 'Add/Remove', icon: '+' },
    ];
    const bar = el('div', 'mode-tabs');
    for (const tab of tabs) {
      const btn = el(
        'button',
        'tab-btn' + (this.activeTab === tab.id ? ' tab-btn-active' : ''),
        [
          el('span', 'tab-icon', [], { textContent: tab.icon }),
          el('span', '', [], { textContent: tab.label }),
        ],
        { onclick: () => this.switchTab(tab.id) },
      );
      btn.dataset.tab = tab.id;
      bar.appendChild(btn);
    }
    return bar;
  }

  private switchTab(id: TabId): void {
    if (!this.container || !this.tabContentEl) return;
    this.activeTab = id;
    this.container.querySelectorAll('.tab-btn').forEach((btn) => {
      const b = btn as HTMLElement;
      b.classList.toggle('tab-btn-active', b.dataset.tab === id);
    });
    this.tabContentEl.innerHTML = '';
    this.tabContentEl.appendChild(this.buildActiveTabContent());
  }

  private buildActiveTabContent(): HTMLElement | DocumentFragment {
    if (this.activeTab === 'layers') return this.buildLayersTab();
    if (this.activeTab === 'presets') return this.buildPresetsTab();
    return this.buildAddRemoveTab();
  }

  // ── Layers Tab ────────────────────────────────────────────────────────────

  private buildLayersTab(): HTMLElement {
    const section = el('section', 'panel-section');

    section.appendChild(
      el('div', 'section-title-row', [
        el('span', 'section-title', [], {
          textContent: 'Active Layers (' + this.layerOrder.length + ')',
        }),
        el('button', 'shuffle-btn', [], {
          textContent: '\u21c4 Shuffle',
          onclick: () => this.shuffleLayers(),
          title: 'Randomize layer order to visually explore the effect',
        }),
      ]),
    );

    section.appendChild(
      el('p', 'section-hint', [], {
        textContent: 'Use \u25b2 \u25bc to move layers \u2014 watch the map update instantly.',
      }),
    );

    const list = el('div', 'reorder-list');
    this.layerOrder.forEach((layerId, index) => {
      list.appendChild(this.buildReorderItem(layerId, index));
    });
    section.appendChild(list);

    const hasVisibleGroups = LAYER_GROUPS.some((g) =>
      g.layerIds.some((id) => this.layerOrder.includes(id)),
    );
    if (hasVisibleGroups) {
      section.appendChild(
        el('div', 'section-title-row', [
          el('span', 'section-title', [], { textContent: 'Group Controls' }),
        ]),
      );
      for (const group of LAYER_GROUPS) {
        if (group.layerIds.some((id) => this.layerOrder.includes(id))) {
          section.appendChild(this.buildGroupCard(group));
        }
      }
    }

    return section;
  }

  private buildReorderItem(layerId: string, index: number): HTMLElement {
    const type = LAYER_TYPE[layerId] ?? 'other';
    const isFirst = index === 0;
    const isLast = index === this.layerOrder.length - 1;

    const item = el('div', 'reorder-item');
    item.appendChild(el('span', 'reorder-pos', [], { textContent: String(index + 1) }));
    item.appendChild(el('span', 'type-badge type-' + type, [], { textContent: type }));
    item.appendChild(el('span', 'reorder-name', [], { textContent: layerId }));

    const upBtn = el('button', 'move-btn' + (isFirst ? ' move-btn-disabled' : ''), [], {
      textContent: '\u25b2',
      title: 'Render above current neighbor',
    });
    if (!isFirst) upBtn.onclick = () => this.moveLayer(index, index - 1);

    const downBtn = el('button', 'move-btn' + (isLast ? ' move-btn-disabled' : ''), [], {
      textContent: '\u25bc',
      title: 'Render below current neighbor',
    });
    if (!isLast) downBtn.onclick = () => this.moveLayer(index, index + 1);

    item.appendChild(upBtn);
    item.appendChild(downBtn);
    return item;
  }

  private moveLayer(fromIdx: number, toIdx: number): void {
    const order = [...this.layerOrder];
    const [moved] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, moved);
    this.layerOrder = order;
    this.applyLayerOrder();
    this.refreshLayersTab();
  }

  private shuffleLayers(): void {
    const order = [...this.layerOrder];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.layerOrder = order;
    this.applyLayerOrder();
    this.refreshLayersTab();
  }

  private applyLayerOrder(): void {
    this.manager
      .renderOrderedLayers([...this.layerOrder].reverse(), undefined, this.beforeLayerId)
      .then(() => this.reapplyGroupStates())
      .catch((err) => {
        console.error('renderOrderedLayers failed:', err);
      });
    this.refreshStateInspector();
  }

  private reapplyGroupStates(): void {
    for (const group of LAYER_GROUPS) {
      const state = this.groupStates[group.id];
      if (!state) continue;
      for (const id of group.layerIds) {
        if (this.layerOrder.includes(id)) {
          this.manager.setLayerOpacity(id, state.opacity);
        }
      }
      if (state.activeFilterIdx > 0 && group.filters) {
        const f = group.filters[state.activeFilterIdx];
        const primaryId = group.layerIds[0];
        if (f?.expression && this.layerOrder.includes(primaryId)) {
          this.manager.updateLayerFilter(primaryId, f.expression as Expression, 'demo');
        }
      }
    }
  }

  private refreshLayersTab(): void {
    if (!this.tabContentEl || this.activeTab !== 'layers') return;
    this.tabContentEl.innerHTML = '';
    this.tabContentEl.appendChild(this.buildLayersTab());
  }

  // ── Presets Tab ───────────────────────────────────────────────────────────

  private buildPresetsTab(): HTMLElement {
    const section = el('section', 'panel-section');
    section.appendChild(
      el('div', 'section-title-row', [
        el('span', 'section-title', [], { textContent: 'Map Presets' }),
      ]),
    );
    section.appendChild(
      el('p', 'section-hint', [], {
        textContent: 'Each preset calls renderOrderedLayers() with a different layer set.',
      }),
    );
    const grid = el('div', 'preset-grid');
    for (const preset of PRESETS) {
      grid.appendChild(this.buildPresetCard(preset));
    }
    section.appendChild(grid);
    return section;
  }

  private buildPresetCard(preset: Preset): HTMLElement {
    const isActive = preset.id === this.activePresetId;
    const card = el('div', 'preset-card' + (isActive ? ' preset-card-active' : ''), [
      el('div', 'preset-card-top', [
        el('span', 'preset-emoji', [], { textContent: preset.emoji }),
        el('div', 'preset-card-meta', [
          el('span', 'preset-name', [], { textContent: preset.label }),
          el('span', 'preset-count', [], {
            textContent: preset.layerOrder.length + ' layers',
          }),
        ]),
      ]),
      el('p', 'preset-desc', [], { textContent: preset.description }),
    ]);
    card.onclick = () => this.applyPreset(preset);
    return card;
  }

  private applyPreset(preset: Preset): void {
    this.activePresetId = preset.id;
    this.layerOrder = [...preset.layerOrder].reverse();
    this.visibleLayerIds = new Set(preset.layerOrder);
    this.applyLayerOrder();
    if (preset.view) {
      const map = this.manager.getMapInstance();
      map?.flyTo({
        center: preset.view.center,
        zoom: preset.view.zoom,
        pitch: preset.view.pitch ?? 0,
        duration: 1500,
      });
    }
    if (this.tabContentEl && this.activeTab === 'presets') {
      this.tabContentEl.innerHTML = '';
      this.tabContentEl.appendChild(this.buildPresetsTab());
    }
  }

  // ── Add/Remove Tab ────────────────────────────────────────────────────────

  private buildAddRemoveTab(): HTMLElement {
    const section = el('section', 'panel-section');
    const totalLayers = DEFAULT_LAYER_ORDER.length;

    section.appendChild(
      el('div', 'section-title-row', [
        el('span', 'section-title', [], { textContent: 'Add / Remove Layers' }),
        el('span', 'section-hint', [], {
          textContent: this.layerOrder.length + '/' + totalLayers + ' active',
        }),
      ]),
    );
    section.appendChild(
      el('p', 'section-hint', [], {
        textContent: 'Calls addLayers / removeLayers and addSources / removeSources.',
      }),
    );

    for (const group of SOURCE_GROUPS) {
      section.appendChild(this.buildSourceGroupUI(group));
    }
    return section;
  }

  private buildSourceGroupUI(group: SourceGroup): HTMLElement {
    const allActive = group.layerIds.every((id) => this.layerOrder.includes(id));
    const someActive = group.layerIds.some((id) => this.layerOrder.includes(id));

    const groupEl = el('div', 'source-group');
    const toggleLabel = el('label', 'source-toggle');
    const groupCb = el('input') as HTMLInputElement;
    groupCb.type = 'checkbox';
    groupCb.checked = allActive;
    groupCb.indeterminate = someActive && !allActive;
    toggleLabel.appendChild(groupCb);
    toggleLabel.appendChild(el('span', 'toggle-track'));

    groupEl.appendChild(
      el('div', 'source-group-header', [
        toggleLabel,
        el('span', 'source-group-emoji', [], { textContent: group.emoji }),
        el('span', 'source-group-label', [], { textContent: group.label }),
      ]),
    );

    groupCb.onchange = () => {
      if (groupCb.checked) this.addLayerGroup(group);
      else this.removeLayerGroup(group);
    };

    for (const layerId of group.layerIds) {
      const type = LAYER_TYPE[layerId] ?? 'other';
      const isActive = this.layerOrder.includes(layerId);

      const rowLabel = el('label', 'layer-toggle-row');
      const cb = el('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = isActive;
      cb.onchange = () => {
        if (cb.checked) this.addSingleLayer(group, layerId);
        else this.removeSingleLayer(group, layerId);
      };
      rowLabel.appendChild(cb);
      rowLabel.appendChild(el('span', 'toggle-track toggle-track-sm'));
      rowLabel.appendChild(el('span', 'type-badge type-' + type, [], { textContent: type }));
      rowLabel.appendChild(el('span', 'layer-toggle-name', [], { textContent: layerId }));
      groupEl.appendChild(rowLabel);
    }

    return groupEl;
  }

  private addLayerGroup(group: SourceGroup): void {
    const activeSources = this.manager.getActiveCustomSourceIds();
    const missingSources = group.sourceIds.filter((id) => !activeSources.includes(id));
    if (missingSources.length > 0) {
      const toAdd = SOURCES.filter((s) => missingSources.includes(s.id));
      if (toAdd.length) this.manager.addSources(toAdd);
    }
    const layersToAdd: Layer[] = [];
    for (const layerId of group.layerIds) {
      if (!this.layerOrder.includes(layerId)) {
        const def = LAYERS.find((l) => l.id === layerId);
        if (def) layersToAdd.push(def);
      }
    }
    if (layersToAdd.length) this.manager.addLayers(layersToAdd);
    for (const layerId of group.layerIds) {
      if (!this.layerOrder.includes(layerId)) {
        this.layerOrder.push(layerId);
        this.visibleLayerIds.add(layerId);
      }
    }
    this.applyLayerOrder();
    this.refreshAddRemoveTab();
  }

  private removeLayerGroup(group: SourceGroup): void {
    this.manager.removeLayers(group.layerIds);
    this.layerOrder = this.layerOrder.filter((id) => !group.layerIds.includes(id));
    for (const id of group.layerIds) this.visibleLayerIds.delete(id);
    for (const sourceId of group.sourceIds) {
      const stillUsed = this.layerOrder.some((activeId) => {
        const def = LAYERS.find((l) => l.id === activeId);
        return (def as unknown as { source?: string })?.source === sourceId;
      });
      if (!stillUsed) this.manager.removeSources([sourceId]);
    }
    this.applyLayerOrder();
    this.refreshAddRemoveTab();
  }

  private addSingleLayer(group: SourceGroup, layerId: string): void {
    const activeSources = this.manager.getActiveCustomSourceIds();
    const missingSources = group.sourceIds.filter((id) => !activeSources.includes(id));
    if (missingSources.length > 0) {
      const toAdd = SOURCES.filter((s) => missingSources.includes(s.id));
      if (toAdd.length) this.manager.addSources(toAdd);
    }
    const def = LAYERS.find((l) => l.id === layerId);
    if (def && !this.layerOrder.includes(layerId)) {
      this.manager.addLayers([def]);
      this.layerOrder.push(layerId);
      this.visibleLayerIds.add(layerId);
    }
    this.applyLayerOrder();
    this.refreshAddRemoveTab();
  }

  private removeSingleLayer(group: SourceGroup, layerId: string): void {
    this.manager.removeLayers([layerId]);
    this.layerOrder = this.layerOrder.filter((id) => id !== layerId);
    this.visibleLayerIds.delete(layerId);
    for (const sourceId of group.sourceIds) {
      const stillUsed = this.layerOrder.some((activeId) => {
        const def = LAYERS.find((l) => l.id === activeId);
        return (def as unknown as { source?: string })?.source === sourceId;
      });
      if (!stillUsed) this.manager.removeSources([sourceId]);
    }
    this.applyLayerOrder();
    this.refreshAddRemoveTab();
  }

  private refreshAddRemoveTab(): void {
    if (!this.tabContentEl || this.activeTab !== 'add-remove') return;
    this.tabContentEl.innerHTML = '';
    this.tabContentEl.appendChild(this.buildAddRemoveTab());
  }

  // ── Animations UI ─────────────────────────────────────────────────────────

  private buildAnimationsSection(): HTMLElement {
    const section = el('section', 'panel-section');
    section.appendChild(
      el('div', 'section-title-row', [
        el('span', 'section-title', [], { textContent: 'Animations' }),
      ]),
    );
    section.appendChild(
      el('p', 'section-hint', [], {
        textContent: 'Live map animations — each runs independently.',
      }),
    );

    const card = el('div', 'layer-card');

    const animations: {
      label: string;
      emoji: string;
      get: () => boolean;
      toggle: (v: boolean) => void;
    }[] = [
      {
        label: 'Globe Spin',
        emoji: '🌐',
        get: () => this.animGlobeSpin,
        toggle: (v) => {
          this.animGlobeSpin = v;
          if (v) this.attachSpinHandlers();
          else this.detachSpinHandlers();
          this.ensureAnimLoop();
        },
      },
      {
        label: 'Route Dashes',
        emoji: '✈️',
        get: () => this.animRouteDashes,
        toggle: (v) => {
          this.animRouteDashes = v;
          if (!v) {
            const map = this.manager.getMapInstance();
            if (map?.getLayer('demo-flight-routes')) {
              map.setPaintProperty('demo-flight-routes', 'line-dasharray', [3, 2]);
            }
          }
          this.ensureAnimLoop();
        },
      },
      {
        label: 'Pulse Earthquakes',
        emoji: '🔴',
        get: () => this.animPulseQuakes,
        toggle: (v) => {
          this.animPulseQuakes = v;
          if (!v) {
            const map = this.manager.getMapInstance();
            if (map?.getLayer('demo-earthquake-points')) {
              map.setPaintProperty('demo-earthquake-points', 'circle-radius', [
                'interpolate',
                ['linear'],
                ['get', 'mag'],
                4,
                4,
                7,
                12,
                9,
                24,
              ]);
            }
          }
          this.ensureAnimLoop();
        },
      },
      {
        label: 'Moving Planes',
        emoji: '🛫',
        get: () => this.animMovingPlanes,
        toggle: (v) => {
          this.animMovingPlanes = v;
          const map = this.manager.getMapInstance();
          if (map?.getLayer('demo-planes')) {
            map.setLayoutProperty('demo-planes', 'visibility', v ? 'visible' : 'none');
          }
          this.ensureAnimLoop();
        },
      },
    ];

    for (const anim of animations) {
      const row = el('div', 'anim-row');
      const toggleLabel = el('label', 'source-toggle');
      const cb = el('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.checked = anim.get();
      cb.onchange = () => anim.toggle(cb.checked);
      toggleLabel.appendChild(cb);
      toggleLabel.appendChild(el('span', 'toggle-track'));
      row.appendChild(toggleLabel);
      row.appendChild(el('span', 'anim-emoji', [], { textContent: anim.emoji }));
      row.appendChild(el('span', 'anim-label', [], { textContent: anim.label }));
      card.appendChild(row);
    }

    section.appendChild(card);
    return section;
  }

  // ── Animation Engine ──────────────────────────────────────────────────────

  private ensureAnimLoop(): void {
    const any =
      this.animGlobeSpin || this.animRouteDashes || this.animPulseQuakes || this.animMovingPlanes;
    if (any && this.animFrameId === null) {
      this.animStartTime = performance.now();
      this.animFrameId = requestAnimationFrame((t) => this.tickAnimations(t));
    } else if (!any && this.animFrameId !== null) {
      this.stopAnimLoop();
    }
  }

  private stopAnimLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private tickAnimations(now: number): void {
    const map = this.manager.getMapInstance();
    if (!map) {
      this.animFrameId = null;
      return;
    }
    const elapsed = now - this.animStartTime;

    // 1. Globe spin
    if (this.animGlobeSpin && !this.spinPaused) {
      const center = map.getCenter();
      center.lng = ((center.lng - 0.06 + 180) % 360) - 180;
      map.easeTo({ center, duration: 0, easing: (t) => t });
    }

    // 2. Route dashes — marching ants: keep dash+gap constant (5) and shift phase
    if (this.animRouteDashes && map.getLayer('demo-flight-routes')) {
      const DASH = 3,
        GAP = 2;
      // p cycles 0→5 over 2 seconds; clamp tail/inGap away from 0 to avoid zero-width segments
      const p = ((elapsed % 2000) / 2000) * (DASH + GAP);
      let dasharray: number[];
      if (p < DASH) {
        const tail = Math.max(0.001, p);
        dasharray = [DASH - tail, GAP, tail]; // [remaining-dash, gap, elapsed-dash]
      } else {
        const inGap = Math.max(0.001, p - DASH);
        dasharray = [0.001, GAP - inGap, DASH, inGap]; // [tiny, remaining-gap, full-dash, elapsed-gap]
      }
      map.setPaintProperty('demo-flight-routes', 'line-dasharray', dasharray);
    }

    // 3. Pulse earthquake circles
    if (this.animPulseQuakes && map.getLayer('demo-earthquake-points')) {
      const pulse = 1 + 0.25 * Math.sin((elapsed / 800) * Math.PI * 2);
      map.setPaintProperty('demo-earthquake-points', 'circle-radius', [
        'interpolate',
        ['linear'],
        ['get', 'mag'],
        4,
        4 * pulse,
        7,
        12 * pulse,
        9,
        24 * pulse,
      ]);
    }

    // 4. Moving planes along great-circle routes
    if (this.animMovingPlanes && map.getSource('demo-planes')) {
      const routes = FLIGHT_ROUTES_GEOJSON.features;
      // Each route completes in 8–16s (staggered by index)
      const features = routes.map((route, i) => {
        const period = 8000 + (i % 4) * 2000;
        const progress = (elapsed / period + this.planeProgress[i]) % 1;
        const coords = route.geometry.coordinates as [number, number][];
        const posIdx = Math.min(Math.floor(progress * (coords.length - 1)), coords.length - 2);
        const t = progress * (coords.length - 1) - posIdx;
        const [lon1, lat1] = coords[posIdx];
        const [lon2, lat2] = coords[posIdx + 1];
        const lon = lon1 + (lon2 - lon1) * t;
        const lat = lat1 + (lat2 - lat1) * t;
        // Bearing in degrees from north
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const y = Math.sin(dLon) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon);
        const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [lon, lat] },
          properties: { bearing },
        };
      });

      (map.getSource('demo-planes') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      });
    }

    const any =
      this.animGlobeSpin || this.animRouteDashes || this.animPulseQuakes || this.animMovingPlanes;
    if (any) {
      this.animFrameId = requestAnimationFrame((t) => this.tickAnimations(t));
    } else {
      this.animFrameId = null;
    }
  }

  // ── Globe spin interaction handlers ──────────────────────────────────────

  private attachSpinHandlers(): void {
    const map = this.manager.getMapInstance();
    if (!map) return;
    // Use the map container's DOM events — avoids Mapbox event type narrowing issues
    const container = map.getContainer();
    this.spinContainer = container;
    this.spinPauseFn = () => {
      this.spinPaused = true;
    };
    this.spinResumeFn = () => {
      if (this.spinResumeTimer) clearTimeout(this.spinResumeTimer);
      this.spinResumeTimer = setTimeout(() => {
        this.spinPaused = false;
      }, 2000);
    };
    container.addEventListener('mousedown', this.spinPauseFn);
    container.addEventListener('touchstart', this.spinPauseFn, { passive: true });
    container.addEventListener('wheel', this.spinPauseFn, { passive: true });
    container.addEventListener('mouseup', this.spinResumeFn);
    container.addEventListener('touchend', this.spinResumeFn);
    map.on('dragend', this.spinResumeFn);
  }

  private detachSpinHandlers(): void {
    if (this.spinContainer && this.spinPauseFn && this.spinResumeFn) {
      this.spinContainer.removeEventListener('mousedown', this.spinPauseFn);
      this.spinContainer.removeEventListener('touchstart', this.spinPauseFn);
      this.spinContainer.removeEventListener('wheel', this.spinPauseFn);
      this.spinContainer.removeEventListener('mouseup', this.spinResumeFn);
      this.spinContainer.removeEventListener('touchend', this.spinResumeFn);
      const map = this.manager.getMapInstance();
      if (map) map.off('dragend', this.spinResumeFn);
    }
    this.spinContainer = null;
    this.spinPauseFn = null;
    this.spinResumeFn = null;
    this.spinPaused = false;
    if (this.spinResumeTimer) {
      clearTimeout(this.spinResumeTimer);
      this.spinResumeTimer = null;
    }
  }

  // ── State Inspector ───────────────────────────────────────────────────────

  private fillStateInspector(section: HTMLElement): void {
    section.innerHTML = '';
    section.appendChild(
      el('div', 'section-title-row', [
        el('span', 'section-title', [], { textContent: 'State Inspector' }),
      ]),
    );
    const apiOrder = [...this.layerOrder].reverse();
    const activeLayers = this.manager.getActiveCustomLayerIds();
    const activeSources = this.manager.getActiveCustomSourceIds();
    const content = el('div', 'state-content');
    content.appendChild(
      el('p', 'state-label', [], {
        textContent: 'renderOrderedLayers([\u2026])  // 0\u202f=\u202fbottom',
      }),
    );
    const arr = el('div', 'state-array');
    apiOrder.forEach((id, i) => {
      const type = LAYER_TYPE[id] ?? 'other';
      arr.appendChild(
        el('div', 'state-array-item', [
          el('span', 'state-idx', [], { textContent: String(i) }),
          el('span', 'type-badge type-' + type, [], { textContent: type }),
          el('span', 'state-id', [], { textContent: id }),
        ]),
      );
    });
    content.appendChild(arr);
    content.appendChild(
      el('p', 'state-label', [], { textContent: 'Active Layers (' + activeLayers.length + ')' }),
    );
    content.appendChild(
      el('p', 'state-value', [], {
        textContent: activeLayers.length > 0 ? activeLayers.join(', ') : '\u2014',
      }),
    );
    content.appendChild(
      el('p', 'state-label', [], { textContent: 'Active Sources (' + activeSources.length + ')' }),
    );
    content.appendChild(
      el('p', 'state-value', [], {
        textContent: activeSources.length > 0 ? activeSources.join(', ') : '\u2014',
      }),
    );
    section.appendChild(content);
  }

  private refreshStateInspector(): void {
    if (!this.stateEl) return;
    this.fillStateInspector(this.stateEl);
  }

  // ── Group cards ───────────────────────────────────────────────────────────

  private buildGroupCard(group: LayerGroup): HTMLElement {
    const state = this.groupStates[group.id];
    if (!state) return el('div', '');

    const opacityPct = el('span', 'opacity-pct', [], {
      textContent: Math.round(state.opacity * 100) + '%',
    });

    const opacitySlider = el('input', 'opacity-slider') as HTMLInputElement;
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '100';
    opacitySlider.value = String(Math.round(state.opacity * 100));
    opacitySlider.oninput = () => {
      const val = Number(opacitySlider.value) / 100;
      state.opacity = val;
      opacityPct.textContent = Math.round(val * 100) + '%';
      for (const id of group.layerIds) this.manager.setLayerOpacity(id, val);
    };

    const controls = el('div', 'layer-controls', [
      el('div', 'control-row', [
        el('span', 'control-label', [], { textContent: 'Opacity' }),
        opacitySlider,
        opacityPct,
      ]),
    ]);

    if (group.filters) {
      const chipGroup = el('div', 'chip-group');
      group.filters.forEach((f, i) => {
        const chip = el(
          'button',
          'chip' + (i === state.activeFilterIdx ? ' chip-active' : ''),
          [],
          {
            textContent: f.label,
            onclick: () => {
              state.activeFilterIdx = i;
              chipGroup.querySelectorAll('.chip').forEach((c, j) => {
                c.classList.toggle('chip-active', j === i);
              });
              const primaryId = group.layerIds[0];
              if (f.expression) {
                this.manager.updateLayerFilter(primaryId, f.expression as Expression, 'demo');
              } else {
                this.manager.removeLayerFilter(primaryId, 'demo');
              }
            },
          },
        );
        chipGroup.appendChild(chip);
      });
      controls.appendChild(
        el('div', 'control-row filter-row', [
          el('span', 'control-label', [], { textContent: 'Filter' }),
          chipGroup,
        ]),
      );
    }

    return el('div', 'layer-card', [
      el('div', 'layer-header', [
        el('span', 'layer-emoji', [], { textContent: group.emoji }),
        el('span', 'layer-name', [], { textContent: group.label }),
      ]),
      controls,
    ]);
  }

  // ── Analyzer ─────────────────────────────────────────────────────────────

  private buildAnalyzerSection(): HTMLElement {
    const section = el('section', 'panel-section', [
      el('div', 'section-title-row', [
        el('span', 'section-title', [], { textContent: 'Performance Analyzer' }),
        el('span', 'section-hint', [], {
          textContent: this.analyzer ? 'live' : 'pass { analyzer: true } to enable',
        }),
      ]),
    ]);

    if (this.analyzer) {
      this.reportEl = el('div', 'analyzer-report');
      this.countdownEl = el('span', 'analyzer-countdown', [], {
        textContent: '\u21bb 3s',
      });
      section.appendChild(this.reportEl);
      section.appendChild(
        el('button', 'btn-refresh', [this.countdownEl], {
          onclick: () => {
            this.refreshReport();
            this.resetCountdown();
          },
        }),
      );
      this.refreshReport();
    } else {
      section.appendChild(
        el('p', 'analyzer-disabled', [], {
          textContent: 'Analyzer not enabled for this instance.',
        }),
      );
    }

    return section;
  }

  private startAnalyzerRefresh(): void {
    if (!this.analyzer) return;
    this.refreshInterval = setInterval(() => {
      this.countdown--;
      if (this.countdownEl) this.countdownEl.textContent = '\u21bb ' + this.countdown + 's';
      if (this.countdown <= 0) {
        this.refreshReport();
        this.resetCountdown();
      }
    }, 1000);
  }

  private resetCountdown(): void {
    this.countdown = 3;
    if (this.countdownEl) this.countdownEl.textContent = '\u21bb 3s';
  }

  private refreshReport(): void {
    if (!this.analyzer || !this.reportEl) return;
    this.reportEl.innerHTML = '';
    this.reportEl.appendChild(this.buildReport(this.analyzer.getReport()));
  }

  private buildReport(r: AnalyzerReport): DocumentFragment {
    const frag = document.createDocumentFragment();

    frag.appendChild(
      el('div', 'stats-grid', [
        this.statRow(
          'Time to idle',
          r.timeToIdleMs !== null ? r.timeToIdleMs + 'ms' : '\u2014',
          r.timeToIdleMs !== null && r.timeToIdleMs < 1000 ? 'good' : 'neutral',
        ),
        this.statRow(
          'Avg frame',
          r.frameStats.sampleCount > 0 ? r.frameStats.avg + 'ms' : '\u2014',
          r.frameStats.avg > 0 && r.frameStats.avg < 16.7
            ? 'good'
            : r.frameStats.avg > 33
              ? 'warn'
              : 'neutral',
        ),
        this.statRow(
          'p95 frame',
          r.frameStats.sampleCount > 0 ? r.frameStats.p95 + 'ms' : '\u2014',
          r.frameStats.p95 > 50 ? 'warn' : 'neutral',
        ),
        this.statRow(
          'Renders/sec',
          r.rendersPerSecond > 0 ? String(r.rendersPerSecond) : '\u2014',
          'neutral',
        ),
      ]),
    );

    if (r.layerTimes.length > 0) {
      frag.appendChild(el('p', 'subsection-title', [], { textContent: 'GPU time per layer' }));
      const bars = el('div', 'layer-bars');
      for (const lt of r.layerTimes.slice(0, 5)) {
        const pct = Math.round(lt.gpuTimeShare * 100);
        bars.appendChild(
          el('div', 'layer-bar', [
            el('span', 'bar-label', [], { textContent: lt.layerId }),
            el('div', 'bar-track', [el('div', 'bar-fill', [], { style: 'width: ' + pct + '%' })]),
            el('span', 'bar-value', [], {
              textContent: lt.avgGpuTimeMs + 'ms (' + pct + '%)',
            }),
          ]),
        );
      }
      frag.appendChild(bars);
    }

    if (r.sourceLoadTimes.length > 0) {
      frag.appendChild(el('p', 'subsection-title', [], { textContent: 'Source load times' }));
      const list = el('div', 'source-list');
      for (const s of r.sourceLoadTimes) {
        list.appendChild(
          el('div', 'source-row', [
            el('span', 'source-id', [], { textContent: s.sourceId }),
            el('span', 'source-time', [], {
              textContent: (s.loadTimeMs / 1000).toFixed(2) + 's',
            }),
          ]),
        );
      }
      frag.appendChild(list);
    }

    frag.appendChild(el('p', 'subsection-title', [], { textContent: 'Suggestions' }));
    const suggestions = el('ul', 'suggestions-list');
    if (r.suggestions.length === 0) {
      suggestions.appendChild(
        el('li', 'suggestion-ok', [], { textContent: '\u2713 No performance issues detected' }),
      );
    } else {
      for (const s of r.suggestions) {
        suggestions.appendChild(el('li', 'suggestion-warn', [], { textContent: '\u26a0 ' + s }));
      }
    }
    frag.appendChild(suggestions);

    return frag;
  }

  private statRow(label: string, value: string, status: 'good' | 'warn' | 'neutral'): HTMLElement {
    return el('div', 'stat-row stat-' + status, [
      el('span', 'stat-label', [], { textContent: label }),
      el('span', 'stat-value', [], { textContent: value }),
    ]);
  }
}

// ── Tiny DOM helper ───────────────────────────────────────────────────────────

type Props = Partial<
  Record<string, unknown> & {
    textContent: string;
    style: string;
    title: string;
    onclick: () => void;
    onchange: () => void;
    oninput: () => void;
  }
>;

function el(
  tag: string,
  className = '',
  children: HTMLElement[] = [],
  props: Props = {},
): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) node.appendChild(child);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'onclick' || k === 'onchange' || k === 'oninput') {
      (node as unknown as Record<string, unknown>)[k] = v;
    } else if (k === 'style') {
      node.setAttribute('style', v as string);
    } else if (k === 'title') {
      node.setAttribute('title', v as string);
    } else {
      (node as unknown as Record<string, unknown>)[k] = v;
    }
  }
  return node;
}
