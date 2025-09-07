import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scaleToApproxSize } from '../utils/scaleModel.js';
import { dispose3D } from '../utils/dispose3D.js';

/**
 * CarModel handles lazy loading of a GLTF/GLB car model.
 * It notifies parent when loaded and is disposed on unmount.
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

  useEffect(() => {
    if (!scene) return;
    scene.add(groupRef.current);
    groupRef.current.position.fromArray(car.position);
    groupRef.current.rotation.set(car.rotation[0], car.rotation[1], car.rotation[2]);

    loaderRef.current = new GLTFLoader();
    let cancelled = false;

    loaderRef.current.load(
      car.modelPath,
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
        if (onLoaded) onLoaded(gltf.scene);
      },
      undefined,
      err => {
        console.warn(`[CarModel] Failed to load ${car.modelPath}`, err);
        setLoaded(true);
        // Provide a simple placeholder geometry
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
  }, [scene, car]);

  useEffect(() => {
    // Adjust anisotropy on textures if quality changed
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

  return null; // no React DOM output
}