// Chapitre 05 — alignement des segments d'un télescope à miroir segmenté (type JWST).
// 18 segments hexagonaux mal orientés renvoient 18 images de la même étoile ; l'alignement
// (ajuster les actionneurs pour faire coïncider les images) les superpose en une seule.
// Paramètres : aligne (bool).
import gsap from 'gsap';
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { creerAlea } from '@/lib/sim/rng';

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [3.2, 2.4, 3.6], cible: [0, 0.9, 0], fov: 42, bloom: { force: 0.9, rayon: 0.4, seuil: 0.6 } });
  const { scene } = studio;
  const F = 2.2; // focale (le détecteur est au foyer, au-dessus du miroir)
  const R = 0.26; // rayon d'un hexagone
  // positions des 18 segments : deux couronnes hexagonales autour d'un trou central
  const centres: T.Vector2[] = [];
  const dir = [0, 1, 2, 3, 4, 5].map((k) => new THREE.Vector2(Math.cos((k * Math.PI) / 3 + Math.PI / 6), Math.sin((k * Math.PI) / 3 + Math.PI / 6)).multiplyScalar(R * Math.sqrt(3) * 1.04));
  for (let anneau = 1; anneau <= 2; anneau++) {
    let p = dir[4].clone().multiplyScalar(anneau);
    for (let cote = 0; cote < 6; cote++)
      for (let k = 0; k < anneau; k++) {
        centres.push(p.clone());
        p = p.add(dir[cote]);
      }
  }
  const alea = creerAlea(12);
  const erreurs = centres.map(() => new THREE.Vector2((alea() - 0.5) * 0.09, (alea() - 0.5) * 0.09));
  const etat = { a: 0 }; // 0 = désaligné, 1 = aligné
  const geoHex = new THREE.CylinderGeometry(R * 0.98, R * 0.98, 0.04, 6);
  const matOr = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.22, emissive: 0x2a1c05 });
  const segments = centres.map((c) => {
    const m = new THREE.Mesh(geoHex, matOr);
    m.rotation.y = Math.PI / 6;
    scene.add(m);
    return m;
  });
  // détecteur au foyer
  const detecteur = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ color: 0x0b0d10, side: THREE.DoubleSide }));
  detecteur.rotation.x = Math.PI / 2;
  detecteur.position.y = F;
  scene.add(detecteur);
  const bras = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([0, 1, 2].flatMap((k) => {
      const a = (k * 2 * Math.PI) / 3;
      return [new THREE.Vector3(Math.cos(a) * 1.3, 0.1, Math.sin(a) * 1.3), new THREE.Vector3(Math.cos(a) * 0.3, F, Math.sin(a) * 0.3)];
    })),
    new THREE.LineBasicMaterial({ color: 0x3a404a }),
  );
  scene.add(bras);
  const taches = centres.map(() => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c8).multiplyScalar(3), toneMapped: false, side: THREE.DoubleSide }));
    m.rotation.x = Math.PI / 2;
    scene.add(m);
    return m;
  });
  const faisceaux = new Faisceau(THREE, { largeur: 1.2 });
  scene.add(faisceaux.groupe);

  function poser() {
    faisceaux.vider();
    centres.forEach((c, i) => {
      const e = erreurs[i].clone().multiplyScalar(1 - etat.a);
      const z = (c.lengthSq()) / (4 * F); // paraboloïde
      segments[i].position.set(c.x, z, c.y);
      segments[i].rotation.set(e.y - c.y / (2 * F), Math.PI / 6, -e.x + c.x / (2 * F));
      // tache : décalage = 2 F × inclinaison (la réflexion double l'angle)
      const tx = 2 * F * e.x, tz = 2 * F * e.y;
      taches[i].position.set(tx, F - 0.002, tz);
      faisceaux.ajouter([[c.x, z, c.y], [tx, F, tz]], '#fff2c8', { intensite: 0.9, opacite: 0.3, finesse: 6 });
    });
    faisceaux.progression(1);
  }
  poser();
  let tween: gsap.core.Tween | undefined;
  let aligne = !!ctx.params.aligne;
  return {
    maj(p) {
      const v = !!p.aligne;
      if (v === aligne) return;
      aligne = v;
      tween?.kill();
      tween = gsap.to(etat, { a: v ? 1 : 0, duration: v ? 3.2 : 0.8, ease: v ? 'power2.inOut' : 'power1.out', onUpdate: () => { poser(); ctx.demanderRendu(); } });
    },
    frame() {
      studio.rendre();
      return !!tween?.isActive() || !!studio.controles?.autoRotate;
    },
    etat: () => (etat.a > 0.98 ? 'segments alignés : une seule image de l’étoile' : `${centres.length} images de l’étoile sur le détecteur`),
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      faisceaux.redimensionner(l, h);
    },
    detruire() {
      tween?.kill();
      faisceaux.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
