// Chapitre 02 — coupe 3D de pixels : microlentille, filtre couleur (Bayer), photodiode, puits de charge.
// Des photons (couleur = longueur d'onde) tombent ; le filtre ne laisse passer que sa bande ;
// la photodiode convertit avec une probabilité QE ; les électrons remplissent le puits jusqu'à saturation.
// Paramètres : flux (photons/s par pixel), microlentilles (bool), exposition (compteur de redémarrage).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { etiquette } from '../textures';

const N = 3; // 3 × 3 pixels
const PAS = 1.0;
const PUITS = 40; // électrons affichés au maximum (= capacité du puits, à l'échelle)
const QE = 0.75;
const COULEURS = { R: 0xff4b3e, G: 0x3fd46a, B: 0x4a7dff } as const;
type Canal = keyof typeof COULEURS;

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, {
    position: [4.4, 1.9, 4.9],
    cible: [0, -0.15, 0],
    fov: 38,
    bloom: { force: 0.7, rayon: 0.4, seuil: 0.7 },
    polaire: [0.4, 1.45],
  });
  const { scene } = studio;

  // Bayer RGGB
  const canalDe = (i: number, j: number): Canal => (i % 2 === 0 ? (j % 2 === 0 ? 'R' : 'G') : j % 2 === 0 ? 'G' : 'B');
  const centre = (i: number, j: number) => new THREE.Vector3((i - (N - 1) / 2) * PAS, 0, (j - (N - 1) / 2) * PAS);

  const matSi = new THREE.MeshStandardMaterial({ color: 0x4a5160, roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false });
  const matCircuit = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.8 });
  const matPiste = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.35 });
  const geoLentille = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.6);
  const matLentille = new THREE.MeshStandardMaterial({
    color: 0xcfe2ff,
    emissive: 0x18283c,
    transparent: true,
    opacity: 0.38,
    roughness: 0.05,
    depthWrite: false,
  });

  interface Pixel {
    canal: Canal;
    c: T.Vector3;
    electrons: number;
    puits: T.InstancedMesh;
    lentille: T.Mesh;
    jauge: T.Mesh;
  }
  const pixels: Pixel[] = [];
  const geoE = new THREE.SphereGeometry(0.035, 10, 8);
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const c = centre(i, j);
      const canal = canalDe(i, j);
      // circuit de lecture (bas)
      const circuit = new THREE.Mesh(new THREE.BoxGeometry(PAS * 0.98, 0.35, PAS * 0.98), matCircuit);
      circuit.position.set(c.x, -1.12, c.z);
      scene.add(circuit);
      const piste = new THREE.Mesh(new THREE.BoxGeometry(PAS * 0.98, 0.03, 0.05), matPiste);
      piste.position.set(c.x, -0.93, c.z + 0.38);
      scene.add(piste);
      // silicium + photodiode (zone sensible plus petite : facteur de remplissage)
      const si = new THREE.Mesh(new THREE.BoxGeometry(PAS * 0.98, 0.5, PAS * 0.98), matSi);
      si.position.set(c.x, -0.42, c.z);
      scene.add(si);
      const diode = new THREE.Mesh(
        new THREE.BoxGeometry(PAS * 0.55, 0.06, PAS * 0.55),
        new THREE.MeshStandardMaterial({ color: 0x6c7488, emissive: 0x000000, roughness: 0.4 }),
      );
      diode.position.set(c.x, -0.12, c.z);
      scene.add(diode);
      // puits de charge : cylindre de verre sous la photodiode, rempli d'électrons
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.42, 24, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x8aa6cf, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
      );
      tube.position.set(c.x, -0.48, c.z);
      scene.add(tube);
      const puits = new THREE.InstancedMesh(geoE, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd8ff).multiplyScalar(2.2), toneMapped: false }), PUITS);
      puits.count = 0;
      scene.add(puits);
      const jauge = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.42, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0 }),
      );
      jauge.position.set(c.x + 0.3, -0.48, c.z - 0.3);
      scene.add(jauge);
      // filtre couleur
      const filtre = new THREE.Mesh(
        new THREE.BoxGeometry(PAS * 0.96, 0.14, PAS * 0.96),
        new THREE.MeshStandardMaterial({
          color: COULEURS[canal],
          emissive: COULEURS[canal],
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.75,
          roughness: 0.3,
        }),
      );
      filtre.position.set(c.x, 0.32, c.z);
      scene.add(filtre);
      // microlentille
      const lentille = new THREE.Mesh(geoLentille, matLentille);
      lentille.position.set(c.x, 0.62, c.z);
      lentille.scale.set(0.96, 0.7, 0.96);
      scene.add(lentille);
      pixels.push({ canal, c, electrons: 0, puits, lentille, jauge });
    }

  // Étiquettes (couches)
  const etiq: T.Mesh[] = [];
  for (const [y, t] of [
    [0.78, 'Microlentille'],
    [0.32, 'Filtre couleur'],
    [-0.12, 'Photodiode'],
    [-0.48, 'Puits de charge'],
    [-1.12, 'Lecture'],
  ] as const) {
    const { mesh } = etiquette(THREE, t, { taille: 0.11 });
    mesh.position.set(-((N - 1) / 2) * PAS - 1.05, y, ((N - 1) / 2) * PAS + 0.55);
    scene.add(mesh);
    etiq.push(mesh);
  }

  // --- Photons : particules qui tombent ---
  const MAX = 600;
  const geoP = new THREE.SphereGeometry(0.022, 8, 6);
  const matP = new THREE.MeshBasicMaterial({ toneMapped: false });
  const photons = new THREE.InstancedMesh(geoP, matP, MAX);
  photons.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  photons.count = MAX;
  for (let k = 0; k < MAX; k++) photons.setColorAt(k, new THREE.Color(1, 1, 1));
  scene.add(photons);
  interface Photon {
    vivant: boolean;
    pos: T.Vector3;
    vit: T.Vector3;
    canal: Canal;
    pixel: number;
    etape: 0 | 1 | 2;
    traine: number;
  }
  const ps: Photon[] = Array.from({ length: MAX }, () => ({
    vivant: false,
    pos: new THREE.Vector3(),
    vit: new THREE.Vector3(),
    canal: 'R' as Canal,
    pixel: 0,
    etape: 0 as 0 | 1 | 2,
    traine: 0,
  }));
  const tmp = new THREE.Object3D();
  const couleur = new THREE.Color();
  const canaux: Canal[] = ['R', 'G', 'B'];

  let p = { flux: 30, microlentilles: true, exposition: 0, ...ctx.params } as { flux: number; microlentilles: boolean; exposition: number };
  let cumul = 0;
  let dernierT: number | null = null;
  let saturationAffichee = false;

  function reinitialiser() {
    for (const px of pixels) {
      px.electrons = 0;
      px.puits.count = 0;
      (px.jauge.material as T.MeshBasicMaterial).opacity = 0;
    }
    saturationAffichee = false;
  }

  function emettre() {
    const ph = ps.find((x) => !x.vivant);
    if (!ph) return;
    ph.vivant = true;
    ph.pixel = Math.floor(Math.random() * pixels.length);
    const c = pixels[ph.pixel].c;
    ph.pos.set(c.x + (Math.random() - 0.5) * PAS * 0.95, 2.4, c.z + (Math.random() - 0.5) * PAS * 0.95);
    ph.vit.set(0, -3.2, 0);
    ph.canal = canaux[Math.floor(Math.random() * 3)];
    ph.etape = 0;
  }

  function avancer(dt: number) {
    for (const ph of ps) {
      if (!ph.vivant) continue;
      ph.pos.addScaledVector(ph.vit, dt);
      const px = pixels[ph.pixel];
      // microlentille : courbe la trajectoire vers le centre du pixel
      if (ph.etape === 0 && ph.pos.y < 0.68) {
        ph.etape = 1;
        if (p.microlentilles) {
          const vers = new THREE.Vector3(px.c.x - ph.pos.x, -0.8, px.c.z - ph.pos.z).normalize().multiplyScalar(3.2);
          ph.vit.copy(vers);
        }
      }
      // filtre couleur : absorbe les autres bandes
      if (ph.etape === 1 && ph.pos.y < 0.32) {
        if (ph.canal !== px.canal) {
          ph.vivant = false;
          continue;
        }
        ph.etape = 2;
      }
      // photodiode : seule la zone centrale est sensible (facteur de remplissage)
      if (ph.etape === 2 && ph.pos.y < -0.12) {
        const dedans = Math.abs(ph.pos.x - px.c.x) < PAS * 0.28 && Math.abs(ph.pos.z - px.c.z) < PAS * 0.28;
        ph.vivant = false;
        if (dedans && Math.random() < QE && px.electrons < PUITS) {
          const k = px.electrons++;
          const ang = k * 2.4;
          const rr = 0.09 * Math.sqrt((k % 7) / 7 + 0.2);
          tmp.position.set(px.c.x + rr * Math.cos(ang), -0.67 + (k / PUITS) * 0.38, px.c.z + rr * Math.sin(ang));
          tmp.scale.setScalar(1);
          tmp.updateMatrix();
          px.puits.setMatrixAt(k, tmp.matrix);
          px.puits.count = px.electrons;
          px.puits.instanceMatrix.needsUpdate = true;
          if (px.electrons >= PUITS) (px.jauge.material as T.MeshBasicMaterial).opacity = 0.9;
        }
      }
    }
  }

  function dessinerPhotons() {
    let k = 0;
    for (const ph of ps) {
      if (ph.vivant) {
        tmp.position.copy(ph.pos);
        tmp.scale.set(1, 3.2, 1);
        tmp.updateMatrix();
        photons.setMatrixAt(k, tmp.matrix);
        couleur.setHex(COULEURS[ph.canal]).multiplyScalar(1.25);
        photons.setColorAt(k, couleur);
        k++;
      }
    }
    photons.count = k;
    photons.instanceMatrix.needsUpdate = true;
    if (photons.instanceColor) photons.instanceColor.needsUpdate = true;
  }

  return {
    maj(np) {
      const avant = p.exposition;
      p = { ...p, ...(np as typeof p) };
      for (const px of pixels) px.lentille.visible = p.microlentilles;
      if (p.exposition !== avant) reinitialiser();
    },
    frame(t) {
      const dt = dernierT === null ? 0 : Math.min(0.05, t - dernierT);
      dernierT = t;
      cumul += p.flux * pixels.length * dt * 0.33;
      while (cumul >= 1) {
        emettre();
        cumul -= 1;
      }
      avancer(dt);
      dessinerPhotons();
      for (const e of etiq) e.quaternion.copy(studio.camera.quaternion);
      studio.rendre();
      if (!saturationAffichee && pixels.every((x) => x.electrons >= PUITS)) saturationAffichee = true;
      return true;
    },
    etat() {
      const moy = pixels.reduce((s, x) => s + x.electrons, 0) / pixels.length;
      const sat = pixels.filter((x) => x.electrons >= PUITS).length;
      return `puits rempli à ${Math.round((100 * moy) / PUITS)} %${sat ? ` · ${sat} pixel(s) saturé(s)` : ''}`;
    },
    redimensionner: (l, h) => studio.redimensionner(l, h),
    detruire: () => studio.detruire(),
  };
};
export default fabrique;
