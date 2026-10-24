// Chapitre 05 — calibration géométrique avec un damier sous plusieurs poses (à la Zhang).
// La caméra (pyramide) voit 5 poses d'un damier ; sur son plan image, les coins détectés (blancs) et
// les coins reprojetés avec les paramètres courants (couleur) sont reliés par les résidus (orange).
// On optimise ici la focale et k₁ par Gauss-Newton (poses supposées connues, pour la lisibilité).
// Paramètre : relancer (compteur).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { creerAlea, gauss } from '@/lib/sim/rng';

interface Pose {
  R: T.Matrix4;
  t: T.Vector3;
}

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [1.9, 1.05, 1.15], cible: [0, 0, -1.1], fov: 42, bloom: { force: 0.45, rayon: 0.3, seuil: 0.8 } });
  const { scene } = studio;
  const VRAI = { f: 1.0, k1: -0.22 }; // focale normalisée (plan image à z = −f)
  const PLAN = 0.55; // distance d'affichage du plan image

  // Damier : 7 × 5 coins, pas 0,12
  const coins: T.Vector3[] = [];
  for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) coins.push(new THREE.Vector3(i * 0.12, j * 0.12, 0));
  const texDamier = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 192;
    const g = c.getContext('2d')!;
    for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) {
      g.fillStyle = (i + j) % 2 ? '#111' : '#eee';
      g.fillRect(i * 32, j * 32, 32, 32);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const poses: Pose[] = [
    [0, 0, 0, -1.8, 0, 0],
    [0.5, 0.2, 0.1, -2.0, 0.35, 0.2],
    [-0.45, -0.3, -0.15, -2.2, -0.4, -0.1],
    [0.2, -0.55, 0.3, -1.9, 0.1, -0.35],
    [-0.3, 0.5, -0.25, -2.4, -0.2, 0.3],
  ].map(([rx, ry, rz, z, x, y]) => ({
    R: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)),
    t: new THREE.Vector3(x, y, z),
  }));
  const couleursPoses = [0xff6b6b, 0xffc04d, 0x5fd38d, 0x5aa9ff, 0xc77dff];
  poses.forEach((p, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12 * 8, 0.12 * 6), new THREE.MeshStandardMaterial({ map: texDamier, side: THREE.DoubleSide, roughness: 0.8 }));
    m.applyMatrix4(p.R);
    m.position.copy(p.t);
    scene.add(m);
    const cadre = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.12 * 8, 0.12 * 6)), new THREE.LineBasicMaterial({ color: couleursPoses[k] }));
    cadre.applyMatrix4(p.R);
    cadre.position.copy(p.t);
    scene.add(cadre);
  });
  // Caméra : pyramide et plan image
  const pyr = new THREE.Group();
  const s = 0.32;
  const sommets = [new THREE.Vector3(-s, -s * 0.75, -PLAN), new THREE.Vector3(s, -s * 0.75, -PLAN), new THREE.Vector3(s, s * 0.75, -PLAN), new THREE.Vector3(-s, s * 0.75, -PLAN)];
  const aretes: T.Vector3[] = [];
  for (let i = 0; i < 4; i++) aretes.push(new THREE.Vector3(), sommets[i], sommets[i], sommets[(i + 1) % 4]);
  pyr.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(aretes), new THREE.LineBasicMaterial({ color: 0x9fb4d6 })));
  const planImage = new THREE.Mesh(new THREE.PlaneGeometry(2 * s, 1.5 * s), new THREE.MeshBasicMaterial({ color: 0x0b0d10, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  planImage.position.z = -PLAN;
  pyr.add(planImage);
  scene.add(pyr);
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), new THREE.MeshStandardMaterial({ color: 0x2a2f37, metalness: 0.5, roughness: 0.4 }));
  corps.position.z = 0.1;
  scene.add(corps);

  // Projection avec distorsion radiale (coordonnées normalisées)
  const projeter = (f: number, k1: number, P: T.Vector3): [number, number] => {
    const x = P.x / -P.z, y = P.y / -P.z;
    const g = 1 + k1 * (x * x + y * y);
    return [f * x * g, f * y * g];
  };
  const mondes = poses.map((p) => coins.map((c) => c.clone().applyMatrix4(p.R).add(p.t)));
  const alea = creerAlea(4);
  const detectes = mondes.map((pts) => pts.map((P) => projeter(VRAI.f, VRAI.k1, P).map((v) => v + 0.004 * gauss(alea)) as [number, number]));

  // Rendu des points sur le plan image (échelle : coordonnée normalisée → plan affiché)
  const echelle = PLAN; // x_affiché = x_norm × PLAN (même géométrie que la pyramide)
  const geoPt = new THREE.CircleGeometry(0.0085, 12);
  const ptsDetectes = new THREE.InstancedMesh(geoPt, new THREE.MeshBasicMaterial({ color: 0xffffff }), coins.length * poses.length);
  const ptsPredits = new THREE.InstancedMesh(geoPt, new THREE.MeshBasicMaterial({ toneMapped: false }), coins.length * poses.length);
  scene.add(ptsDetectes, ptsPredits);
  const tmp = new THREE.Object3D();
  const couleur = new THREE.Color();
  let k = 0;
  detectes.forEach((liste) =>
    liste.forEach(([x, y]) => {
      tmp.position.set(x * echelle, y * echelle, -PLAN + 0.002);
      tmp.updateMatrix();
      ptsDetectes.setMatrixAt(k++, tmp.matrix);
    }),
  );
  for (let i = 0; i < coins.length * poses.length; i++) ptsPredits.setColorAt(i, couleur.setHex(couleursPoses[Math.floor(i / coins.length)]).multiplyScalar(1.6));

  const residus = new Faisceau(THREE, { largeur: 1.6 });
  scene.add(residus.groupe);
  const vues = new Faisceau(THREE, { largeur: 1 });
  scene.add(vues.groupe);
  mondes.forEach((pts, kk) => {
    for (const P of [pts[0], pts[6], pts[28], pts[34]]) vues.ajouter([[0, 0, 0], P.toArray() as [number, number, number]], couleursPoses[kk], { intensite: 0.9, opacite: 0.35, finesse: 8 });
  });
  vues.progression(1);

  let theta = { f: 0.72, k1: 0.15 };
  let historique: { f: number; k1: number; rms: number }[] = [];
  function rms(f: number, k1: number) {
    let s2 = 0, n = 0;
    mondes.forEach((pts, kk) =>
      pts.forEach((P, i) => {
        const [u, v] = projeter(f, k1, P);
        s2 += (u - detectes[kk][i][0]) ** 2 + (v - detectes[kk][i][1]) ** 2;
        n++;
      }),
    );
    return Math.sqrt(s2 / n);
  }
  function pas() {
    const { f, k1 } = theta;
    let a = 0, b = 0, c = 0, ga = 0, gb = 0;
    mondes.forEach((pts, kk) =>
      pts.forEach((P, i) => {
        const [u, v] = projeter(f, k1, P);
        const [uf, vf] = projeter(f + 1e-5, k1, P);
        const [uk, vk] = projeter(f, k1 + 1e-5, P);
        const r = [u - detectes[kk][i][0], v - detectes[kk][i][1]];
        const jf = [(uf - u) / 1e-5, (vf - v) / 1e-5], jk = [(uk - u) / 1e-5, (vk - v) / 1e-5];
        for (let q = 0; q < 2; q++) {
          a += jf[q] * jf[q];
          b += jf[q] * jk[q];
          c += jk[q] * jk[q];
          ga += jf[q] * r[q];
          gb += jk[q] * r[q];
        }
      }),
    );
    const det = a * c - b * b;
    // pas amorti (Levenberg-Marquardt simplifié) pour une convergence visible
    const amort = 0.55;
    theta = { f: f - (amort * (c * ga - b * gb)) / det, k1: k1 - (amort * (a * gb - b * ga)) / det };
  }
  function dessiner() {
    residus.vider();
    let i = 0;
    mondes.forEach((pts, kk) =>
      pts.forEach((P, j) => {
        const [u, v] = projeter(theta.f, theta.k1, P);
        tmp.position.set(u * echelle, v * echelle, -PLAN + 0.003);
        tmp.updateMatrix();
        ptsPredits.setMatrixAt(i++, tmp.matrix);
        const [du, dv] = detectes[kk][j];
        if (Math.hypot(u - du, v - dv) > 0.002)
          residus.ajouter([[du * echelle, dv * echelle, -PLAN + 0.004], [u * echelle, v * echelle, -PLAN + 0.004]], '#ffb347', { intensite: 1.4, finesse: 2 });
      }),
    );
    residus.progression(1);
    ptsPredits.instanceMatrix.needsUpdate = true;
    if (ptsPredits.instanceColor) ptsPredits.instanceColor.needsUpdate = true;
  }
  function reinitialiser() {
    theta = { f: 0.72, k1: 0.15 };
    historique = [{ ...theta, rms: rms(theta.f, theta.k1) }];
    dessiner();
  }
  reinitialiser();

  let dernier = 0;
  let relance = (ctx.params.relancer as number) ?? 0;
  return {
    maj(p) {
      if ((p.relancer as number) !== relance) {
        relance = p.relancer as number;
        reinitialiser();
      }
    },
    frame(t) {
      if (historique.length < 14 && t - dernier > 0.6) {
        dernier = t;
        pas();
        historique.push({ ...theta, rms: rms(theta.f, theta.k1) });
        dessiner();
      }
      studio.rendre();
      return historique.length < 14 || !!studio.controles?.autoRotate;
    },
    etat() {
      const h = historique[historique.length - 1];
      return `itération ${historique.length - 1} · f = ${h.f.toFixed(3)} (vrai 1,000) · k₁ = ${h.k1.toFixed(3)} (vrai −0,220) · RMS = ${(h.rms * 1000).toFixed(1)} ‰`;
    },
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      residus.redimensionner(l, h);
      vues.redimensionner(l, h);
    },
    detruire() {
      residus.detruire();
      vues.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
