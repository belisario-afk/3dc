import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SRGBColorSpace, ACESFilmicToneMapping } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
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
  const carObjectsRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef();
  const [internalCars, setInternalCars] = useState(CARS);

  // Base path (always ends with /)
  const base = (typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/');

  useEffect(() => {
    loadingManagerRef.current = new THREE.LoadingManager(
      () => { setProgress(100); },
      (url, loaded, total) => {
        setProgress(Math.round((loaded / total) * 100));
      }
    );
  }, []);

  useEffect(() => {
    let active = true;
    loadDynamicCars().then(() => {
      if (active) setInternalCars([...CARS]);
    });
    return () => { active = false; };
  }, []);

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

    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 1.65, 8);

    // Attach for anisotropy (non standard)
    scene.renderer = renderer;

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
      dir.shadow.mapSize.set(QUALITY_PRESETS[quality].shadowMapSize, QUALITY_PRESETS[quality].shadowMapSize);
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

    // Texture loader with base
    const texLoader = new THREE.TextureLoader(loadingManagerRef.current);
    texLoader.load(
      `${base}assets/textures/asphalt_diffuse.jpg`,
      map => {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(40, 40);
        map.anisotropy = renderer.capabilities.getMaxAnisotropy() * QUALITY_PRESETS[quality].anisotropyMultiplier;
        groundMat.map = map;
        groundMat.needsUpdate = true;
      },
      undefined,
      () => {
        console.warn('[ParkingLot] asphalt_diffuse.jpg missing or invalid, fallback color used.');
      }
    );

    // Lines
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

    if (ENABLE_HDR) {
      new RGBELoader(loadingManagerRef.current)
        .load(
          `${base}assets/textures/env.hdr`,
          hdr => {
            hdr.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = hdr;
          },
          undefined,
          err => console.warn('[ParkingLot] HDR environment not available.', err)
        );
    }

    const fps = new FPSCameraController(camera, renderer.domElement);
    scene.add(fps.getObject());

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    let outlinePass = null;
    if (ENABLE_OUTLINE) {
      outlinePass = new OutlinePass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), scene, camera);
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

    const animate = () => {
      const dt = Math.min(clockRef.current.getDelta(), 0.05);
      fps.update(dt, reducedMotion);
      const playerPos = fps.getObject().position;
      for (const record of carObjectsRef.current) {
        if (!record.inScene) {
          const dist = record.position.distanceTo(playerPos);
          if (dist < CAR_LOAD_DISTANCE) {
            scene.add(record.group);
            record.inScene = true;
          }
        }
      }
      if (outlinePass && selectedCarId) {
        const selected = carObjectsRef.current.find(c => c.id === selectedCarId);
        outlinePass.selectedObjects = selected ? [selected.group] : [];
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
      carObjectsRef.current.forEach(c => dispose3D(c.group));
      dispose3D(linesGroup);
      dispose3D(ground);
      renderer.dispose();
      if (scene.environment?.dispose) scene.environment.dispose();
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.material?.dispose?.();
          obj.geometry?.dispose?.();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [quality, reducedMotion, internalCars, selectedCarId]);

  useEffect(() => {
    if (!sceneRef.current) return;
    carObjectsRef.current = [];
    internalCars.forEach(car => {
      const group = new THREE.Group();
      group.position.fromArray(car.position);
      group.rotation.set(car.rotation[0], car.rotation[1], car.rotation[2]);
      carObjectsRef.current.push({
        id: car.id,
        group,
        car,
        position: new THREE.Vector3().fromArray(car.position),
        inScene: false
      });
    });
  }, [internalCars]);

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

  const handleClick = useCallback((e) => {
    if (!sceneRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = - ((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(pointerRef.current, cameraRef.current);

    const pickables = carObjectsRef.current
      .filter(c => c.inScene)
      .map(c => c.group);

    const intersects = raycaster.intersectObjects(pickables, true);
    if (intersects.length > 0) {
      let group = intersects[0].object;
      while (group.parent && !carObjectsRef.current.find(c => c.group === group)) {
        group = group.parent;
      }
      const found = carObjectsRef.current.find(c => c.group === group);
      if (found && onCarSelected) onCarSelected(found.car.id);
    }
  }, [onCarSelected]);

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