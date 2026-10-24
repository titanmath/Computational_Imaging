// Chapitre 04 — conflit vergence-accommodation dans un casque stéréo : les yeux convergent sur l'objet
// virtuel (lignes vertes), mais doivent accommoder sur l'écran (cônes orange). Paramètres : virtuel (m), ecran (m).
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { etiquette } from '../textures';

const E = 0.8; // 1 m = 0,8 unité ; écart interpupillaire 64 mm
const DEMI_EIP = 0.032 * E * 4; // exagéré ×4 pour la lisibilité

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, { position: [2.6, 1.8, 1.4], cible: [0, 0, -1.2], fov: 40, bloom: { force: 0.5, rayon: 0.3, seuil: 0.75 } });
  const { scene } = studio;
  const grille = new THREE.GridHelper(8, 32, 0x2a2f37, 0x1a1e24);
  grille.position.y = -0.5;
  scene.add(grille);
  const matOeil = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.4 });
  const yeux = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), matOeil);
    const pupille = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshBasicMaterial({ color: 0x223344 }));
    pupille.position.z = -0.061;
    pupille.rotation.y = Math.PI;
    g.add(globe, pupille);
    g.position.set(s * DEMI_EIP, 0, 0);
    scene.add(g);
    return g;
  });
  const ecran = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1),
    new THREE.MeshStandardMaterial({ color: 0x1d2128, emissive: 0x0e1520, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  );
  scene.add(ecran);
  const cadre = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.6, 1)), new THREE.LineBasicMaterial({ color: 0x5b6a80 }));
  scene.add(cadre);
  const objet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0x552200, flatShading: true }));
  scene.add(objet);
  const fantomes = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a3c).multiplyScalar(1.5), toneMapped: false }));
    scene.add(m);
    return m;
  });
  const { mesh: lblEcran } = etiquette(THREE, 'Écran (accommodation)', { taille: 0.07 });
  const { mesh: lblObjet } = etiquette(THREE, 'Objet virtuel (vergence)', { taille: 0.07 });
  scene.add(lblEcran, lblObjet);
  const lignes = new Faisceau(THREE, { largeur: 1.8 });
  scene.add(lignes.groupe);
  let p = { virtuel: 0.5, ecran: 2, ...ctx.params } as { virtuel: number; ecran: number };

  function construire() {
    const zE = -p.ecran * E, zV = -p.virtuel * E;
    ecran.position.z = cadre.position.z = zE;
    objet.position.set(0, 0, zV);
    lblEcran.position.set(0.55, 0.6, zE);
    lblObjet.position.set(0, 0.2, zV);
    lignes.vider();
    yeux.forEach((oeil, i) => {
      const o = oeil.position;
      oeil.lookAt(0, 0, zV);
      oeil.rotateY(Math.PI);
      // vergence : axe visuel vers l'objet virtuel, prolongé jusqu'à l'écran
      const t = zE / zV;
      const xEcran = o.x + (0 - o.x) * t;
      lignes.ajouter([[o.x, 0, 0], [0, 0, zV], ...(zV > zE ? [[xEcran, 0, zE] as [number, number, number]] : [])], '#3cffc0', { intensite: 1.6, finesse: 60 });
      // accommodation : cône vers le point affiché sur l'écran (là où l'image de cet œil est dessinée)
      const xAff = o.x + (0 - o.x) * (zE / zV);
      fantomes[i].position.set(xAff, 0, zE + 0.002);
      for (const dy of [-0.025, 0.025]) lignes.ajouter([[o.x, dy, 0], [xAff, 0, zE]], '#ffb347', { intensite: 1.3, opacite: 0.7, finesse: 40 });
    });
  }
  construire();
  return {
    maj(np) {
      p = { ...p, ...(np as typeof p) };
      construire();
    },
    frame() {
      lignes.progression(1);
      lblEcran.quaternion.copy(studio.camera.quaternion);
      lblObjet.quaternion.copy(studio.camera.quaternion);
      studio.rendre();
      return false;
    },
    etat: () => `conflit = |1/${p.virtuel.toFixed(2)} − 1/${p.ecran.toFixed(2)}| = ${Math.abs(1 / p.virtuel - 1 / p.ecran).toFixed(2)} D`,
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      lignes.redimensionner(l, h);
    },
    detruire() {
      lignes.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
