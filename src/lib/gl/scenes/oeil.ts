// Chapitre 04 — l'œil, système optique adaptatif : cornée, cristallin qui s'accommode, rétine.
// Tracé de rayons exact dans un œil schématique. Paramètres : distance (m), accommodation (D),
// type ('emmetrope' | 'myope' | 'hypermetrope'), corriger (bool).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { etiquette } from '../textures';
import { correction, DIOPTRIES_PAR_UNITE, LONGUEUR, lunette, surfacesOeil, type TypeOeil } from '@/lib/optique/oeil';
import { tracer, type V3 } from '@/lib/optique/trace';

const U = 0.1; // 1 mm = 0,1 unité

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [1.2, 1.6, 5.4], cible: [0.4, 0, 0], fov: 38, bloom: { force: 0.55, rayon: 0.35, seuil: 0.75 } });
  const { scene } = studio;

  // Globe oculaire (sclérotique translucide, ouverte côté caméra)
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(12 * U, 48, 32, 0, Math.PI * 2, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xe9e4da, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  scene.add(globe);
  const retine = new THREE.Mesh(
    new THREE.SphereGeometry(11.9 * U, 48, 24, -Math.PI / 2, Math.PI, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xb44a3e, emissive: 0x3a0e0a, roughness: 0.8, side: THREE.BackSide, transparent: true, opacity: 0.55 }),
  );
  retine.rotation.z = 0;
  scene.add(retine);
  const fovea = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  scene.add(fovea);

  // Cornée
  const cornee = new THREE.Mesh(
    new THREE.SphereGeometry(7.8 * U, 32, 16, 0, Math.PI * 2, 0, 0.82),
    new THREE.MeshStandardMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, emissive: 0x10202f }),
  );
  scene.add(cornee);
  // Iris
  const iris = new THREE.Mesh(new THREE.RingGeometry(2.1 * U, 5.8 * U, 48), new THREE.MeshStandardMaterial({ color: 0x4f7a9a, side: THREE.DoubleSide, roughness: 0.7 }));
  iris.rotation.y = Math.PI / 2;
  iris.position.x = 3.4 * U;
  scene.add(iris);

  let cristallin: T.Mesh | undefined;
  let lunetteMesh: T.Mesh | undefined;
  const matCristallin = new THREE.MeshStandardMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.45, depthWrite: false, emissive: 0x2a2010, side: THREE.DoubleSide });
  const matLunette = new THREE.MeshStandardMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, emissive: 0x0e1a28 });

  function lentilleDe(R1: number, R2: number, x1: number, x2: number, demi: number, mat: T.Material) {
    const pts: T.Vector2[] = [];
    const n = 28;
    const sag = (R: number, r: number) => (isFinite(R) ? Math.sign(R) * (Math.abs(R) - Math.sqrt(Math.max(0, R * R - r * r))) : 0);
    for (let i = 0; i <= n; i++) {
      const r = (demi * i) / n;
      pts.push(new THREE.Vector2(r * U, (x1 + sag(R1, r)) * U));
    }
    for (let i = n; i >= 0; i--) {
      const r = (demi * i) / n;
      pts.push(new THREE.Vector2(r * U, (x2 + sag(R2, r)) * U));
    }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat);
    m.rotation.z = -Math.PI / 2;
    return m;
  }

  const rayons = new Faisceau(THREE, { largeur: 1.8 });
  scene.add(rayons.groupe);
  const { mesh: lblObjet } = etiquette(THREE, 'Objet', { taille: 0.09 });
  scene.add(lblObjet);
  const objet = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3fb4).multiplyScalar(2.5), toneMapped: false }));
  scene.add(objet);
  const tache = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7ad0).multiplyScalar(1.6), transparent: true, opacity: 0.9, toneMapped: false, side: THREE.DoubleSide }));
  tache.rotation.y = Math.PI / 2;
  scene.add(tache);

  let p = { distance: 6, accommodation: 0, type: 'emmetrope' as TypeOeil, corriger: false, ...ctx.params } as { distance: number; accommodation: number; type: TypeOeil; corriger: boolean };
  let diametreTache = 0;
  let debut: number | null = null;

  function construire() {
    const L = LONGUEUR[p.type];
    const acc = p.accommodation / DIOPTRIES_PAR_UNITE;
    const surf = surfacesOeil(acc);
    // globe et rétine suivent la longueur axiale
    const c = (L / 2) * U;
    globe.position.x = c;
    globe.scale.set(L / 24, 1, 1);
    retine.position.x = c;
    retine.scale.set(L / 24, 1, 1);
    fovea.position.set((L - 0.05) * U, 0, 0);
    fovea.rotation.y = -Math.PI / 2;
    cornee.position.x = 7.8 * U;
    cornee.rotation.z = Math.PI / 2;
    if (cristallin) {
      scene.remove(cristallin);
      cristallin.geometry.dispose();
    }
    cristallin = lentilleDe(surf[1].R, surf[2].R, surf[1].x, surf[2].x, 4.3, matCristallin);
    scene.add(cristallin);
    // lunette de correction
    const P = p.corriger && p.type !== 'emmetrope' ? correction(L) : 0;
    const lun = lunette(P);
    if (lunetteMesh) {
      scene.remove(lunetteMesh);
      lunetteMesh.geometry.dispose();
      lunetteMesh = undefined;
    }
    if (lun.length) {
      lunetteMesh = lentilleDe(lun[0].R, lun[1].R, lun[0].x, lun[1].x, 9, matLunette);
      scene.add(lunetteMesh);
    }
    // rayons depuis l'objet
    rayons.vider();
    const dmm = p.distance * 1000;
    const departX = -Math.min(dmm, 60);
    const toutes = [...lun, ...surf];
    const impacts: number[] = [];
    for (let k = -4; k <= 4; k++) {
      const yP = (k / 4) * 1.9; // hauteur visée dans la pupille
      const dir: V3 = [dmm, yP, 0];
      const n = Math.hypot(...dir);
      const d: V3 = [dir[0] / n, dir[1] / n, 0];
      const t0 = (departX + dmm) / d[0];
      const o: V3 = [-dmm + d[0] * t0, d[1] * t0, 0];
      const pts = tracer(o, d, toutes, L);
      if (!pts) continue;
      impacts.push(pts[pts.length - 1][1]);
      rayons.ajouter(pts.map((q) => [q[0] * U, q[1] * U, q[2] * U] as [number, number, number]), '#ff3fb4', { intensite: 1.8, finesse: 140 });
    }
    diametreTache = impacts.length ? Math.max(...impacts) - Math.min(...impacts) : 0;
    tache.position.set((L - 0.1) * U, 0, 0);
    tache.scale.setScalar(Math.max(0.03, (diametreTache / 2) * U));
    objet.position.set(departX * U, 0, 0);
    lblObjet.position.set(departX * U, 0.22, 0);
    debut = null;
  }
  construire();

  return {
    maj(np) {
      p = { ...p, ...(np as typeof p) };
      construire();
    },
    frame(t) {
      if (debut === null) debut = t;
      const prog = Math.min(1, (t - debut) / 0.9);
      rayons.progression(prog);
      lblObjet.quaternion.copy(studio.camera.quaternion);
      studio.rendre();
      return prog < 1;
    },
    etat: () => `tache sur la rétine : ${diametreTache.toFixed(2)} mm${diametreTache < 0.05 ? ' · net' : ''}`,
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
