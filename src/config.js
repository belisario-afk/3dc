// Global configuration and static car registry.
// IMPORTANT (GitHub Pages): Do NOT begin asset paths with a leading slash
// when deploying to a project page (e.g. https://user.github.io/3dc/).
// Use relative paths like 'assets/models/car.glb'. We prefix BASE_URL at runtime.

export const ENABLE_HDR = true;           // Gracefully ignored if env.hdr missing
export const ENABLE_OUTLINE = true;
export const ENABLE_SHADOWS = true;

export const DIAGNOSTICS_LOGS = true;

// Dynamic car JSON (relative) – resolved with BASE_URL in loadDynamicCars()
export const DYNAMIC_CAR_JSON_PATH = 'cars.json';

export const CAMERA_CONFIG = {
  FOV: 70,
  NEAR: 0.1,
  FAR: 250,
  START_POSITION: { x: 0, y: 1.65, z: 8 },
  MAX_SPEED: 14,
  SPRINT_MULTIPLIER: 1.8,
  ACCELERATION: 45,
  DAMPING: 12,
  REDUCED_MOTION_ACCEL: 25,
  REDUCED_MOTION_DAMPING: 20,
  BOUNDS: {
    minX: -80,
    maxX: 80,
    minZ: -80,
    maxZ: 80
  },
  MAX_DELTA: 0.05
};

export const LIGHTING_CONFIG = {
  exposure: 1.25,
  shadowMapSizeHigh: 2048,
  shadowMapSizeLow: 1024,
  sun: {
    position: [35, 70, 25],
    intensity: 2.8
  },
  hemi: {
    skyColor: 0xeeeeff,
    groundColor: 0x444444,
    intensity: 0.9
  },
  shadow: {
    bias: -0.00015,
    normalBias: 0.02
  }
};

// STATIC CARS ARRAY
// NOTE: modelPath has NO leading slash.
export let CARS = [
  {
    id: 'terzo',
    name: 'Lamborghini Terzo Millennio',
    modelPath: 'assets/models/free__lamborghini_terzo_millennio.glb',
    position: [0, 0, -6],
    rotation: [0, Math.PI * 0.15, 0],
    detailsKey: 'terzo',
    targetScale: 3.4
  },
  {
    id: 'concept-1',
    name: 'Concept Hyperion',
    modelPath: 'assets/models/placeholder-car.gltf',
    position: [6, 0, -4],
    rotation: [0, -Math.PI * 0.35, 0],
    detailsKey: null,
    targetScale: 3.2
  },
  {
    id: 'concept-2',
    name: 'Aether Vision',
    modelPath: 'assets/models/placeholder-car.gltf',
    position: [-6, 0, -4],
    rotation: [0, Math.PI * 0.5, 0],
    detailsKey: null,
    targetScale: 3.2
  }
];

export const CAR_LOAD_DISTANCE = 60;

export const QUALITY_PRESETS = {
  HIGH: {
    shadowMapSize: LIGHTING_CONFIG.shadowMapSizeHigh,
    outlineEdgeStrength: 4.0,
    outlineEdgeGlow: 0.4,
    anisotropyMultiplier: 1.0
  },
  LOW: {
    shadowMapSize: LIGHTING_CONFIG.shadowMapSizeLow,
    outlineEdgeStrength: 1.5,
    outlineEdgeGlow: 0.0,
    anisotropyMultiplier: 0.05
  }
};

export function logGroup(label, fn) {
  if (!DIAGNOSTICS_LOGS) {
    return fn && fn();
  }
  console.groupCollapsed(`[Diag] ${label}`);
  try {
    fn && fn();
  } finally {
    console.groupEnd();
  }
}

/**
 * Dynamically load & merge cars from public/cars.json (optional).
 * Ensures:
 *  - Relative model paths (strips any leading slash)
 *  - Unique IDs (adds -1, -2 suffix if collisions)
 */
export async function loadDynamicCars() {
  try {
    const base = (typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/');
    // Build absolute URL robustly (BASE_URL ends with '/')
    const dynamicUrl = new URL(DYNAMIC_CAR_JSON_PATH, window.location.origin + base).toString();
    const res = await fetch(dynamicUrl, { cache: 'no-store' });

    if (!res.ok) {
      console.warn('[DynamicCars] cars.json not found (status:', res.status, ')');
      return;
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.cars)) {
      console.warn('[DynamicCars] Invalid cars.json (missing cars array).');
      return;
    }

    const existingIds = new Set(CARS.map(c => c.id));
    const merged = json.cars.map(c => {
      const clone = { ...c };
      if (!clone.id) clone.id = `dyn-${Math.random().toString(36).slice(2)}`;

      if (existingIds.has(clone.id)) {
        const original = clone.id;
        let i = 1;
        while (existingIds.has(`${clone.id}-${i}`)) i++;
        clone.id = `${clone.id}-${i}`;
        console.warn(`[DynamicCars] ID collision for "${original}", renamed "${clone.id}"`);
      }

      existingIds.add(clone.id);
      clone.modelPath = (clone.modelPath || '').replace(/^\//, '');
      clone.position = Array.isArray(clone.position) ? clone.position : [0, 0, 0];
      clone.rotation = Array.isArray(clone.rotation) ? clone.rotation : [0, 0, 0];
      clone.targetScale = typeof clone.targetScale === 'number' ? clone.targetScale : 3.2;

      return clone;
    });

    CARS = [...CARS, ...merged];
    console.info(`[DynamicCars] Loaded ${merged.length} dynamic car(s). Total now: ${CARS.length}`);
  } catch (err) {
    console.warn('[DynamicCars] Failed loading cars.json', err);
  }
}