// Chapitre 04 — l'espace XYZ en 3D : cône des couleurs spectrales, plan de chromaticité X+Y+Z = 1,
// et gamut sRGB (le cube RGB transformé par la matrice sRGB → XYZ, un parallélépipède).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { cmf, hexSpectral } from '@/lib/sim/couleur';
import { etiquette } from '../textures';

const RGB_VERS_XYZ = [
  [0.4124, 0.3576, 0.1805],
  [0.2126, 0.7152, 0.0722],
  [0.0193, 0.1192, 0.9505],
];
const S = 1.6; // échelle d'affichage

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [4.4, 3.1, 4.0], cible: [0.6, 0.75, 0.6], fov: 38, bloom: false, autoRotation: 0.6 });
  const { scene } = studio;
  // repère XYZ (Y vers le haut dans three : on place X→x, Y→y, Z→z)
  const axes = new THREE.Group();
  for (const [v, nom] of [
    [[1.25, 0, 0], 'X'],
    [[0, 1.25, 0], 'Y'],
    [[0, 0, 1.25], 'Z'],
  ] as const) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(...v).multiplyScalar(S)]);
    axes.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x8a93a3 })));
    const { mesh } = etiquette(THREE, nom, { taille: 0.12 });
    mesh.position.set(...(v.map((c) => c * S * 1.06) as [number, number, number]));
    axes.add(mesh);
  }
  scene.add(axes);

  // cône spectral : rayons de l'origine vers le locus (normalisé X+Y+Z = 1, prolongé)
  const locus: T.Vector3[] = [];
  const couleurs: number[] = [];
  for (let l = 400; l <= 690; l += 5) {
    const [x, y, z] = cmf(l);
    const s = x + y + z;
    locus.push(new THREE.Vector3(x / s, y / s, z / s).multiplyScalar(S));
    const c = new THREE.Color(hexSpectral(l));
    couleurs.push(c.r, c.g, c.b);
  }
  // surface du cône (triangles origine–λ–λ+1), jusqu'à 1,5× le plan de chromaticité
  const pos: number[] = [];
  const col: number[] = [];
  for (let i = 0; i < locus.length; i++) {
    const a = locus[i].clone().multiplyScalar(1.5), b = locus[(i + 1) % locus.length].clone().multiplyScalar(1.5);
    pos.push(0, 0, 0, a.x, a.y, a.z, b.x, b.y, b.z);
    const ca = couleurs.slice(3 * i, 3 * i + 3), cb = couleurs.slice(3 * ((i + 1) % locus.length), 3 * ((i + 1) % locus.length) + 3);
    col.push(0.1, 0.1, 0.1, ...ca, ...cb);
  }
  const gCone = new THREE.BufferGeometry();
  gCone.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gCone.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(gCone, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
  // locus sur le plan X+Y+Z = 1
  const gLocus = new THREE.BufferGeometry().setFromPoints([...locus, locus[0]]);
  gLocus.setAttribute('color', new THREE.Float32BufferAttribute([...couleurs, couleurs[0], couleurs[1], couleurs[2]], 3));
  scene.add(new THREE.Line(gLocus, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 })));
  // plan de chromaticité
  const plan = new THREE.Mesh(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(S, 0, 0), new THREE.Vector3(0, S, 0), new THREE.Vector3(0, 0, S)]),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
  );
  scene.add(plan);

  // gamut sRGB : cube unité transformé
  const cube = new THREE.BoxGeometry(1, 1, 1, 6, 6, 6);
  cube.translate(0.5, 0.5, 0.5);
  const p = cube.attributes.position as T.BufferAttribute;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const r = p.getX(i), g = p.getY(i), b = p.getZ(i);
    c.set([r, g, b], 3 * i);
    const X = RGB_VERS_XYZ[0][0] * r + RGB_VERS_XYZ[0][1] * g + RGB_VERS_XYZ[0][2] * b;
    const Y = RGB_VERS_XYZ[1][0] * r + RGB_VERS_XYZ[1][1] * g + RGB_VERS_XYZ[1][2] * b;
    const Z = RGB_VERS_XYZ[2][0] * r + RGB_VERS_XYZ[2][1] * g + RGB_VERS_XYZ[2][2] * b;
    p.setXYZ(i, X * S, Y * S, Z * S);
  }
  cube.setAttribute('color', new THREE.BufferAttribute(c, 3));
  cube.computeVertexNormals();
  const gamut = new THREE.Mesh(cube, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));
  scene.add(gamut);
  scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5).applyMatrix4(new THREE.Matrix4().set(
    RGB_VERS_XYZ[0][0] * S, RGB_VERS_XYZ[0][1] * S, RGB_VERS_XYZ[0][2] * S, 0,
    RGB_VERS_XYZ[1][0] * S, RGB_VERS_XYZ[1][1] * S, RGB_VERS_XYZ[1][2] * S, 0,
    RGB_VERS_XYZ[2][0] * S, RGB_VERS_XYZ[2][1] * S, RGB_VERS_XYZ[2][2] * S, 0,
    0, 0, 0, 1,
  ))), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })));

  let vue = (ctx.params.vue as string) ?? 'tout';
  function appliquer() {
    gamut.visible = vue !== 'cone';
  }
  appliquer();
  const etiq = axes.children.filter((o) => (o as T.Mesh).geometry?.type === 'PlaneGeometry');
  return {
    maj(np) {
      vue = (np.vue as string) ?? vue;
      appliquer();
    },
    frame() {
      for (const e of etiq) e.quaternion.copy(studio.camera.quaternion);
      studio.rendre();
      return true;
    },
    redimensionner: (l, h) => studio.redimensionner(l, h),
    detruire: () => studio.detruire(),
  };
};
export default fabrique;
