import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SRGBColorSpace, ACESFilmicToneMapping } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

import { FPSCameraController } from './FPSCameraController.js';
import {
  CARS,
  CAR_LOAD_DISTANCE,
  ENABLE_HDR,
  ENABLE_OUTLINE,
  ENABLE_SHADOWS,
  LIGHTING_CONFIG,
  QUALITY_PRESETS,
  loadDynamicCars,
  logGroup
} from '../config.js';
import { dispose3D } from '../utils/dispose3D.js';
import { scaleToApproxSize } from '../utils/scaleModel.js';

export function ParkingLot({
  quality,
  onCarSelected,
  selectedCarId,
  reducedMotion
}) {
  const mountRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const fpsRef = useRef();
  const loadingManagerRef = useRef();
  const [progress, setProgress] = useState(0);
  const composerRef = useRef();
  const outlinePassRef = useRef();
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const carRecordsRef = useRef([]); // [{id, car, group, position, inScene, loaded, gltfScene}]
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef();
  const [internalCars, setInternalCars] = useState(CARS);

  const base = (typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/');

  // Loading manager
  useEffect(() => {
    loadingManagerRef.current = new THREE.LoadingManager(
      () => setProgress(100),
      (url, loaded, total) => {
        setProgress(Math.round((loaded / total) * 100));
      }
    );
  }, []);

  // Dynamic cars
  useEffect(() => {
    let active = true;
    loadDynamicCars().then(() => {
      if (active) setInternalCars([...CARS]);
    });
    return () => { active = false; };
  }, []);

  // Initialize scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = LIGHTING_CONFIG.exposure;
    renderer.shadowMap.enabled = ENABLE_SHADOWS;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.appendChild(renderer.domElement);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e12);
    scene.renderer = renderer; // convenience reference for anisotropy adjustments if needed

    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 1.65, 8);

    // Lights
    const hemi = new THREE.HemisphereLight(
      LIGHTING_CONFIG.hemi.skyColor,
      LIGHTING_CONFIG.hemi.groundColor,
      LIGHTING_CONFIG.hemi.intensity
    );
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, LIGHTING_CONFIG.sun.intensity);
    dir.position.fromArray(LIGHTING_CONFIG.sun.position);
    dir.castShadow = ENABLE_SHADOWS;
    if (ENABLE_SHADOWS) {
      dir.shadow.mapSize.set(
        QUALITY_PRESETS[quality].shadowMapSize,
        QUALITY_PRESETS[quality].shadowMapSize
      );
      dir.shadow.bias = LIGHTING_CONFIG.shadow.bias;
      dir.shadow.normalBias = LIGHTING_CONFIG.shadow.normalBias;
      dir.shadow.camera.near = 1;
      dir.shadow.camera.far = 250;
      dir.shadow.camera.left = -120;
      dir.shadow.camera.right = 120;
      dir.shadow.camera.top = 120;
      dir.shadow.camera.bottom = -120;
    }
    scene.add(dir);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, metalness: 0.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Asphalt texture (optional). If placeholder is invalid it will warn; we ignore.
    const texLoader = new THREE.TextureLoader(loadingManagerRef.current);
    texLoader.load(
      `${base}assets/textures/asphalt_diffuse.jpg`,
      map => {
        try {
            map.wrapS = map.wrapT = THREE.RepeatWrapping;
            map.repeat.set(40, 40);
            map.anisotropy = renderer.capabilities.getMaxAnisotropy() * QUALITY_PRESETS[quality].anisotropyMultiplier;
            groundMat.map = map;
            groundMat.needsUpdate = true;
        } catch (e) {
          console.warn('[GroundTexture] Failed applying map:', e);
        }
      },
      undefined,
      () => console.warn('[GroundTexture] Missing or invalid asphalt_diffuse.jpg (safe to ignore).')
    );

    // Parking lines (merged approach concept — simple multi meshes here)
    const linesGroup = new THREE.Group();
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
    const slotWidth = 3;
    const slotDepth = 6;
    for (let i = -5; i <= 5; i++) {
      const lineGeom = new THREE.PlaneGeometry(slotWidth, 0.06, 1, 1);
      const mesh = new THREE.Mesh(lineGeom, lineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(i * (slotWidth + 1.2), 0.01, -8);
      linesGroup.add(mesh);

      const backLineGeom = new THREE.PlaneGeometry(slotWidth, 0.06, 1, 1);
      const backMesh = new THREE.Mesh(backLineGeom, lineMat);
      backMesh.rotation.x = -Math.PI / 2;
      backMesh.position.set(i * (slotWidth + 1.2), 0.01, -8 - slotDepth);
      linesGroup.add(backMesh);
    }
    scene.add(linesGroup);

    // Optional HDR
    if (ENABLE_HDR) {
      new RGBELoader(loadingManagerRef.current)
        .load(
          `${base}assets/textures/env.hdr`,
          hdr => {
            hdr.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = hdr;
          },
          undefined,
          err => console.warn('[HDR] env.hdr not available (ok).', err)
        );
    }

    // FPS controller
    const fps = new FPSCameraController(camera, renderer.domElement);
    scene.add(fps.getObject());

    // Post FX
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    let outlinePass = null;
    if (ENABLE_OUTLINE) {
      outlinePass = new OutlinePass(
        new THREE.Vector2(mount.clientWidth, mount.clientHeight),
        scene,
        camera
      );
      outlinePass.edgeStrength = QUALITY_PRESETS[quality].outlineEdgeStrength;
      outlinePass.edgeGlow = QUALITY_PRESETS[quality].outlineEdgeGlow;
      outlinePass.edgeThickness = 1;
      outlinePass.visibleEdgeColor.set('#ffd700');
      outlinePass.hiddenEdgeColor.set('#6d5a1a');
      composer.addPass(outlinePass);
    }

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    fpsRef.current = fps;
    composerRef.current = composer;
    outlinePassRef.current = outlinePass;

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Define loader (shared)
    const gltfLoader = new GLTFLoader(loadingManagerRef.current);

    function loadCarModel(record) {
      if (record.loaded) return;
      record.loaded = true;
      const rel = record.car.modelPath.replace(/^\//,'');
      const fullPath = base + rel;
      gltfLoader.load(
        fullPath,
        gltf => {
          try {
            scaleToApproxSize(gltf.scene, record.car.targetScale || 3.4);
          } catch (e) {
            console.warn('[CarLoad] scaling issue for', record.id, e);
          }
          // Shadows for meshes
          gltf.scene.traverse(n => {
            if (n.isMesh) {
              n.castShadow = true;
              n.receiveShadow = true;
            }
          });
          record.gltfScene = gltf.scene;
          record.group.add(gltf.scene);
          console.info(`[CarLoad] Loaded ${record.id} from ${fullPath}`);
        },
        undefined,
        err => {
          console.warn(`[CarLoad] Failed to load ${fullPath}`, err);
          const placeholder = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.8, 5),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.6 })
          );
            record.group.add(placeholder);
        }
      );
    }

    const animate = () => {
      const dt = Math.min(clockRef.current.getDelta(), 0.05);
      fps.update(dt, reducedMotion);

      const playerPos = fps.getObject().position;
      for (const record of carRecordsRef.current) {
        if (!record.inScene) {
          const dist = record.position.distanceTo(playerPos);
          if (dist < CAR_LOAD_DISTANCE) {
            scene.add(record.group);
            record.inScene = true;
            loadCarModel(record);
          }
        }
      }

      if (outlinePass && selectedCarId) {
        const selected = carRecordsRef.current.find(c => c.id === selectedCarId);
        outlinePass.selectedObjects = selected && selected.gltfScene
          ? [selected.group]
          : [];
      }

      composer.render();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    logGroup('Scene Initialized', () => {
      console.log('Base Path:', base);
      console.log('Quality:', quality);
      console.log('Cars (initial):', internalCars.length);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      fps.dispose();
      window.removeEventListener('resize', onResize);
      if (composer) composer.passes.length = 0;
      if (outlinePass) outlinePass.selectedObjects = [];
      carRecordsRef.current.forEach(r => {
        if (r.gltfScene) dispose3D(r.gltfScene);
        dispose3D(r.group);
      });
      dispose3D(ground);
      dispose3D(linesGroup);
      renderer.dispose();
      if (scene.environment?.dispose) scene.environment.dispose();
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.material?.dispose?.();
          obj.geometry?.dispose?.();
        }
      });
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, reducedMotion, internalCars, selectedCarId]);

  // Build records for cars (fresh whenever internalCars changes)
  useEffect(() => {
    carRecordsRef.current = [];
    internalCars.forEach(car => {
      const group = new THREE.Group();
      group.position.fromArray(car.position);
      group.rotation.set(car.rotation[0], car.rotation[1], car.rotation[2]);
      carRecordsRef.current.push({
        id: car.id,
        car,
        group,
        position: new THREE.Vector3().fromArray(car.position),
        inScene: false,
        loaded: false,
        gltfScene: null
      });
    });
  }, [internalCars]);

  // Quality change updates
  useEffect(() => {
    const renderer = rendererRef.current;
    const outlinePass = outlinePassRef.current;
    if (!renderer) return;
    if (ENABLE_SHADOWS) {
      const dirLights = [];
      sceneRef.current?.traverse(o => { if (o.isDirectionalLight) dirLights.push(o); });
      dirLights.forEach(dl => {
        dl.shadow.mapSize.set(
          QUALITY_PRESETS[quality].shadowMapSize,
          QUALITY_PRESETS[quality].shadowMapSize
        );
        dl.shadow.map?.dispose?.();
      });
    }
    if (outlinePass) {
      outlinePass.edgeStrength = QUALITY_PRESETS[quality].outlineEdgeStrength;
      outlinePass.edgeGlow = QUALITY_PRESETS[quality].outlineEdgeGlow;
    }
  }, [quality]);

  // Raycast selection
  const handleClick = useCallback((e) => {
    if (!sceneRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = - ((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);

    const pickables = carRecordsRef.current
      .filter(r => r.inScene)
      .map(r => r.group);

    const intersects = raycasterRef.current.intersectObjects(pickables, true);
    if (intersects.length > 0) {
      let group = intersects[0].object;
      while (group.parent && !carRecordsRef.current.find(c => c.group === group)) {
        group = group.parent;
      }
      const found = carRecordsRef.current.find(c => c.group === group);
      if (found && onCarSelected) onCarSelected(found.car.id);
    }
  }, [onCarSelected]);

  // Pointer lock
  const handlePointerDown = useCallback((e) => {
    if (!rendererRef.current) return;
    if (e.target.closest('.ui-block')) return;
    if (e.button === 0) {
      fpsRef.current?.lock(e);
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.addEventListener('click', handleClick);
    mount.addEventListener('mousedown', handlePointerDown);
    return () => {
      mount.removeEventListener('click', handleClick);
      mount.removeEventListener('mousedown', handlePointerDown);
    };
  }, [handleClick, handlePointerDown]);

  return (
    <div className="parking-lot-canvas-container" ref={mountRef} aria-label="3D scene canvas">
      <div
        className="loading-overlay"
        style={{ opacity: progress < 100 ? 1 : 0, pointerEvents: progress < 100 ? 'auto' : 'none' }}
        aria-live="polite"
      >
        <div className="loading-bar">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loading-text">{progress < 100 ? `Loading ${progress}%` : 'Loaded'}</p>
      </div>
    </div>
  );
}