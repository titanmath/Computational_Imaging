// Chapitre 07 — paysage de perte 3D et descente de gradient : une bille suit x_{k+1} = x_k − η ∇L(x_k).
// Paramètres : fonction ('convexe' | 'vallee' | 'multiple'), eta, depart (compteur pour relancer), x0, y0.
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { feu } from '@/lib/sim/colormaps';

type Fn = 'convexe' | 'vallee' | 'multiple';
const PERTES: Record<Fn, (x: number, y: number) => number> = {
  convexe: (x, y) => 0.5 * (x * x + y * y),
  vallee: (x, y) => 0.5 * (0.15 * x * x + 3 * y * y),
  multiple: (x, y) =>
    0.08 * (x * x + y * y) -
    1.1 * Math.exp(-((x - 1.4) ** 2 + (y - 0.8) ** 2) / 0.6) -
    0.75 * Math.exp(-((x + 1.3) ** 2 + (y + 1.1) ** 2) / 0.5) -
    0.55 * Math.exp(-((x + 0.9) ** 2 + (y - 1.6) ** 2) / 0.35) + 1.2,
};

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [6.4, 6.0, 7.2], cible: [0, 0.9, 0], fov: 36, polaire: [0.3, 1.25], bloom: { force: 0.6, rayon: 0.35, seuil: 0.8 }, autoRotation: 0.35 });
  const { scene } = studio;
  const R = 3; // domaine [−R, R]²
  const E = 0.9; // échelle verticale
  let p = { fonction: 'multiple' as Fn, eta: 0.25, depart: 0, x0: 2.4, y0: -2.2, ...ctx.params } as { fonction: Fn; eta: number; depart: number; x0: number; y0: number };

  let surface: T.Mesh | undefined;
  let fil: T.LineSegments | undefined;
  function construireSurface() {
    if (surface) {
      scene.remove(surface);
      surface.geometry.dispose();
    }
    if (fil) {
      scene.remove(fil);
      fil.geometry.dispose();
    }
    const L = PERTES[p.fonction];
    const n = 120;
    const geo = new THREE.PlaneGeometry(2 * R, 2 * R, n, n);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as T.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    let mn = Infinity, mx = -Infinity;
    const vals: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = L(pos.getX(i), pos.getZ(i));
      vals.push(v);
      mn = Math.min(mn, v);
      mx = Math.max(mx, v);
    }
    for (let i = 0; i < pos.count; i++) {
      const v = Math.min(3, vals[i]);
      pos.setY(i, v * E);
      const [r, g, b] = feu(0.12 + 0.85 * (1 - (vals[i] - mn) / Math.max(1e-6, Math.min(3, mx) - mn)));
      col.set([r / 255, g / 255, b / 255], 3 * i);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide }));
    scene.add(surface);
    fil = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.PlaneGeometry(2 * R, 2 * R, 24, 24)), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
    // le filet suit la surface
    const pf = fil.geometry.attributes.position as T.BufferAttribute;
    for (let i = 0; i < pf.count; i++) {
      const x = pf.getX(i), z = -pf.getY(i);
      pf.setXYZ(i, x, Math.min(3, L(x, z)) * E + 0.01, z);
    }
    scene.add(fil);
  }

  const bille = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x3cffc0, emissiveIntensity: 0.9, roughness: 0.3 }));
  scene.add(bille);
  const trace = new Faisceau(THREE, { largeur: 2.4 });
  scene.add(trace.groupe);
  let chemin: [number, number][] = [];
  let etape = 0;
  let dernier = 0;

  function gradient(x: number, y: number): [number, number] {
    const L = PERTES[p.fonction], h = 1e-4;
    return [(L(x + h, y) - L(x - h, y)) / (2 * h), (L(x, y + h) - L(x, y - h)) / (2 * h)];
  }
  function relancer() {
    chemin = [[p.x0, p.y0]];
    let [x, y] = [p.x0, p.y0];
    for (let k = 0; k < 60; k++) {
      const [gx, gy] = gradient(x, y);
      x = Math.max(-R, Math.min(R, x - p.eta * gx));
      y = Math.max(-R, Math.min(R, y - p.eta * gy));
      chemin.push([x, y]);
    }
    etape = 0;
    dessinerTrace();
  }
  function dessinerTrace() {
    trace.vider();
    const L = PERTES[p.fonction];
    const pts = chemin.slice(0, etape + 1).map(([x, y]) => [x, Math.min(3, L(x, y)) * E + 0.06, y] as [number, number, number]);
    if (pts.length > 1) trace.ajouter(pts, '#3cffc0', { intensite: 1.6, finesse: Math.max(8, pts.length * 6) });
    trace.progression(1);
    const [x, y] = chemin[etape];
    bille.position.set(x, Math.min(3, L(x, y)) * E + 0.11, y);
  }
  construireSurface();
  relancer();

  return {
    maj(np) {
      const avant = { ...p };
      p = { ...p, ...(np as typeof p) };
      if (avant.fonction !== p.fonction) construireSurface();
      if (avant.fonction !== p.fonction || avant.eta !== p.eta || avant.depart !== p.depart || avant.x0 !== p.x0 || avant.y0 !== p.y0) relancer();
    },
    frame(t) {
      if (etape < chemin.length - 1 && t - dernier > 0.12) {
        dernier = t;
        etape++;
        dessinerTrace();
      }
      studio.rendre();
      return true;
    },
    etat() {
      const [x, y] = chemin[etape];
      return `itération ${etape} · L = ${PERTES[p.fonction](x, y).toFixed(3)}`;
    },
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      trace.redimensionner(l, h);
    },
    detruire() {
      trace.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
