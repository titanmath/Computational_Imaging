// Chapitre 08 — pourquoi L1 rend parcimonieux. Une contrainte linéaire n·x = 1 (un plan dans ℝ³) ;
// on fait grossir la « boule » {‖x‖_p ≤ r} jusqu'au premier contact avec le plan : ce point est la solution
// de min ‖x‖_p sous n·x = 1. La sphère L2 touche n'importe où (aucune composante nulle) ; l'octaèdre L1 et
// l'étoile p = 0,5 touchent par un sommet, posé sur un axe : deux composantes sur trois sont nulles.
// Paramètres : p (0.5 | 1 | 2), azimut et elevation de la normale (degrés), rejouer (compteur).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { etiquette } from '../textures';
import { Faisceau } from '../rayons';

type P = { p: number; azimut: number; elevation: number; rejouer: number };

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [-1.9, 2.5, 4.9], cible: [0.35, 0.3, 0.3], fov: 36, bloom: { force: 0.55, rayon: 0.4, seuil: 0.75 }, autoRotation: 0.4 });
  const { scene, camera } = studio;
  let p: P = { p: 1, azimut: 35, elevation: 32, rejouer: 0, ...(ctx.params as Partial<P>) };

  // axes x₁, x₂, x₃ (three : x, y, z)
  const etiq: T.Mesh[] = [];
  for (const [v, nom] of [
    [[1, 0, 0], 'x₁'],
    [[0, 1, 0], 'x₂'],
    [[0, 0, 1], 'x₃'],
  ] as const) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...v).multiplyScalar(-1.6), new THREE.Vector3(...v).multiplyScalar(1.6)]);
    scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x7d8696 })));
    const { mesh } = etiquette(THREE, nom, { taille: 0.17 });
    mesh.position.set(v[0] * 1.72, v[1] * 1.72, v[2] * 1.72);
    scene.add(mesh);
    etiq.push(mesh);
  }

  // boule unité ‖v‖_p = 1, obtenue en normalisant les sommets d'une sphère très subdivisée
  let boule: T.Mesh | undefined;
  let aretes: T.LineSegments | undefined;
  const matBoule = new THREE.MeshStandardMaterial({ color: 0x5b8cff, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.72, emissive: 0x10204a });
  function construireBoule() {
    if (boule) {
      scene.remove(boule);
      boule.geometry.dispose();
    }
    if (aretes) {
      scene.remove(aretes);
      aretes.geometry.dispose();
    }
    const geo = new THREE.SphereGeometry(1, 160, 120);
    const pos = geo.attributes.position as T.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = Math.pow(Math.abs(x) ** p.p + Math.abs(y) ** p.p + Math.abs(z) ** p.p, 1 / p.p);
      pos.setXYZ(i, x / n, y / n, z / n);
    }
    geo.computeVertexNormals();
    boule = new THREE.Mesh(geo, matBoule);
    scene.add(boule);
    // arêtes de l'octaèdre / de l'étoile (méridiens dans les plans des axes) pour lire la forme
    const pts: number[] = [];
    const plans: [number, number][] = [
      [0, 1],
      [1, 2],
      [0, 2],
    ];
    for (const [a, b] of plans)
      for (let k = 0; k < 200; k++) {
        for (const kk of [k, k + 1]) {
          const th = (kk / 200) * 2 * Math.PI;
          const v = [0, 0, 0];
          v[a] = Math.cos(th);
          v[b] = Math.sin(th);
          const n = Math.pow(Math.abs(v[a]) ** p.p + Math.abs(v[b]) ** p.p, 1 / p.p);
          pts.push(v[0] / n, v[1] / n, v[2] / n);
        }
      }
    const ga = new THREE.BufferGeometry();
    ga.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    aretes = new THREE.LineSegments(ga, new THREE.LineBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.55 }));
    scene.add(aretes);
  }

  // plan de contrainte n·x = 1 : carré 3,2 × 3,2 avec grille
  const plan = new THREE.Group();
  const carre = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.8),
    new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }),
  );
  plan.add(carre);
  const grille = new THREE.GridHelper(2.8, 14, 0xffb35c, 0xffb35c);
  grille.rotation.x = Math.PI / 2;
  (grille.material as T.LineBasicMaterial).transparent = true;
  (grille.material as T.LineBasicMaterial).opacity = 0.2;
  plan.add(grille);
  scene.add(plan);
  const { mesh: lblPlan } = etiquette(THREE, 'contrainte', { taille: 0.1, couleur: '#ffc98a', sous: 'n · x = 1' });
  scene.add(lblPlan);

  const contact = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 0.6), toneMapped: false }));
  scene.add(contact);
  const rayon = new Faisceau(THREE, { largeur: 2 });
  scene.add(rayon.groupe);

  let n = new THREE.Vector3();
  let xStar = new THREE.Vector3();
  let rStar = 1;
  let debut = -1;
  function calculer() {
    const az = (p.azimut * Math.PI) / 180, el = (p.elevation * Math.PI) / 180;
    // normale du plan (composantes toutes non nulles en général)
    n = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    const nn = [n.x, n.y, n.z];
    if (p.p >= 2) {
      xStar = n.clone(); // c n / ‖n‖², ici ‖n‖ = 1 et c = 1
      rStar = 1;
    } else {
      // p ≤ 1 : le minimum est sur l'axe où |n_k| est le plus grand
      let k = 0;
      for (let i = 1; i < 3; i++) if (Math.abs(nn[i]) > Math.abs(nn[k])) k = i;
      const v = [0, 0, 0];
      v[k] = 1 / nn[k];
      xStar = new THREE.Vector3(...v);
      rStar = Math.abs(v[k]);
    }
    plan.position.copy(n);
    plan.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    // étiquette à un coin du plan
    const coin = new THREE.Vector3(1.15, 1.15, 0).applyQuaternion(plan.quaternion).add(n);
    lblPlan.position.copy(coin);
    debut = -1;
  }
  construireBoule();
  calculer();

  const ease = (u: number) => 1 - Math.pow(1 - u, 3);
  let derniere = 0;

  return {
    maj(np) {
      const avant = { ...p };
      p = { ...p, ...(np as Partial<P>) };
      if (avant.p !== p.p) construireBoule();
      if (avant.p !== p.p || avant.azimut !== p.azimut || avant.elevation !== p.elevation || avant.rejouer !== p.rejouer) calculer();
    },
    frame(t) {
      if (debut < 0) debut = t;
      const u = Math.min(1, (t - debut) / 2.6);
      const r = rStar * ease(u);
      boule!.scale.setScalar(Math.max(1e-3, r));
      aretes!.scale.setScalar(Math.max(1e-3, r));
      const touche = u >= 1;
      contact.visible = touche;
      contact.position.copy(xStar);
      if (touche && derniere < 1) {
        rayon.vider();
        rayon.ajouter([[0, 0, 0], [xStar.x, xStar.y, xStar.z]], '#ffd27a', { intensite: 2.2 });
        rayon.progression(1);
      } else if (!touche) rayon.vider();
      derniere = u;
      matBoule.emissive.setHex(touche ? 0x1f3a7a : 0x10204a);
      for (const e of [...etiq, lblPlan]) e.quaternion.copy(camera.quaternion);
      studio.rendre();
      return true;
    },
    etat() {
      const c = [xStar.x, xStar.y, xStar.z];
      const nuls = c.filter((v) => Math.abs(v) < 1e-9).length;
      const f = (v: number) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(2).replace('.', ','));
      return `x* = (${c.map(f).join(' ; ')}) · ${nuls === 0 ? 'aucune composante nulle' : nuls === 1 ? '1 composante nulle' : `${nuls} composantes nulles sur 3`}`;
    },
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      rayon.redimensionner(l, h);
    },
    detruire() {
      rayon.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
