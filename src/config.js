// Global configuration and static car registry.
// IMPORTANT: Do NOT start asset paths with a leading slash when deploying to GitHub
// project pages. We will prefix import.meta.env.BASE_URL at runtime.

export const ENABLE_HDR = true;           // Gracefully ignored if env.hdr missing
export const ENABLE_OUTLINE = true;
export const ENABLE_SHADOWS = true;

export const DIAGNOSTICS_LOGS = true;
export const DYNAMIC_CAR_JSON_PATH = 'cars.json'; // relative; resolved with BASE_URL later

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

// IMPORTANT: modelPath values have NO leading slash now.
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
  if (!DIAGNOSTICS_LOGS) return fn && fn();
  console.groupCollapsed(`[Diag] ${label}`);
  try {
    fn && fn();
  } finally {
    console.groupEnd();
  }
}

export async function loadDynamicCars() {
  try {
    const base = (typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/');
    const url = new URL(DYNAMIC_CAR_JSON_PATH, window.location.origin + base).toString();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[DynamicCars] No cars.json found or unreachable.', res.status);
      return;
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.cars)) {
      console.warn('[DynamicCars] Invalid cars.json format (missing cars array).');
      return;
    }
    const existingIds = new Set(CARS.map(c => c.id));
    const merged = json.cars.map(c => {
      if (!c.id) c.id = `dyn-${Math.random().toString(36).slice(2)}`;
      if (existingIds.has(c.id)) {
        const original = c.id;
        let i = 1;
        while (existingIds.has(`${c.id}-${i}`)) i++;
        c.id = `${c.id}-${i}`;
        console.warn(`[DynamicCars] ID collision for ${original}, renamed to ${c.id}`);
      }
      existingIds.add(c.id);
      return {
        ...c,
        // Strip leading slash if user put one
        modelPath: (c.modelPath || '').replace(/^\//,''),
        position: Array.isArray(c.position) ? c.position : [0,0,0],
        rotation: Array.isArray(c.rotation) ? c.rotation : [0,0,0],
        targetScale: typeof c.targetScale === 'number' ? c.targetScale : 3.2
      };
    });
    CARS = [...CARS, ...merged];
    console.info(`[DynamicCars] Loaded ${merged.length} dynamic car(s). Total: ${CARS.length}`);
  } catch (e) {
    console.warn('[DynamicCars] Failed to load cars.json', e);
  }
}