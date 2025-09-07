#!/usr/bin/env node
/**
 * Minimal health check for required directories & placeholder assets.
 * Exits non-zero if critical items missing.
 */
const fs = require('fs');
const path = require('path');

const requiredDirs = [
  'public',
  'public/assets',
  'public/assets/models',
  'public/assets/textures',
  'public/assets/icons',
  'src',
  'src/components',
  'src/data',
  'src/utils'
];

const requiredFiles = [
  'package.json',
  'vite.config.js',
  'src/main.jsx',
  'src/App.jsx',
  'src/config.js',
  'src/data/carDetails.js',
  'src/components/FPSCameraController.js',
  'src/components/ParkingLot.jsx',
  'src/components/CarModel.jsx',
  'src/components/CarInfoPanel.jsx',
  'src/components/HUD.jsx',
  'src/components/NavigationControls.jsx',
  'src/components/ErrorBoundary.jsx',
  'src/components/QualityToggle.jsx',
  'src/components/InstructionsOverlay.jsx',
  'src/utils/scaleModel.js',
  'src/utils/dispose3D.js'
];

let failed = false;

for (const d of requiredDirs) {
  if (!fs.existsSync(path.resolve(d))) {
    console.error('[diagnostics] Missing directory:', d);
    failed = true;
  }
}

for (const f of requiredFiles) {
  if (!fs.existsSync(path.resolve(f))) {
    console.error('[diagnostics] Missing file:', f);
    failed = true;
  }
}

if (!failed) {
  console.log('[diagnostics] All required directories/files present.');
  process.exit(0);
} else {
  console.error('[diagnostics] One or more required items missing.');
  process.exit(3);
}