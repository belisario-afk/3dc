/**
 * Dispose Three.js object3D recursively freeing geometries, materials, and textures.
 */
export function dispose3D(object) {
  if (!object) return;
  object.traverse(node => {
    if (node.isMesh) {
      if (node.geometry) {
        node.geometry.dispose?.();
      }
      const disposeMaterial = mat => {
        if (!mat) return;
        for (const key in mat) {
          const value = mat[key];
          if (value && value.isTexture) {
            // Prevent disposing shared textures if needed (basic heuristic)
            value.dispose?.();
          }
        }
        mat.dispose?.();
      };
      if (Array.isArray(node.material)) {
        node.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(node.material);
      }
    }
  });
  if (object.parent) {
    object.parent.remove(object);
  }
}