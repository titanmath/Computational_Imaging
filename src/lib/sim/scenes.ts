// Images de test procédurales (linéaires, [0,1]) : aucune image tierce n'est utilisée.
import { decoderSrgb } from './couleur';
import { creerImg, type Img } from './image';

const lin = (hex: number): [number, number, number] => [
  decoderSrgb(((hex >> 16) & 255) / 255),
  decoderSrgb(((hex >> 8) & 255) / 255),
  decoderSrgb((hex & 255) / 255),
];
const melange = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const lisse = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Paysage illustré : ciel, soleil, collines, maison, arbre, panneau de texte et mire fine.
 * Riche en bords nets, aplats et textures fines : idéal pour montrer flou, bruit, dématriçage…
 */
export function scenePaysage(l = 256, h = 192): Img {
  const im = creerImg(l, h, 3);
  const C = {
    cielHaut: lin(0x6f9fd8),
    cielBas: lin(0xdbe7f0),
    soleil: lin(0xfff3c4),
    colline1: lin(0x6d9a50),
    colline2: lin(0x4e7d3d),
    mur: lin(0xe9dcc3),
    toit: lin(0xb24a32),
    fenetre: lin(0x2d3e57),
    porte: lin(0x6b4228),
    tronc: lin(0x6e4b2c),
    feuille: lin(0x2f7a3a),
    panneau: lin(0xf4f1e8),
    encre: lin(0x1d1d1f),
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const u = x / l;
      const v = y / h;
      let c = melange(C.cielHaut, C.cielBas, v / 0.62);
      // soleil
      const ds = Math.hypot(u - 0.82, (v - 0.16) * (h / l));
      c = melange(c, C.soleil, 1 - lisse(0.045, 0.052, ds));
      // collines
      const y1 = 0.6 + 0.05 * Math.sin(u * 7 + 1) + 0.03 * Math.sin(u * 17);
      if (v > y1) c = C.colline1.map((k, i) => k * (0.9 + 0.1 * Math.sin(x * 0.9 + y * 1.3)) + 0 * i);
      const y2 = 0.72 + 0.04 * Math.sin(u * 5 + 3);
      if (v > y2) c = C.colline2.map((k) => k * (0.85 + 0.15 * (((x * 7 + y * 13) % 5) / 5)));
      // maison
      const mx0 = 0.12, mx1 = 0.42, my0 = 0.5, my1 = 0.8;
      if (u > mx0 && u < mx1 && v > my0 && v < my1) {
        c = C.mur;
        const fen = (a: number, b: number) => u > a && u < a + 0.065 && v > b && v < b + 0.09;
        if (fen(0.16, 0.56) || fen(0.32, 0.56)) {
          c = C.fenetre;
          if (Math.abs(u - 0.1925) < 0.004 || Math.abs(u - 0.3525) < 0.004 || Math.abs(v - 0.605) < 0.005) c = C.mur;
        }
        if (u > 0.245 && u < 0.3 && v > 0.66) c = C.porte;
        // briques fines
        if (v > 0.69 && v < 0.8 && (u < 0.24 || u > 0.31) && (y % 4 === 0 || ((x + (Math.floor(y / 4) % 2) * 3) % 7 === 0)))
          c = c.map((k) => k * 0.82);
      }
      // toit : triangle de sommet (0.27, 0.34) et de base [0.1, 0.44] à v = 0.5
      if (v <= 0.5 && v > 0.34 + Math.abs(u - 0.27) * (0.16 / 0.17)) c = C.toit;
      // arbre
      if (Math.abs(u - 0.56) < 0.012 && v > 0.56 && v < 0.82) c = C.tronc;
      const da = Math.hypot((u - 0.56) * (l / h), v - 0.48);
      if (da < 0.12) c = C.feuille.map((k) => k * (0.75 + 0.35 * (0.5 + 0.5 * Math.sin(x * 1.7) * Math.cos(y * 1.9))));
      // panneau avec « texte » (bandes fines) et mire de résolution
      if (u > 0.66 && u < 0.95 && v > 0.42 && v < 0.7) {
        c = C.panneau;
        const lx = (u - 0.68) / 0.13;
        const ly = (v - 0.46) / 0.2;
        if (lx > 0 && lx < 1 && ly > 0 && ly < 1) {
          const rang = Math.floor(ly * 5);
          const lettre = Math.floor(lx * 9 + rang * 3.7) % 4;
          if ((ly * 5) % 1 < 0.55 && lettre !== 0 && (Math.floor(lx * 30) % 3) !== 0) c = C.encre;
        }
        // mire : barres de fréquence croissante
        const mx = (u - 0.83) / 0.1;
        const my = (v - 0.46) / 0.2;
        if (mx > 0 && mx < 1 && my > 0 && my < 1) {
          const f = 2 + my * 10;
          c = Math.sin(mx * Math.PI * 2 * f) > 0 ? C.encre : C.panneau;
        }
      }
      if (u > 0.79 && u < 0.81 && v > 0.7 && v < 0.84) c = lin(0x5b5b5b);
      const i = (y * l + x) * 3;
      im.d[i] = c[0];
      im.d[i + 1] = c[1];
      im.d[i + 2] = c[2];
    }
  return im;
}

/** Damier (calibration, distorsion). */
export function damier(l: number, h: number, case_: number): Img {
  const im = creerImg(l, h, 1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) im.d[y * l + x] = (Math.floor(x / case_) + Math.floor(y / case_)) % 2 ? 0.9 : 0.05;
  return im;
}

/**
 * Carte de radiance HDR : intérieur sombre, fenêtre lumineuse, soleil, lampe.
 * Valeurs relatives sur ~16 diaphragmes (le soleil vaut ~4000× le mur le plus sombre).
 */
export function radianceInterieur(l = 256, h = 160): Img {
  const im = creerImg(l, h, 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const u = x / l;
      const v = y / h;
      let c = [0.018, 0.015, 0.012]; // mur intérieur
      c = c.map((k) => k * (0.6 + 0.8 * v)); // dégradé
      if (v > 0.78) c = [0.03, 0.022, 0.015].map((k) => k * (1 + 0.3 * (((x >> 3) + (y >> 3)) % 2))); // parquet
      // fenêtre : ciel extérieur et paysage
      if (u > 0.52 && u < 0.92 && v > 0.12 && v < 0.62) {
        c = [1.6, 2.2, 3.4].map((k) => k * (1.15 - v));
        if (v > 0.45 - 0.05 * Math.sin(u * 20)) c = [0.35, 0.55, 0.22];
        const ds = Math.hypot(u - 0.8, (v - 0.24) * (h / l));
        if (ds < 0.03) c = [60, 55, 42];
        else if (ds < 0.07) c = c.map((k) => k + 6 * (1 - ds / 0.07) ** 2);
        if (Math.abs(u - 0.72) < 0.005 || Math.abs(v - 0.37) < 0.006) c = [0.04, 0.035, 0.03];
      }
      // tableau au mur (détail dans l'ombre)
      if (u > 0.1 && u < 0.32 && v > 0.22 && v < 0.5) {
        const r = Math.hypot(u - 0.21, v - 0.36);
        c = r < 0.06 ? [0.06, 0.012, 0.01] : [0.008, 0.02, 0.035];
      }
      // lampe et son halo
      const dl = Math.hypot(u - 0.4, (v - 0.58) * (h / l));
      if (dl < 0.018) c = [9, 7, 4];
      else c = c.map((k, i) => k + [0.6, 0.45, 0.25][i] * Math.exp(-dl * 30) * 0.25);
      // tache de soleil au sol
      if (v > 0.8 && Math.abs(u - 0.62 - (v - 0.8) * 0.6) < 0.09) c = c.map((k, i) => k + [2.2, 1.9, 1.4][i] * 0.8);
      const i = (y * l + x) * 3;
      im.d[i] = c[0];
      im.d[i + 1] = c[1];
      im.d[i + 2] = c[2];
    }
  return im;
}

/** Signal 1D par morceaux (plateaux, rampe, sinus) : priors de gradient. */
export function signalMorceaux(n = 160): Float32Array {
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if (u < 0.15) s[i] = 0.2;
    else if (u < 0.35) s[i] = 0.72;
    else if (u < 0.6) s[i] = 0.3 + (u - 0.35) * 1.8;
    else s[i] = 0.5 + 0.12 * Math.sin((u - 0.6) * 18);
  }
  return s;
}

/**
 * Panorama cylindrique couvrant 140° horizontalement (colonne ∝ angle) : montagnes,
 * maisons, arbres, un phare au centre. Sert au champ de vision.
 */
export function panorama(l = 1400, h = 280): Img {
  const im = creerImg(l, h, 3);
  const ciel1 = lin(0x5d8fcf), ciel2 = lin(0xe7eef2), mont1 = lin(0x8a9bb5), mont2 = lin(0x5f7d6a);
  const herbe = lin(0x5f8f45), mur = lin(0xeadfc8), toit = lin(0xa9452f), phare = lin(0xf2f0ea), rouge = lin(0xc0392b);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const u = x / l;
      const v = y / h;
      let c = melange(ciel1, ciel2, Math.min(1, v / 0.55));
      const m1 = 0.42 + 0.08 * Math.sin(u * 23 + 1) + 0.05 * Math.sin(u * 61) + 0.02 * Math.sin(u * 140);
      if (v > m1) c = mont1;
      const m2 = 0.55 + 0.05 * Math.sin(u * 37 + 2) + 0.02 * Math.sin(u * 97);
      if (v > m2) c = mont2;
      if (v > 0.68) c = herbe.map((k) => k * (0.88 + 0.12 * Math.sin(x * 0.7) * Math.sin(y * 1.1)));
      // maisons tous les ~9 % de largeur
      for (let k = 0; k < 11; k++) {
        const cx = 0.045 + k * 0.091;
        if (Math.abs(u - 0.5) < 0.04) continue;
        const lm = 0.018;
        if (Math.abs(u - cx) < lm && v > 0.6 && v < 0.7) c = mur;
        if (v <= 0.6 && v > 0.555 + Math.abs(u - cx) * 2.2) c = toit;
        if (Math.abs(u - cx) < 0.004 && v > 0.65 && v < 0.7) c = lin(0x6b4228);
        // arbre à côté
        const ta = cx + 0.03;
        if (Math.hypot((u - ta) * (l / h) * 0.9, v - 0.6) < 0.045) c = lin(0x2f6f36);
      }
      // phare central rayé
      if (Math.abs(u - 0.5) < 0.012 - (0.68 - v) * 0.01 && v > 0.36 && v < 0.7)
        c = Math.floor(v * 40) % 2 ? phare : rouge;
      if (Math.abs(u - 0.5) < 0.016 && v > 0.33 && v < 0.36) c = lin(0x2c2c2c);
      if (Math.hypot((u - 0.5) * (l / h), v - 0.315) < 0.02) c = lin(0xfff1b0);
      const i = (y * l + x) * 3;
      im.d[i] = c[0];
      im.d[i + 1] = c[1];
      im.d[i + 2] = c[2];
    }
  return im;
}
export const PANORAMA_FOV = (140 * Math.PI) / 180;

/**
 * Paysage avec carte de profondeur (m) pour la brume : ciel (profondeur infinie), montagnes lointaines,
 * collines, sapins, maison rouge, prairie fleurie au premier plan. Couleurs saturées : le canal sombre
 * d'une version sans brume est presque nul partout sauf dans le ciel (He et al. 2009).
 */
export function paysageProfondeur(l = 256, h = 128): { rgb: Img; profondeur: Float32Array } {
  const im = creerImg(l, h, 3);
  const prof = new Float32Array(l * h);
  const ciel1 = lin(0x8fb4dc), ciel2 = lin(0xd9e6ef);
  const mont = lin(0x55707f), colline = lin(0x3f7a35), sapin = lin(0x1d4a2a), tronc = lin(0x4a3020);
  const mur = lin(0xa8321f), toit = lin(0x3a2a26), fen = lin(0x26405e), herbe = lin(0x6c9a2c), route = lin(0x8b7d6b);
  const fleurs = [lin(0xd8342c), lin(0xf0c419), lin(0x8e3bb8), lin(0xf2f2f2)];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const u = x / l, v = y / h;
      let c = melange(ciel1, ciel2, Math.min(1, v / 0.45));
      let d = Infinity;
      const ym = 0.36 + 0.07 * Math.sin(u * 9 + 0.5) + 0.04 * Math.sin(u * 23) - 0.08 * Math.exp(-((u - 0.7) ** 2) / 0.01);
      if (v > ym) { c = mont.map((k) => k * (0.9 + 0.1 * Math.sin(x * 0.3 + y * 0.5))); d = 9 + 3 * Math.sin(u * 4); }
      const yc = 0.52 + 0.05 * Math.sin(u * 6 + 2);
      if (v > yc) { c = colline.map((k) => k * (0.8 + 0.2 * Math.sin(x * 0.9) * Math.cos(y * 0.7))); d = 5 - 1.5 * (v - yc); }
      // sapins (triangles) à 2,5–4 m
      for (let k = 0; k < 9; k++) {
        const cx = 0.05 + k * 0.115 + 0.02 * Math.sin(k * 3.1), base = 0.72 + 0.03 * Math.cos(k * 1.7), haut = 0.3 + 0.06 * Math.sin(k * 2.3);
        const larg = 0.035 + 0.01 * Math.cos(k);
        if (k === 3 || k === 4) continue; // place pour la maison
        if (v < base && v > base - haut && Math.abs(u - cx) < larg * ((v - (base - haut)) / haut)) { c = sapin.map((q) => q * (0.85 + 0.2 * (((x * 5 + y * 3) % 7) / 7))); d = 2.6 + 0.2 * k; }
        if (v >= base && v < base + 0.05 && Math.abs(u - cx) < 0.006) { c = tronc; d = 2.6 + 0.2 * k; }
      }
      // maison à 3 m
      if (u > 0.36 && u < 0.56 && v > 0.55 && v < 0.78) {
        c = mur.map((q) => q * (y % 3 === 0 ? 0.8 : 1)); d = 3;
        if ((u > 0.39 && u < 0.43 || u > 0.49 && u < 0.53) && v > 0.6 && v < 0.67) c = fen;
        if (u > 0.445 && u < 0.475 && v > 0.66) c = toit;
      }
      if (v <= 0.55 && v > 0.42 + Math.abs(u - 0.46) * 1.2 && u > 0.34 && u < 0.58) { c = toit; d = 3; }
      // prairie au premier plan, 0,8–2 m, avec fleurs
      if (v > 0.76) {
        c = herbe.map((q) => q * (0.75 + 0.3 * Math.sin(x * 1.3 + Math.sin(y * 0.8) * 3)));
        d = 2.2 - 1.6 * ((v - 0.76) / 0.24);
        if (Math.abs(u - 0.46 - (v - 0.76) * 0.9) < 0.02 + (v - 0.76) * 0.25) c = route;
        const f = ((x * 73856093) ^ (y * 19349663)) >>> 0;
        if (f % 23 === 0) c = fleurs[f % 4];
      }
      const i = (y * l + x) * 3;
      im.d[i] = c[0];
      im.d[i + 1] = c[1];
      im.d[i + 2] = c[2];
      prof[y * l + x] = d;
    }
  return { rgb: im, profondeur: prof };
}
