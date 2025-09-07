import * as THREE from 'three';

/**
 * Uniformly scale model so its largest dimension = targetMaxDimension.
 * Repositions so base sits at y=0.
 * Returns applied scale factor (number).
 */
export function scaleToApproxSize(object3D, targetMaxDimension = 3.4) {
  if (!object3D) return 1;
  const box = new THREE.Box3().setFromObject(object3D);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return 1;
  const scale = targetMaxDimension / maxDim;
  object3D.scale.setScalar(scale);

  // Recompute to adjust vertical offset
  box.setFromObject(object3D);
  const minY = box.min.y;
  object3D.position.y -= minY; // move base to y=0

  return scale;
}