// Chapitre 00 — « Avant l'image, il y a la lumière ».
// Vue en coupe d'un système d'imagerie qui s'assemble : scène → optique → capteur → calcul → image.
// Les rayons du haut de l'arbre sont magenta, ceux du pied sont bleus (convention des slides).
import gsap from 'gsap';
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { Faisceau } from '../rayons';
import { etiquette, textureDessinee } from '../textures';

const MAGENTA = '#ff3fb4';
const BLEU = '#3f8cff';

// Géométrie (unités arbitraires) : axe optique = x.
const X_OBJET = -4.2;
const X_LENTILLE = 0;
const X_CAPTEUR = 1.25;
const X_PUCE = 2.55;
const X_ECRAN = 4.0;
const Z_O = X_LENTILLE - X_OBJET;
const S_I = X_CAPTEUR - X_LENTILLE;
const GRANDISSEMENT = -S_I / Z_O; // image renversée
const RAYON_PUPILLE = 0.5;

const ETAPES = [
  'La scène renvoie la lumière dans toutes les directions',
  'L’optique collecte et redirige les rayons',
  'Le capteur mesure la lumière reçue, pixel par pixel',
  'Le calcul transforme les mesures en information',
  'L’image (renversée sur le capteur) est reconstruite',
];

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, {
    position: [0.2, 2.1, 7.6],
    cible: [0, 0.15, 0],
    fov: 38,
    azimut: Math.PI / 2.6,
    polaire: [0.6, 1.62],
    bloom: { force: 0.55, rayon: 0.35, seuil: 0.82 },
  });
  const { scene } = studio;

  // --- Sol de la table optique : grille fine ---
  const grille = new THREE.GridHelper(14, 56, 0x2a2f37, 0x1a1e24);
  grille.position.y = -1.05;
  scene.add(grille);

  // --- L'arbre (objet) ---
  const arbre = new THREE.Group();
  const tronc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.75, 12),
    new THREE.MeshStandardMaterial({ color: 0x7a5532, roughness: 0.9 }),
  );
  tronc.position.y = -0.62;
  arbre.add(tronc);
  const feuillage = new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.75, flatShading: true });
  for (const [y, r] of [
    [0.0, 0.55],
    [0.5, 0.42],
    [0.88, 0.28],
  ] as const) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), feuillage);
    m.position.y = y;
    arbre.add(m);
  }
  arbre.position.x = X_OBJET;
  scene.add(arbre);
  const HAUT = new THREE.Vector3(X_OBJET, 1.12, 0);
  const PIED = new THREE.Vector3(X_OBJET, -0.98, 0);
  const marqueurs = [HAUT, PIED].map((p, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(i ? BLEU : MAGENTA).multiplyScalar(3), toneMapped: false }),
    );
    m.position.copy(p);
    scene.add(m);
    return m;
  });

  // --- La lentille (biconvexe, verre) ---
  const profil: T.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const y = (i / 24) * RAYON_PUPILLE * 1.15;
    const epaisseur = 0.13 * (1 - (y / (RAYON_PUPILLE * 1.15)) ** 2) + 0.012;
    profil.push(new THREE.Vector2(epaisseur, y));
  }
  const demi = new THREE.LatheGeometry(profil, 48);
  const verre = new THREE.MeshStandardMaterial({
    color: 0xa9cbff,
    emissive: new THREE.Color(0x1c3352),
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lentille = new THREE.Group();
  const l1 = new THREE.Mesh(demi, verre);
  l1.rotation.z = -Math.PI / 2;
  const l2 = new THREE.Mesh(demi, verre);
  l2.rotation.z = Math.PI / 2;
  lentille.add(l1, l2);
  const monture = new THREE.Mesh(
    new THREE.TorusGeometry(RAYON_PUPILLE * 1.17, 0.025, 12, 64),
    new THREE.MeshStandardMaterial({ color: 0x5a6270, emissive: 0x24384f, metalness: 0.6, roughness: 0.35 }),
  );
  monture.rotation.y = Math.PI / 2;
  lentille.add(monture);
  lentille.position.x = X_LENTILLE;
  scene.add(lentille);

  // --- Le capteur : matrice de pixels Bayer ---
  const N = 14;
  const pas = 0.085;
  const pixelGeo = new THREE.BoxGeometry(0.02, pas * 0.9, pas * 0.9);
  const pixelMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1, toneMapped: true });
  const pixels = new THREE.InstancedMesh(pixelGeo, pixelMat, N * N);
  const bayer = [new THREE.Color(0x8a2a2a), new THREE.Color(0x2f7a3a), new THREE.Color(0x2f4fa0)];
  const couleursBase: T.Color[] = [];
  const mat4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const k = i * N + j;
      mat4.makeTranslation(X_CAPTEUR, (i - (N - 1) / 2) * pas, (j - (N - 1) / 2) * pas);
      pixels.setMatrixAt(k, mat4);
      const c = (i % 2 === 0 ? (j % 2 === 0 ? bayer[0] : bayer[1]) : j % 2 === 0 ? bayer[1] : bayer[2]).clone();
      couleursBase.push(c);
      pixels.setColorAt(k, c.clone().multiplyScalar(0.6));
    }
  scene.add(pixels);
  const support = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, N * pas + 0.12, N * pas + 0.12),
    new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.8 }),
  );
  support.position.x = X_CAPTEUR + 0.035;
  scene.add(support);

  // Pixels éclairés par l'image du haut (magenta) et du pied (bleu).
  const imageHaut = HAUT.y * GRANDISSEMENT;
  const imagePied = PIED.y * GRANDISSEMENT;
  const pixelsAllumes: { k: number; c: T.Color; poids: number }[] = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const y = (i - (N - 1) / 2) * pas;
      const z = (j - (N - 1) / 2) * pas;
      for (const [yi, col] of [
        [imageHaut, MAGENTA],
        [imagePied, BLEU],
      ] as const) {
        const d = Math.hypot(y - yi, z);
        if (d < pas * 1.6) pixelsAllumes.push({ k: i * N + j, c: new THREE.Color(col), poids: 1 - d / (pas * 1.6) });
      }
      // l'image du tronc entre les deux
      if (Math.abs(z) < pas * 0.6 && y < imagePied && y > imageHaut)
        pixelsAllumes.push({ k: i * N + j, c: new THREE.Color(0x9a7a50), poids: 0.5 });
    }

  // --- La puce de calcul (ISP) ---
  const puce = new THREE.Group();
  const boitier = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.1, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.35, metalness: 0.4 }),
  );
  puce.add(boitier);
  const coeur = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.02, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x2a2f37, emissive: new THREE.Color(0x3cffc0), emissiveIntensity: 0 }),
  );
  coeur.position.y = 0.06;
  puce.add(coeur);
  const brocheMat = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
  for (let s = 0; s < 4; s++)
    for (let b = 0; b < 6; b++) {
      const broche = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.09), brocheMat);
      const u = (b - 2.5) * 0.08;
      const a = (s * Math.PI) / 2;
      broche.position.set(Math.cos(a) * 0.31 - Math.sin(a) * u, -0.02, Math.sin(a) * 0.31 + Math.cos(a) * u);
      broche.rotation.y = -a;
      puce.add(broche);
    }
  puce.position.set(X_PUCE, -0.35, 0);
  puce.rotation.x = 0.0;
  scene.add(puce);

  // --- L'écran de sortie : image reconstruite (droite) ---
  const texImage = textureDessinee(THREE, 512, 384, (c, l, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7fb2e6');
    g.addColorStop(0.7, '#d9e6ef');
    g.addColorStop(0.7, '#6f9a52');
    g.addColorStop(1, '#4c7440');
    c.fillStyle = g;
    c.fillRect(0, 0, l, h);
    c.fillStyle = '#7a5532';
    c.fillRect(l / 2 - 10, h * 0.55, 20, h * 0.25);
    c.fillStyle = '#3f8f4e';
    for (const [y, r] of [
      [0.52, 72],
      [0.36, 56],
      [0.24, 38],
    ])
      (c.beginPath(), c.arc(l / 2, h * y, r, 0, Math.PI * 2), c.fill());
    c.fillStyle = '#fff6c8';
    c.beginPath();
    c.arc(l * 0.82, h * 0.16, 22, 0, Math.PI * 2);
    c.fill();
  });
  const ecranMat = new THREE.MeshBasicMaterial({ map: texImage, transparent: true, opacity: 0, color: 0xb8b8b8 });
  const ecran = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), ecranMat);
  ecran.position.set(X_ECRAN, 0.25, 0);
  ecran.rotation.y = -Math.PI / 2 + 0.35;
  scene.add(ecran);
  const cadreEcran = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.98, 1.28),
    new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.6 }),
  );
  cadreEcran.position.copy(ecran.position);
  cadreEcran.rotation.y = ecran.rotation.y + Math.PI / 2;
  cadreEcran.position.x += 0.025;
  scene.add(cadreEcran);

  // --- Étiquettes au sol ---
  const etiquettes: T.Mesh[] = [];
  for (const [x, t, s] of [
    [X_OBJET, 'Scène', 'la lumière'],
    [X_LENTILLE, 'Optique', 'collecter'],
    [X_CAPTEUR, 'Capteur', 'mesurer'],
    [X_PUCE, 'Calcul', 'interpréter'],
    [X_ECRAN, 'Image', 'l’information'],
  ] as const) {
    const { mesh } = etiquette(THREE, t, { sous: s, taille: 0.2 });
    mesh.rotation.x = -0.35;
    mesh.position.set(x, -0.93, 0.95);
    (mesh.material as T.MeshBasicMaterial).opacity = 0;
    scene.add(mesh);
    etiquettes.push(mesh);
  }

  // --- Rayons : objet → lentille → image (lentille mince idéale) ---
  const rayons = new Faisceau(THREE, { largeur: 2.0 });
  scene.add(rayons.groupe);
  const echantillonsPupille: [number, number][] = [];
  for (let a = 0; a < 7; a++) {
    const th = (a / 7) * Math.PI * 2;
    echantillonsPupille.push([Math.cos(th) * RAYON_PUPILLE * 0.92, Math.sin(th) * RAYON_PUPILLE * 0.92]);
  }
  echantillonsPupille.push([0, 0], [0, RAYON_PUPILLE * 0.5], [0, -RAYON_PUPILLE * 0.5]);
  for (const [P, couleur] of [
    [HAUT, MAGENTA],
    [PIED, BLEU],
  ] as const) {
    const image = [X_CAPTEUR, P.y * GRANDISSEMENT, 0] as [number, number, number];
    for (const [py, pz] of echantillonsPupille)
      rayons.ajouter(
        [
          [P.x, P.y, P.z],
          [X_LENTILLE, py, pz],
          image,
        ],
        couleur,
        { intensite: 1.7 },
      );
  }
  // Rayons « perdus » : la scène éclaire dans toutes les directions, la plupart ratent la lentille.
  const perdus = new Faisceau(THREE, { largeur: 1.2 });
  scene.add(perdus.groupe);
  for (let i = 0; i < 16; i++) {
    const th = (i / 16) * Math.PI * 2 + 0.2;
    const d = new THREE.Vector3(Math.cos(th) * 0.9 + 0.4, Math.sin(th), Math.sin(th * 2.3) * 0.6).normalize();
    for (const [P, c] of [
      [HAUT, MAGENTA],
      [PIED, BLEU],
    ] as const) {
      const q = P.clone().addScaledVector(d, 1.3);
      perdus.ajouter([P.toArray() as [number, number, number], q.toArray() as [number, number, number]], c, {
        intensite: 0.7,
        opacite: 0.18,
        finesse: 20,
      });
    }
  }
  // Données : capteur → puce → écran.
  const donnees = new Faisceau(THREE, { largeur: 1.6 });
  scene.add(donnees.groupe);
  for (let k = -2; k <= 2; k++) {
    const z = k * 0.12;
    donnees.ajouter(
      [
        [X_CAPTEUR + 0.06, -0.62, z],
        [X_CAPTEUR + 0.6, -0.62, z],
        [X_PUCE - 0.3, -0.36, z * 0.5],
      ],
      '#3cffc0',
      { intensite: 1.6, finesse: 40 },
    );
  }
  donnees.ajouter(
    [
      [X_PUCE + 0.3, -0.36, 0],
      [X_ECRAN - 0.5, -0.36, 0],
      [X_ECRAN - 0.05, -0.15, 0],
    ],
    '#3cffc0',
    { intensite: 1.6, finesse: 40 },
  );

  // --- Chronologie (GSAP, pilotée par le temps de la scène) ---
  const etat = { arbre: 0, perdus: 0, rayons: 0, capteur: 0, donnees: 0, puce: 0, ecran: 0 };
  const tl = gsap.timeline({ paused: true });
  tl.to(etat, { arbre: 1, duration: 0.8, ease: 'power2.out' }, 0)
    .to(etat, { perdus: 1, duration: 1.2, ease: 'power1.out' }, 0.5)
    .to(etat, { rayons: 1, duration: 2.0, ease: 'power1.inOut' }, 1.1)
    .to(etat, { capteur: 1, duration: 0.7, ease: 'power2.out' }, 2.9)
    .to(etat, { donnees: 1, duration: 1.1, ease: 'power1.inOut' }, 3.5)
    .to(etat, { puce: 1, duration: 0.6, ease: 'power2.out' }, 4.0)
    .to(etat, { ecran: 1, duration: 0.9, ease: 'power2.out' }, 4.6);
  const DUREE = tl.duration();

  const couleur = new THREE.Color();
  function appliquer() {
    arbre.scale.setScalar(0.6 + 0.4 * etat.arbre);
    arbre.visible = etat.arbre > 0.01;
    for (const m of marqueurs) m.visible = etat.arbre > 0.5;
    perdus.progression(etat.perdus);
    rayons.progression(etat.rayons);
    for (let k = 0; k < N * N; k++) pixels.setColorAt(k, couleur.copy(couleursBase[k]).multiplyScalar(0.6));
    for (const p of pixelsAllumes) {
      pixels.getColorAt(p.k, couleur);
      couleur.lerp(p.c.clone().multiplyScalar(2.2), p.poids * etat.capteur);
      pixels.setColorAt(p.k, couleur);
    }
    pixels.instanceColor!.needsUpdate = true;
    donnees.progression(etat.donnees);
    (coeur.material as T.MeshStandardMaterial).emissiveIntensity = 2.2 * etat.puce;
    ecranMat.opacity = etat.ecran;
    const seuils = [etat.arbre, etat.rayons, etat.capteur, etat.puce, etat.ecran];
    etiquettes.forEach((e, i) => ((e.material as T.MeshBasicMaterial).opacity = 0.85 * seuils[i]));
  }

  let t0: number | null = null;
  let tCourant = 0;
  let rejouer = (ctx.params.rejouer as number) ?? 0;

  return {
    maj(p) {
      if ((p.rejouer as number) !== rejouer) {
        rejouer = p.rejouer as number;
        t0 = null;
      }
    },
    frame(t) {
      if (t0 === null) t0 = t;
      tCourant = Math.min(DUREE, t - t0);
      tl.time(tCourant);
      appliquer();
      studio.rendre();
      return tCourant < DUREE || !!studio.controles?.autoRotate;
    },
    redimensionner(l, h) {
      studio.redimensionner(l, h);
      for (const f of [rayons, perdus, donnees]) f.redimensionner(l, h);
    },
    etat() {
      const i = tCourant < 1.1 ? 0 : tCourant < 2.9 ? 1 : tCourant < 3.5 ? 2 : tCourant < 4.6 ? 3 : 4;
      return `${i + 1}/5 · ${ETAPES[i]}`;
    },
    detruire() {
      tl.kill();
      rayons.detruire();
      perdus.detruire();
      donnees.detruire();
      studio.detruire();
    },
  };
};
export default fabrique;
