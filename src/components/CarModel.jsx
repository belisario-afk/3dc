import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scaleToApproxSize } from '../utils/scaleModel.js';
import { dispose3D } from '../utils/dispose3D.js';

/**
 * CarModel loads a GLTF/GLB. modelPath should be relative (no leading slash).
 * We prefix import.meta.env.BASE_URL so it works under GitHub Pages subpath.
 */
export function CarModel({
  car,
  scene,
  onLoaded,
  qualityAnisotropy = 1
}) {
  const groupRef = useRef(new THREE.Group());
  const [loaded, setLoaded] = useState(false);
  const loaderRef = useRef();
  const gltfRef = useRef(null);
  const base = (typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL : '/');

  useEffect(() => {
    if (!scene) return;
    scene.add(groupRef.current);
    groupRef.current.position.fromArray(car.position);
    groupRef.current.rotation.set(car.rotation[0], car.rotation[1], car.rotation[2]);

    loaderRef.current = new GLTFLoader();
    let cancelled = false;

    const resolvedPath = base + car.modelPath.replace(/^\//,'');
    loaderRef.current.load(
      resolvedPath,
      gltf => {
        if (cancelled) return;
        gltfRef.current = gltf.scene;
        try {
          scaleToApproxSize(gltf.scene, car.targetScale || 3.4);
        } catch (e) {
          console.warn('[CarModel] scaling failed', e);
        }
        groupRef.current.add(gltf.scene);
        setLoaded(true);
        onLoaded?.(gltf.scene);
      },
      undefined,
      err => {
        console.warn(`[CarModel] Failed to load ${resolvedPath}`, err);
        setLoaded(true);
        const placeholder = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 0.8, 5),
          new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.3, roughness: 0.6 })
        );
        groupRef.current.add(placeholder);
      }
    );

    return () => {
      cancelled = true;
      if (gltfRef.current) {
        dispose3D(gltfRef.current);
      }
      dispose3D(groupRef.current);
    };
  }, [scene, car, base]);

  useEffect(() => {
    if (!loaded || !gltfRef.current) return;
    const maxAniso = scene?.renderer?.capabilities?.getMaxAnisotropy?.() || 1;
    gltfRef.current.traverse(n => {
      if (n.isMesh && n.material) {
        const arr = Array.isArray(n.material) ? n.material : [n.material];
        arr.forEach(m => {
          if (m.map) m.map.anisotropy = Math.max(1, Math.floor(maxAniso * qualityAnisotropy));
        });
      }
    });
  }, [loaded, qualityAnisotropy, scene]);

  return null;
}