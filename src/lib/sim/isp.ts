// Chaîne de traitement d'image (ISP) classique, étape par étape, sur un RAW de Bayer simulé.
// RAW mosaïque (DN, 12 bits) → niveau noir → défauts → vignetage → dématriçage → débruitage
// → balance des blancs → matrice couleur → encodage sRGB → JPEG.
import { creerImg, type Img } from './image';
import { creerAlea, gauss, poisson } from './rng';
import { encoderSrgb } from './couleur';

export type CanalBayer = 0 | 1 | 2; // R, G, B
/** Motif RGGB : canal du photosite (x, y). */
export const canalBayer = (x: number, y: number): CanalBayer => (y % 2 === 0 ? (x % 2 === 0 ? 0 : 1) : x % 2 === 0 ? 1 : 2);

export interface OptionsRaw {
  /** illuminant en RGB caméra (réponse d'une surface neutre), ex. lumière chaude */
  illuminant: [number, number, number];
  /** électrons au blanc (avant illuminant) */
  electronsBlanc: number;
  gain: number; // DN / e⁻
  noir: number; // DN
  lecture: number; // e⁻
  vignetage: number; // 0 = aucun, 1 = fort (cos⁴ exagéré)
  pixelsChauds: [number, number][];
  /** mélange des canaux : la caméra ne « voit » pas en sRGB */
  diaphonie: number;
  graine: number;
}

export const RAW_DEFAUT: OptionsRaw = {
  illuminant: [1.0, 0.82, 0.5], // lumière tungstène : peu de bleu
  electronsBlanc: 6000,
  gain: 0.55,
  noir: 64,
  lecture: 4,
  vignetage: 0.55,
  pixelsChauds: [
    [37, 22],
    [150, 101],
    [201, 60],
  ],
  diaphonie: 0.18,
  graine: 3,
};

/** Profil de vignetage relatif v(x, y) ∈ ]0, 1]. */
export function profilVignetage(l: number, h: number, force: number): Float32Array {
  const v = new Float32Array(l * h);
  const r0 = Math.hypot(l / 2, h / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const r = Math.hypot(x + 0.5 - l / 2, y + 0.5 - h / 2) / r0;
      const c = Math.cos(Math.atan(r * 0.9));
      v[y * l + x] = 1 - force + force * c ** 4;
    }
  return v;
}

/** Scène linéaire (sRGB linéaire) → RAW de Bayer en DN (un canal, 12 bits). */
export function simulerRaw(scene: Img, o: OptionsRaw = RAW_DEFAUT): Img {
  const { l, h } = scene;
  const raw = creerImg(l, h, 1);
  const alea = creerAlea(o.graine);
  const v = profilVignetage(l, h, o.vignetage);
  const d = o.diaphonie;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const i = y * l + x;
      const c = canalBayer(x, y);
      const r = scene.d[3 * i], g = scene.d[3 * i + 1], b = scene.d[3 * i + 2];
      // sensibilités spectrales larges et chevauchantes (la caméra mélange les couleurs)
      const cam = [r * (1 - d) + g * d, g * (1 - 2 * d) + (r + b) * d, b * (1 - d) + g * d][c];
      const e = poisson(alea, cam * o.illuminant[c] * o.electronsBlanc * v[i]);
      raw.d[i] = Math.min(4095, Math.max(0, Math.round(o.gain * (e + o.lecture * gauss(alea)) + o.noir)));
    }
  for (const [x, y] of o.pixelsChauds) if (x < l && y < h) raw.d[y * l + x] = 4095;
  return raw;
}

// --- 1. Corrections RAW ---
export function soustraireNoir(raw: Img, noir: number): Img {
  const out = creerImg(raw.l, raw.h, 1);
  for (let i = 0; i < raw.d.length; i++) out.d[i] = raw.d[i] - noir; // des résidus négatifs sont normaux
  return out;
}

/** Remplace les sites signalés par la moyenne de leurs voisins de même couleur (à 2 sites). */
export function corrigerDefauts(raw: Img, defauts: [number, number][]): Img {
  const out = { ...raw, d: new Float32Array(raw.d) };
  for (const [x, y] of defauts) {
    let s = 0, n = 0;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < raw.l && yy < raw.h) {
        s += raw.d[yy * raw.l + xx];
        n++;
      }
    }
    out.d[y * raw.l + x] = s / n;
  }
  return out;
}

/** Détection simple : sites qui dépassent nettement la médiane de leurs voisins de même couleur. */
export function detecterDefauts(raw: Img, seuil = 6): [number, number][] {
  const res: [number, number][] = [];
  for (let y = 2; y < raw.h - 2; y++)
    for (let x = 2; x < raw.l - 2; x++) {
      const v = [raw.d[y * raw.l + x - 2], raw.d[y * raw.l + x + 2], raw.d[(y - 2) * raw.l + x], raw.d[(y + 2) * raw.l + x]].sort((a, b) => a - b);
      const med = (v[1] + v[2]) / 2;
      if (raw.d[y * raw.l + x] > seuil * Math.max(20, med)) res.push([x, y]);
    }
  return res;
}

export function corrigerVignetage(raw: Img, v: Float32Array): Img {
  const out = creerImg(raw.l, raw.h, 1);
  for (let i = 0; i < raw.d.length; i++) out.d[i] = raw.d[i] / v[i];
  return out;
}

// --- 2. Dématriçage bilinéaire ---
export function dematricer(raw: Img): Img {
  const { l, h } = raw;
  const out = creerImg(l, h, 3);
  const val = (x: number, y: number) => raw.d[Math.min(h - 1, Math.max(0, y)) * l + Math.min(l - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const c = canalBayer(x, y);
      const o = (y * l + x) * 3;
      const croix = (val(x - 1, y) + val(x + 1, y) + val(x, y - 1) + val(x, y + 1)) / 4;
      const diag = (val(x - 1, y - 1) + val(x + 1, y - 1) + val(x - 1, y + 1) + val(x + 1, y + 1)) / 4;
      const horiz = (val(x - 1, y) + val(x + 1, y)) / 2;
      const vert = (val(x, y - 1) + val(x, y + 1)) / 2;
      const v = val(x, y);
      if (c === 0) {
        out.d[o] = v;
        out.d[o + 1] = croix;
        out.d[o + 2] = diag;
      } else if (c === 2) {
        out.d[o] = diag;
        out.d[o + 1] = croix;
        out.d[o + 2] = v;
      } else {
        out.d[o + 1] = v;
        // vert sur une ligne rouge (y pair) : rouge à gauche/droite, bleu en haut/bas
        if (y % 2 === 0) {
          out.d[o] = horiz;
          out.d[o + 2] = vert;
        } else {
          out.d[o] = vert;
          out.d[o + 2] = horiz;
        }
      }
    }
  return out;
}

// --- 3. Débruitage médian (canal par canal) ---
export function median(im: Img, taille: number): Img {
  if (taille <= 1) return { ...im, d: new Float32Array(im.d) };
  const r = Math.floor(taille / 2);
  const { l, h, c } = im;
  const out = creerImg(l, h, c);
  const tampon: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++)
      for (let k = 0; k < c; k++) {
        tampon.length = 0;
        for (let j = -r; j <= r; j++)
          for (let i = -r; i <= r; i++) {
            const xx = Math.min(l - 1, Math.max(0, x + i));
            const yy = Math.min(h - 1, Math.max(0, y + j));
            tampon.push(im.d[(yy * l + xx) * c + k]);
          }
        tampon.sort((a, b) => a - b);
        out.d[(y * l + x) * c + k] = tampon[tampon.length >> 1];
      }
  return out;
}

// --- 4. Balance des blancs ---
/** Gains a_c = k / ℓ_c à partir de la réponse ℓ d'une surface neutre. */
export function gainsBalance(neutre: [number, number, number], k = neutre[1]): [number, number, number] {
  return [k / neutre[0], k / neutre[1], k / neutre[2]];
}
/** Hypothèse « monde gris » : la moyenne de la scène est neutre. */
export function neutreMondeGris(im: Img): [number, number, number] {
  const m = [0, 0, 0];
  const n = im.l * im.h;
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) m[k] += im.d[3 * i + k] / n;
  return m as [number, number, number];
}
export function appliquerGains(im: Img, g: [number, number, number]): Img {
  const out = creerImg(im.l, im.h, 3);
  for (let i = 0; i < im.l * im.h; i++) for (let k = 0; k < 3; k++) out.d[3 * i + k] = im.d[3 * i + k] * g[k];
  return out;
}

// --- 5. Matrice couleur (RGB caméra → sRGB linéaire) ---
/** Inverse du mélange simulé dans simulerRaw (ce qu'une calibration retrouverait). */
export function matriceCouleur(d = RAW_DEFAUT.diaphonie): number[][] {
  const A = [
    [1 - d, d, 0],
    [d, 1 - 2 * d, d],
    [0, d, 1 - d],
  ];
  return inverser3(A);
}
export function inverser3(m: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}
export function appliquerMatrice(im: Img, M: number[][]): Img {
  const out = creerImg(im.l, im.h, 3);
  for (let i = 0; i < im.l * im.h; i++) {
    const r = im.d[3 * i], g = im.d[3 * i + 1], b = im.d[3 * i + 2];
    for (let k = 0; k < 3; k++) out.d[3 * i + k] = M[k][0] * r + M[k][1] * g + M[k][2] * b;
  }
  return out;
}

/** Normalise en [0, 1] par la valeur du blanc (après soustraction du noir). */
export function normaliser(im: Img, blanc: number): Img {
  const out = creerImg(im.l, im.h, im.c);
  for (let i = 0; i < im.d.length; i++) out.d[i] = im.d[i] / blanc;
  return out;
}

// --- 6. JPEG simplifié : DCT 8 × 8 et quantification de la luminance et des chrominances ---
const Q_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22,
  37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];
const Q_CHROMA = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
];
/** Table de quantification mise à l'échelle par la qualité (convention IJG). */
export function tableQualite(qualite: number, base = Q_LUMA): number[] {
  const q = Math.min(100, Math.max(1, qualite));
  const s = q < 50 ? 5000 / q : 200 - 2 * q;
  return base.map((v) => Math.min(255, Math.max(1, Math.floor((v * s + 50) / 100))));
}
const COS = Array.from({ length: 8 }, (_, x) => Array.from({ length: 8 }, (_, u) => Math.cos(((2 * x + 1) * u * Math.PI) / 16)));
const alpha = (u: number) => (u === 0 ? Math.SQRT1_2 : 1);

/** DCT-II 2D orthonormale d'un bloc 8 × 8 (valeurs centrées). */
export function dct8(bloc: number[]): number[] {
  const out = new Array(64).fill(0);
  for (let v = 0; v < 8; v++)
    for (let u = 0; u < 8; u++) {
      let s = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += bloc[y * 8 + x] * COS[x][u] * COS[y][v];
      out[v * 8 + u] = 0.25 * alpha(u) * alpha(v) * s;
    }
  return out;
}
export function idct8(coef: number[]): number[] {
  const out = new Array(64).fill(0);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      let s = 0;
      for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) s += alpha(u) * alpha(v) * coef[v * 8 + u] * COS[x][u] * COS[y][v];
      out[y * 8 + x] = 0.25 * s;
    }
  return out;
}

/** Compresse une image sRGB encodée [0,1] (YCbCr 4:4:4). Renvoie l'image décodée et le nombre de coefficients non nuls. */
export function jpeg(im: Img, qualite: number): { image: Img; nonNuls: number } {
  const { l, h } = im;
  const ql = tableQualite(qualite, Q_LUMA);
  const qc = tableQualite(qualite, Q_CHROMA);
  const Y = new Float32Array(l * h), Cb = new Float32Array(l * h), Cr = new Float32Array(l * h);
  for (let i = 0; i < l * h; i++) {
    const r = im.d[3 * i] * 255, g = im.d[3 * i + 1] * 255, b = im.d[3 * i + 2] * 255;
    Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[i] = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
    Cr[i] = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;
  }
  let nonNuls = 0;
  const traiter = (p: Float32Array, q: number[]) => {
    for (let by = 0; by < h; by += 8)
      for (let bx = 0; bx < l; bx += 8) {
        const bloc: number[] = [];
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) bloc.push(p[Math.min(h - 1, by + y) * l + Math.min(l - 1, bx + x)] - 128);
        const D = dct8(bloc);
        const Dq = D.map((v, k) => {
          const n = Math.round(v / q[k]);
          if (n !== 0) nonNuls++;
          return n * q[k];
        });
        const rec = idct8(Dq);
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) if (by + y < h && bx + x < l) p[(by + y) * l + bx + x] = rec[y * 8 + x] + 128;
      }
  };
  traiter(Y, ql);
  traiter(Cb, qc);
  traiter(Cr, qc);
  const out = creerImg(l, h, 3);
  for (let i = 0; i < l * h; i++) {
    const y = Y[i], cb = Cb[i] - 128, cr = Cr[i] - 128;
    out.d[3 * i] = Math.min(1, Math.max(0, (y + 1.402 * cr) / 255));
    out.d[3 * i + 1] = Math.min(1, Math.max(0, (y - 0.34414 * cb - 0.71414 * cr) / 255));
    out.d[3 * i + 2] = Math.min(1, Math.max(0, (y + 1.772 * cb) / 255));
  }
  return { image: out, nonNuls };
}

/** Encode une image linéaire en sRGB (pour JPEG / affichage) et l'écrête. */
export function encoder(im: Img): Img {
  const out = creerImg(im.l, im.h, im.c);
  for (let i = 0; i < im.d.length; i++) out.d[i] = encoderSrgb(im.d[i]);
  return out;
}

/** Pipeline complet, avec chaque étape intermédiaire (pour l'affichage pas à pas). */
export interface EtapesISP {
  raw: Img;
  noir: Img;
  defauts: Img;
  vignetage: Img;
  demat: Img;
  debruite: Img;
  balance: Img;
  couleur: Img;
  srgb: Img;
  jpeg: Img;
}
export function pipeline(scene: Img, o: OptionsRaw = RAW_DEFAUT, opts: { median?: number; qualite?: number } = {}): EtapesISP {
  const raw = simulerRaw(scene, o);
  const noir = soustraireNoir(raw, o.noir);
  const defauts = corrigerDefauts(noir, detecterDefauts(noir));
  const vignetage = corrigerVignetage(defauts, profilVignetage(raw.l, raw.h, o.vignetage));
  const blanc = o.gain * o.electronsBlanc;
  const demat = normaliser(dematricer(vignetage), blanc);
  const debruite = median(demat, opts.median ?? 3);
  const balance = appliquerGains(debruite, gainsBalance(o.illuminant, 1));
  const couleur = appliquerMatrice(balance, matriceCouleur(o.diaphonie));
  const srgb = encoder(couleur);
  const j = jpeg(srgb, opts.qualite ?? 60).image;
  return { raw, noir, defauts, vignetage, demat, debruite, balance, couleur, srgb, jpeg: j };
}
