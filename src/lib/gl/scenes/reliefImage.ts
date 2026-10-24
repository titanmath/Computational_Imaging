// Chapitre 08 — l'image comme un relief : chaque pixel est une altitude. Le bruit rend le terrain rugueux ;
// l'a priori l'aplanit pendant l'optimisation, qu'on regarde en direct : L2² arrondit tout (collines molles),
// la TV crée des plateaux (terrasses) en gardant les falaises, L0 ne laisse que quelques plateaux.
// Paramètres : prior ('aucun' | 'l2' | 'tv' | 'l0'), lambda, bruit.
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { feu } from '@/lib/sim/colormaps';
import { l0Lissage, l2Ferme2D, tvDebruitage } from '@/lib/sim/priors';
import { bruiter, H, imageGrise, L } from '@/lib/sim/imageTest';

type Prior = 'aucun' | 'l2' | 'tv' | 'l0';
type P = { prior: Prior; lambda: number; bruit: number };

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [0, 3.9, 3.1], cible: [0, 0, 0.15], fov: 38, bloom: false, autoRotation: 0.25, azimut: Math.PI / 3, polaire: [0.35, 1.3] });
  const { scene } = studio;
  let p: P = { prior: 'tv', lambda: 0.07, bruit: 0.1, ...(ctx.params as Partial<P>) };

  const x = imageGrise();
  const LARG = 4, PROF = 2, HAUT = 0.32;
  // on retourne l'image pour que le haut de l'image soit au fond de la scène
  const geo = new THREE.PlaneGeometry(LARG, PROF, L - 1, H - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as T.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide });
  const terrain = new THREE.Mesh(geo, mat);
  scene.add(terrain);
  // socle
  const socle = new THREE.Mesh(new THREE.BoxGeometry(LARG + 0.08, 0.06, PROF + 0.08), new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.9 }));
  socle.position.y = -0.06;
  scene.add(socle);

  let b = bruiter(x, p.bruit, 21);
  let courant = Float64Array.from(b);
  type Solveur = { pas(): void; x: Float64Array; fini?: boolean };
  let solveur: Solveur | undefined;
  let iterations = 0;
  let maxIter = 0;

  function appliquerHauteurs(v: ArrayLike<number>) {
    // PlaneGeometry : sommets rangés ligne par ligne, du haut (−z après rotation) vers le bas
    for (let j = 0; j < H; j++)
      for (let i = 0; i < L; i++) {
        const k = j * L + i;
        const z = Math.min(1.1, Math.max(-0.1, v[k]));
        pos.setY(k, z * HAUT);
        const [r, g, bb] = feu(0.08 + 0.9 * Math.min(1, Math.max(0, v[k])));
        col[3 * k] = (r / 255) ** 2.2;
        col[3 * k + 1] = (g / 255) ** 2.2;
        col[3 * k + 2] = (bb / 255) ** 2.2;
      }
    pos.needsUpdate = true;
    (geo.attributes.color as T.BufferAttribute).needsUpdate = true;
    geo.computeVertexNormals();
  }

  function relancer() {
    b = bruiter(x, p.bruit, 21);
    courant = Float64Array.from(b);
    iterations = 0;
    solveur = undefined;
    if (p.prior === 'tv') {
      solveur = tvDebruitage(b, L, H, p.lambda, true);
      maxIter = 160;
    } else if (p.prior === 'l0') {
      solveur = l0Lissage(b, L, H, p.lambda);
      maxIter = 40;
    } else if (p.prior === 'l2') {
      // forme fermée : on anime le passage de b à la solution
      const cible = l2Ferme2D(b, L, H, p.lambda);
      let u = 0;
      solveur = {
        x: courant,
        pas() {
          u = Math.min(1, u + 1 / 30);
          const e = 1 - (1 - u) ** 3;
          for (let k = 0; k < courant.length; k++) courant[k] = b[k] + (cible[k] - b[k]) * e;
          if (u >= 1) this.fini = true;
        },
      };
      maxIter = 30;
    }
    appliquerHauteurs(courant);
    pause = 0.6; // laisser voir le terrain bruité avant de lisser
  }
  let pause = 0.6;
  let dernier = 0;
  relancer();

  return {
    maj(np) {
      p = { ...p, ...(np as Partial<P>) };
      relancer();
    },
    frame(t) {
      const dt = Math.min(0.1, t - dernier);
      dernier = t;
      if (pause > 0) pause -= dt;
      else if (solveur && iterations < maxIter && !solveur.fini) {
        const n = p.prior === 'tv' ? 4 : 1;
        for (let k = 0; k < n; k++) solveur.pas();
        iterations += n;
        appliquerHauteurs(solveur.x);
      }
      studio.rendre();
      return true;
    },
    etat() {
      const nom = { aucun: 'aucun a priori : le terrain reste bruité', l2: 'L2²', tv: 'TV isotrope', l0: 'L0' }[p.prior];
      if (p.prior === 'aucun') return nom;
      return `${nom}, λ = ${p.lambda.toFixed(3)} · ${solveur?.fini || iterations >= maxIter ? 'convergé' : `itération ${iterations}`}`;
    },
    redimensionner: (l, h) => studio.redimensionner(l, h),
    detruire: () => studio.detruire(),
  };
};
export default fabrique;
