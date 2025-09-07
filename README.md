# Exotic Car Rental 3D (React + Vite + Three.js)

An immersive first‑person exotic car rental lot walkthrough. Walk around, inspect cars, view rich technical/spec details, and toggle visual quality — all deployable as a static GitHub Pages site (no backend).

## Key Features (Baseline + vNext Enhancements)
- Three.js powered real‑time 3D scene
- FPS camera (pointer lock, WASD, Shift sprint, acceleration + damping, delta clamping)
- Car selection via raycasting with outline highlight
- Lazy car model loading (distance-gated)
- Rich car detail panels (structured sections: overview, performance, tech, cockpit, quick stats); fallback simple mode
- Booking form (demo only, no backend)
- Luxury themed UI (dark + gold)
- Loading overlay with percent + `aria-live` accessibility
- Quality toggle (High vs Low) affecting shadows, outline strength, anisotropy
- Graceful failures (missing HDR env, missing models, invalid JSON)
- Error Boundary overlay (reload option)
- Diagnostics scripts:
  - `scripts/verify-plugin-react.cjs`: Ensures `@vitejs/plugin-react` present
  - `scripts/diagnostics.cjs`: Checks critical directories/assets placeholders
- Reduced motion support: lowers acceleration smoothing when user prefers reduced motion
- Dynamic car registry (optional `public/cars.json`)
- Centralized model scaling utility
- Explicit disposal of GLTF scenes, geometries, materials, textures, PMREM
- Future-ready hooks for post‑processing expansion
- Accessibility improvements (focus trap, aria attributes, escape to close, instruction overlay first visit)

## Project Structure
```
exotic-car-rental-3d/
  public/
    assets/
      models/ (GLTF placeholders)
      textures/ (asphalt, env placeholders)
      icons/
    favicon.ico
    cars.json (optional)
  src/
    components/
    data/
    utils/
    App.jsx
    main.jsx
    styles.css
    config.js
  scripts/
  vite.config.js
  package.json
  README.md
  LICENSE
```

## Getting Started

### 1. Install
```bash
npm install
```

### 2. Development
```bash
npm run dev
```
Open the shown local URL.

### 3. Diagnostics (Before Build)
```bash
npm run verify
npm run diagnostics
```

### 4. Build
```bash
npm run build
```
Outputs `dist/`.

### 5. Deploy to GitHub Pages

Two common approaches:

#### A. Automated (gh-pages branch)
1. Ensure `vite.config.js` `base` is `/<repo-name>/` (e.g. `/exotic-car-rental-3d/`).
2. Run:
   ```bash
   npm run deploy
   ```
3. Enable GH Pages in repository settings pointing to `gh-pages` branch.

#### B. Manual
1. `npm run build`
2. Commit and push `dist/` to `gh-pages` branch manually.
3. Set GH Pages source to that branch.

### 6. Verify Production
Open `https://<user>.github.io/<repo-name>/`  
Check:
- No `/src/main.jsx` script in final HTML
- Car selection works
- Outline toggles with quality
- Missing env HDR → only console **warning**, no crash

## Configuration (src/config.js)
Feature flags & parameters:
- `ENABLE_HDR`, `ENABLE_OUTLINE`, `ENABLE_SHADOWS`
- `DIAGNOSTICS_LOGS` toggle grouped console output
- Camera tuning (acceleration, damping, sprint multiplier)
- Lighting (exposure, shadow size high/low)

## Adding Cars

### Static (Hardcoded)
Add to `CARS` in `config.js`:
```js
{
  id: 'apollo',
  name: 'Apollo IE',
  modelPath: '/assets/models/placeholder-car.gltf',
  position: [10,0,5],
  rotation: [0, Math.PI/2, 0],
  detailsKey: 'apollo',
  targetScale: 3.2
}
```

### Dynamic (cars.json)
Create `public/cars.json`:
```json
{
  "cars": [
    {
      "id": "veneno",
      "name": "Lamborghini Veneno",
      "modelPath": "/assets/models/placeholder-car.gltf",
      "position": [18,0,-4],
      "rotation": [0, 1.2, 0],
      "detailsKey": "veneno"
    }
  ]
}
```
On load:
- Merged with static list
- ID collisions resolved by suffixing `-dyn`

### Rich Details
Add structured metadata in `src/data/carDetails.js`:
```js
CAR_DETAILS.veneno = {
  overview: "...",
  performance: {...},
  quickStats: {...}
};
```

## Quality Toggle
High:
- Shadow map size (2048)
- Outline edgeStrength (default higher)
- Anisotropy (renderer.capabilities.getMaxAnisotropy())

Low:
- Shadow map size (1024)
- Reduced outline edgeStrength
- Anisotropy = 1

## Accessibility
- `aria-live="polite"` for loading progress
- Escape closes panels
- Focus trap for active info panel
- Instruction overlay first visit (`localStorage` flag)
- Reduced motion uses gentler acceleration & damping

## Performance Tips
| Concern | Action |
|--------|--------|
| Shadow performance | Switch to Low quality toggle |
| Too many cars | Increase distance gating radius threshold |
| Outline cost | Disable `ENABLE_OUTLINE` in `config.js` |
| Texture bandwidth | Replace placeholders with power-of-two compressed textures |
| Frame spikes | Ensure no heavy synchronous code in animation loop |

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Wrong `base` in Vite config | 404 on assets in GH Pages | Adjust `base` to `/<repo>/` |
| Missing `@vitejs/plugin-react` | JSX build failure | Run `npm run verify` |
| Direct `/src/main.jsx` in build | Production 404 on script | Ensure only dev index uses that path |
| Deprecated `outputEncoding` usage | Console warnings | Using `renderer.outputColorSpace = SRGBColorSpace` |
| Non-disposed GLTF | Memory growth | Confirm disposal logs on unmount |

## Feature Flags
In `config.js`:
- `ENABLE_HDR`
- `ENABLE_SHADOWS`
- `ENABLE_OUTLINE`
- `DIAGNOSTICS_LOGS`

## Reduced Motion
If `prefers-reduced-motion: reduce`:
- Acceleration & damping lowered
- Minor smoothing adjustments

## Post‑Processing Extension Hook
`ParkingLot.jsx` includes commented block where future effects (Bloom, SSAO) can be inserted without altering core render loop logic significantly.

## Disposal & Scaling
- `scaleToApproxSize(object, target)` unifies scaling logic
- `dispose3D(object)` deeply disposes geometry, material(s), textures
- PMREM & composer disposed on unmount

## Simulating Error Boundary
Add a dev-only test button in `HUD` (already commented) to throw an error to confirm fallback overlay.

## Changelog

### vNext (This Release)
- Added ErrorBoundary overlay
- Added Quality Toggle (High/Low)
- Added dynamic car registry (`cars.json`)
- Added reduced motion handling
- Added diagnostics & verify scripts
- Added focus trap & accessibility enhancements
- Added scaling & disposal utilities
- Added instructions overlay
- Added graceful HDR + model missing handling improvements
- Added structured logging flag

## Testing / Validation Checklist
Run the following before publishing:
1. `npm run verify` → Pass (plugin exists)
2. `npm run diagnostics` → Pass (all required dirs)
3. `npm run build` → Inspect `dist/index.html` (no `/src/main.jsx`)
4. Serve build (`npm run preview`) → Works with pointer lock
5. Delete/rename `public/assets/textures/env.hdr` → No crash, warning only
6. Delete one model file → Car loads placeholder panel with warning
7. Toggle quality → Outline & shadow changes visible
8. Open site first time → Instructions overlay appears; localStorage suppresses next time
9. Simulate error (uncomment dev throw button) → ErrorBoundary overlay displays reload

## Deployment Troubleshooting
| Issue | Cause | Resolution |
|-------|-------|-----------|
| Blank page on GH Pages | `base` mismatch | Set correct `base` in vite config |
| Assets 404 in sub-path | Incorrect relative references | Use leading `/` only for root, rely on Vite asset management |
| Outline not visible | `ENABLE_OUTLINE` false or quality low | Enable or raise quality |
| Performance poor mobile | High quality + heavy models | Set Low quality & compress models |

## License
[MIT](./LICENSE)

---

Enjoy refining your virtual luxury lot. Contributions welcome (add new cars, effects, accessibility improvements). See comments in code for extension hooks.