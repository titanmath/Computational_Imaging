// Chapitre 01 — banc d'aberrations en tracé de rayons exact (loi de Snell sur des dioptres sphériques).
// Paramètres : type ('spherique' | 'coma' | 'chromatique'), decalage (mm, capteur / foyer paraxial).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { BANC, foyerParaxial, rayonsBanc, type Aberration } from '@/lib/optique/banc';
import { hexSpectral } from '@/lib/sim/couleur';
import { etiquette } from '../textures';

const U = 0.1; // 1 mm = 0.1 unité de scène

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, {
    position: [3.2, 3.4, 9.5],
    cible: [3.5, 0, 0],
    fov: 34,
    bloom: { force: 0.6, rayon: 0.35, seuil: 0.75 },
    azimut: Math.PI / 2.4,
  });
  const { scene } = studio;
  const grille = new THREE.GridHelper(20, 40, 0x2a2f37, 0x1a1e24);
  grille.position.set(3.5, -2.6, 0);
  scene.add(grille);
  const axe = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-8, 0, 0), new THREE.Vector3(14, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0x3a404a, dashSize: 0.15, gapSize: 0.12 }),
  );
  axe.computeLineDistances();
  scene.add(axe);

  // --- Lentille : profil exact des deux calottes ---
  function profilLentille(): T.Vector2[] {
    const pts: T.Vector2[] = [];
    const n = 32;
    const { R1, R2, e, demi } = BANC;
    for (let i = 0; i <= n; i++) {
      const r = (demi * i) / n;
      pts.push(new THREE.Vector2(r * U, (R1 - Math.sqrt(R1 * R1 - r * r)) * U));
    }
    for (let i = n; i >= 0; i--) {
      const r = (demi * i) / n;
      pts.push(new THREE.Vector2(r * U, (e + R2 + Math.sqrt(R2 * R2 - r * r)) * U));
    }
    return pts;
  }
  const geo = new THREE.LatheGeometry(profilLentille(), 72);
  const verre = new THREE.MeshStandardMaterial({
    color: 0xa9cbff,
    emissive: 0x16283e,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lentille = new THREE.Mesh(geo, verre);
  lentille.rotation.z = -Math.PI / 2; // l'axe de révolution (y) devient l'axe optique (x)
  scene.add(lentille);
  const bord = new THREE.Mesh(
    new THREE.TorusGeometry(BANC.demi * U, 0.02, 8, 72),
    new THREE.MeshStandardMaterial({ color: 0x8aa6cf, emissive: 0x1f3550 }),
  );
  bord.rotation.y = Math.PI / 2;
  bord.position.x = (BANC.e / 2) * U;
  scene.add(bord);

  // --- Capteur ---
  const capteur = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6, 13, 13),
    new THREE.MeshBasicMaterial({ color: 0x9fb4d6, wireframe: true, transparent: true, opacity: 0.18 }),
  );
  capteur.rotation.y = Math.PI / 2;
  scene.add(capteur);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ color: 0x0e1116, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  );
  plaque.rotation.y = Math.PI / 2;
  scene.add(plaque);
  const { mesh: lblCapteur } = etiquette(THREE, 'Capteur', { taille: 0.16 });
  scene.add(lblCapteur);

  const rayons = new Faisceau(THREE, { largeur: 1.8 });
  scene.add(rayons.groupe);
  const reperes = new THREE.Group();
  scene.add(reperes);

  let p = { type: 'spherique' as Aberration, decalage: 0, ...ctx.params } as { type: Aberration; decalage: number };
  let debut: number | null = null;

  function construire() {
    rayons.vider();
    reperes.clear();
    const chrom = p.type === 'chromatique';
    const F = foyerParaxial(chrom);
    const xC = F + p.decalage;
    capteur.position.x = plaque.position.x = xC * U;
    lblCapteur.position.set(xC * U, -1.55, 0);
    const champ = p.type === 'coma' ? 9 : 0;
    const centreY = p.type === 'coma' ? Math.tan((champ * Math.PI) / 180) * F * U : 0;
    capteur.position.y = plaque.position.y = centreY;
    // Rayons visibles : éventail méridien + quelques rayons obliques (effet 3D)
    const liste = [
      ...rayonsBanc(p.type, xC + (p.decalage < 0 ? 18 : 6), { meridien: true, anneaux: 7 }),
      ...rayonsBanc(p.type, xC + 6, { anneaux: 2, secteurs: 8 }).filter((r) => r.rho > 0.9),
    ];
    for (const r of liste) {
      const couleur = chrom ? hexSpectral(r.lambda) : new THREE.Color().lerpColors(new THREE.Color(0x3f8cff), new THREE.Color(0xff3fb4), r.rho).getStyle();
      const pts = r.points.map((q) => [q[0] * U, q[1] * U, q[2] * U] as [number, number, number]);
      rayons.ajouter(pts, couleur, { intensite: 1.9, finesse: 120 });
    }
    // repère du foyer paraxial
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.position.set(F * U, centreY, 0);
    reperes.add(m);
    const { mesh } = etiquette(THREE, 'Foyer paraxial', { taille: 0.11 });
    mesh.position.set(F * U, 0.32 + centreY, 0);
    reperes.add(mesh);
    debut = null;
  }
  construire();

  return {
    maj(np) {
      const ancien = { ...p };
      p = { ...p, ...(np as typeof p) };
      if (ancien.type !== p.type || ancien.decalage !== p.decalage) construire();
    },
    frame(t) {
      if (debut === null) debut = t;
      const prog = Math.min(1, (t - debut) / 1.1);
      rayons.progression(1 - Math.pow(1 - prog, 2));
      lblCapteur.quaternion.copy(studio.camera.quaternion);
      for (const c of reperes.children) if ((c as T.Mesh).geometry?.type === 'PlaneGeometry') c.quaternion.copy(studio.camera.quaternion);
      studio.rendre();
      return prog < 1;
    },
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      rayons.redimensionner(l, h);
    },
    detruire() {
      rayons.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
