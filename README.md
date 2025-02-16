# Mapbox GL Layer Manager

![npm version](https://img.shields.io/npm/v/@daturon/mapboxgl-layer-manager)

**The Layer Manager for Mapbox GL** is a powerful utility that simplifies the management of layers and sources in the **Mapbox GL** environment. This package allows easy **layer reordering, visibility toggling, opacity adjustments, and other modifications**, making it an essential tool for developers working with interactive maps.

It supports dynamic management of multiple sources and layers, allowing developers to **dynamically change active sources, reorder layers efficiently, and automatically free unused resources** to optimize performance.

---

## 🚀 Features

- 🗺️ **Easy Layer and Source Management** – Add, remove, and update layers and sources effortlessly.
- 🔄 **Dynamic Layer Reordering** – Change layer positions in real-time.
- 🎨 **Customize Layer Styling** – Adjust **opacity, visibility, and colors** dynamically.
- 🗃️ **Manage Multiple Sources** – Attach and detach different sources on the fly.
- ⚡ **Automatic Resource Cleanup** – Unused sources and layers are removed automatically to improve efficiency.
- 🔍 **Advanced Filtering System** – Filters have unique identifiers, making them easy to enable/disable dynamically.

---

## 📦 Installation

You can install the package via **npm** or **yarn**:

```sh
npm install @daturon/mapboxgl-layer-manager
```

or

```sh
yarn add @daturon/mapboxgl-layer-manager
```

---

## 🛠️ Usage

### **1️⃣ Import and Initialize**

```ts
import { LayerManager } from '@daturon/mapboxgl-layer-manager';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-74.006, 40.7128],
  zoom: 10,
});

const manager = new LayerManager(map);
```

### **2️⃣ Add a Layer with a Source**

```ts
manager.addSource('my-source', {
  type: 'geojson',
  data: myGeoJSONData,
});

manager.addLayer({
  id: 'my-layer',
  type: 'circle',
  source: 'my-source',
  paint: { 'circle-radius': 5, 'circle-color': '#ff0000' },
});

manager.renderOrderedLayers(['my-layer']); // When we have multiple layers, we can use the renderOrderedLayers method to render them in the correct order. Call this method again when you need a new layer set to be rendered.
```

### **3️⃣ Modify Layer Properties**

```ts
manager.setLayerOpacity('my-layer', 0.5);
manager.toggleLayerVisibility('my-layer');
```

### **4️⃣ Reorder Layers**

```ts
manager.reorderLayer('my-layer', 'another-layer');
```

### **5️⃣ Manage Filters Dynamically**

```ts
manager.setFilter('my-layer', 'my-filter', ['==', 'type', 'park']);
manager.removeFilter('my-layer', 'my-filter');
```

### **6️⃣ Remove a Layer and Free Resources**

```ts
manager.removeLayer('my-layer');
manager.removeSource('my-source');
```

---

## 🏗️ Contributing

We welcome contributions! If you want to improve this package:

1. **Fork** the repository.
2. **Clone** your fork:
   ```sh
   git clone https://github.com/daturon/mapboxgl-layer-manager.git
   ```
3. **Install dependencies**:
   ```sh
   yarn install
   ```
4. **Create a feature branch**:
   ```sh
   git checkout -b feature-name
   ```
5. **Commit changes**:
   ```sh
   git commit -m "Add new feature"
   ```
6. **Push and open a pull request**.

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 🔗 Links

- **GitHub Repository**: [Mapbox GL Layer Manager](https://github.com/daturon/mapboxgl-layer-manager)
- **Report Issues**: [GitHub Issues](https://github.com/daturon/mapboxgl-layer-manager/issues)
- **NPM Package**: [npmjs.com/@daturon/mapboxgl-layer-manager](https://www.npmjs.com/package/@daturon/mapboxgl-layer-manager)

🚀 Happy Mapping! 🌍
