import type * as THREE from 'three';

/** Display-RGB palette, shared by the hero, equipment, citizens and creatures.
 * Keep neutral bones/metal neutral; lift colour separation without gamma brightening. */
export const KOLOR_3D_GLSL = `
vec3 wyrazistyKolor(vec3 rgb) {
  float grey = dot(rgb, vec3(.2126, .7152, .0722));
  return clamp((mix(vec3(grey), rgb, 1.28) - .45) * 1.10 + .45, 0., 1.);
}`;

/** Apply after lighting, matching the atlas post pass. Never mutate authored GLB vertex colours. */
export function wyrazistyMaterial<T extends THREE.Material>(material: T): T {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = KOLOR_3D_GLSL + '\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      'outgoingLight = wyrazistyKolor(outgoingLight);\n#include <opaque_fragment>',
    );
  };
  material.customProgramCacheKey = () => 'wyrazistosc3d-v1';
  return material;
}
