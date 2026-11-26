import * as THREE from 'three';

const MAT_CACHE = new Map();

function getMat(color) {
  if (!MAT_CACHE.has(color)) {
    MAT_CACHE.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 }));
  }
  return MAT_CACHE.get(color);
}

function sphere(r, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), getMat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), getMat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function createAnimal(type, color) {
  const group = new THREE.Group();
  const bodyColor = color;

  switch (type) {
    case 'hippo': {
      // Low-poly hippo: big round body, tiny ears, wide snout
      const body = sphere(0.42, bodyColor, 0, 0.35, 0);
      body.scale.set(1, 0.85, 1.1);
      group.add(body);
      const snout = sphere(0.28, bodyColor, 0, 0.28, 0.38);
      snout.scale.set(1.2, 0.7, 1);
      group.add(snout);
      const earL = sphere(0.08, bodyColor, -0.28, 0.62, -0.1);
      const earR = sphere(0.08, bodyColor, 0.28, 0.62, -0.1);
      group.add(earL, earR);
      const eyeL = sphere(0.045, '#0f172a', -0.14, 0.48, 0.34);
      const eyeR = sphere(0.045, '#0f172a', 0.14, 0.48, 0.34);
      group.add(eyeL, eyeR);
      const nostrilL = sphere(0.03, '#be185d', -0.1, 0.32, 0.6);
      const nostrilR = sphere(0.03, '#be185d', 0.1, 0.32, 0.6);
      group.add(nostrilL, nostrilR);
      break;
    }
    case 'tiger': {
      // Tiger: orange body, white belly, black stripes, ears
      const body = sphere(0.4, bodyColor, 0, 0.35, 0);
      body.scale.set(1, 0.9, 1.05);
      group.add(body);
      const belly = sphere(0.28, '#fef3c7', 0, 0.25, 0.05);
      belly.scale.set(0.9, 0.7, 0.9);
      group.add(belly);
      const stripe1 = box(0.06, 0.45, 0.7, '#0f172a', 0, 0.45, -0.15);
      const stripe2 = box(0.06, 0.4, 0.6, '#0f172a', 0, 0.35, 0.1);
      group.add(stripe1, stripe2);
      const earL = sphere(0.09, bodyColor, -0.25, 0.65, -0.05);
      const earR = sphere(0.09, bodyColor, 0.25, 0.65, -0.05);
      group.add(earL, earR);
      const eyeL = sphere(0.04, '#0f172a', -0.12, 0.5, 0.32);
      const eyeR = sphere(0.04, '#0f172a', 0.12, 0.5, 0.32);
      group.add(eyeL, eyeR);
      const snout = sphere(0.12, '#fef3c7', 0, 0.35, 0.36);
      group.add(snout);
      break;
    }
    case 'panda': {
      // Panda: white body, black ears/eye patches/legs
      const body = sphere(0.4, '#f8fafc', 0, 0.35, 0);
      body.scale.set(1, 0.9, 1.05);
      group.add(body);
      const earL = sphere(0.1, '#0f172a', -0.26, 0.65, -0.05);
      const earR = sphere(0.1, '#0f172a', 0.26, 0.65, -0.05);
      group.add(earL, earR);
      const patchL = sphere(0.11, '#0f172a', -0.14, 0.48, 0.3);
      patchL.scale.set(1, 0.8, 0.5);
      const patchR = sphere(0.11, '#0f172a', 0.14, 0.48, 0.3);
      patchR.scale.set(1, 0.8, 0.5);
      group.add(patchL, patchR);
      const eyeL = sphere(0.035, '#f8fafc', -0.14, 0.5, 0.35);
      const eyeR = sphere(0.035, '#f8fafc', 0.14, 0.5, 0.35);
      group.add(eyeL, eyeR);
      const legL = sphere(0.11, '#0f172a', -0.22, 0.08, 0.1);
      const legR = sphere(0.11, '#0f172a', 0.22, 0.08, 0.1);
      group.add(legL, legR);
      break;
    }
    case 'frog': {
      // Frog: green body, big eyes on top
      const body = sphere(0.38, bodyColor, 0, 0.3, 0);
      body.scale.set(1.1, 0.85, 1.05);
      group.add(body);
      const eyeWhiteL = sphere(0.14, '#f8fafc', -0.16, 0.58, 0.18);
      const eyeWhiteR = sphere(0.14, '#f8fafc', 0.16, 0.58, 0.18);
      group.add(eyeWhiteL, eyeWhiteR);
      const eyeL = sphere(0.07, '#0f172a', -0.16, 0.6, 0.28);
      const eyeR = sphere(0.07, '#0f172a', 0.16, 0.6, 0.28);
      group.add(eyeL, eyeR);
      const mouth = box(0.25, 0.04, 0.08, '#14532d', 0, 0.28, 0.36);
      group.add(mouth);
      break;
    }
    case 'monkey': {
      // Monkey: brown body, round ears, lighter face
      const body = sphere(0.4, bodyColor, 0, 0.35, 0);
      body.scale.set(1, 0.9, 1.05);
      group.add(body);
      const face = sphere(0.2, '#fde68a', 0, 0.4, 0.25);
      group.add(face);
      const earL = sphere(0.1, bodyColor, -0.3, 0.45, 0);
      const earR = sphere(0.1, bodyColor, 0.3, 0.45, 0);
      group.add(earL, earR);
      const eyeL = sphere(0.04, '#0f172a', -0.09, 0.48, 0.42);
      const eyeR = sphere(0.04, '#0f172a', 0.09, 0.48, 0.42);
      group.add(eyeL, eyeR);
      break;
    }
    case 'koala': {
      // Koala: grey body, big fluffy ears, black nose
      const body = sphere(0.4, bodyColor, 0, 0.35, 0);
      body.scale.set(1, 0.9, 1.05);
      group.add(body);
      const earL = sphere(0.16, bodyColor, -0.32, 0.58, -0.05);
      earL.scale.set(0.7, 1, 0.5);
      const earR = sphere(0.16, bodyColor, 0.32, 0.58, -0.05);
      earR.scale.set(0.7, 1, 0.5);
      group.add(earL, earR);
      const innerEarL = sphere(0.08, '#e2e8f0', -0.32, 0.58, 0.02);
      const innerEarR = sphere(0.08, '#e2e8f0', 0.32, 0.58, 0.02);
      group.add(innerEarL, innerEarR);
      const nose = sphere(0.08, '#0f172a', 0, 0.38, 0.4);
      nose.scale.set(1, 0.7, 1);
      group.add(nose);
      const eyeL = sphere(0.035, '#0f172a', -0.12, 0.46, 0.36);
      const eyeR = sphere(0.035, '#0f172a', 0.12, 0.46, 0.36);
      group.add(eyeL, eyeR);
      break;
    }
    default: {
      // Fallback sphere creature
      const body = sphere(0.4, bodyColor, 0, 0.35, 0);
      group.add(body);
      const eyeL = sphere(0.04, '#0f172a', -0.12, 0.48, 0.32);
      const eyeR = sphere(0.04, '#0f172a', 0.12, 0.48, 0.32);
      group.add(eyeL, eyeR);
    }
  }

  return group;
}
