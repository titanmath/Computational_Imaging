// Spectres et colorimétrie : échantillonnage 380–780 nm par pas de 5 nm, intégration vers XYZ, LMS, luminance.
import { cmf, encoderSrgb, xyzVersRgbLin } from './couleur';

export const LAMBDAS = Array.from({ length: 81 }, (_, i) => 380 + i * 5);
export type Spectre = Float64Array; // valeurs aux LAMBDAS

export const spectre = (f: (l: number) => number): Spectre => Float64Array.from(LAMBDAS, f);

/** Matrice de Hunt-Pointer-Estevez (XYZ → LMS) : donne des fondamentales de cônes approchées. */
const HPE = [
  [0.38971, 0.68898, -0.07868],
  [-0.22981, 1.1834, 0.04641],
  [0, 0, 1],
];
/** Sensibilités des cônes L, M, S (normalisées au pic) à la longueur d'onde λ. */
const MAX_LMS = (() => {
  const m = [0, 0, 0];
  for (let l = 380; l <= 780; l++) {
    const v = lmsBrut(l);
    for (let k = 0; k < 3; k++) m[k] = Math.max(m[k], v[k]);
  }
  return m;
})();
function lmsBrut(l: number): [number, number, number] {
  const [x, y, z] = cmf(l);
  return HPE.map((r) => Math.max(0, r[0] * x + r[1] * y + r[2] * z)) as [number, number, number];
}
export function lms(l: number): [number, number, number] {
  const v = lmsBrut(l);
  return [v[0] / MAX_LMS[0], v[1] / MAX_LMS[1], v[2] / MAX_LMS[2]];
}
/** Efficacité lumineuse photopique V(λ) = ȳ(λ). */
export const V = (l: number) => cmf(l)[1];

/** Loi de Planck (relative), λ en nm. */
export function corpsNoir(T: number, l: number): number {
  const lm = l * 1e-9;
  const c2 = 1.4388e-2;
  return 1 / (lm ** 5 * (Math.exp(c2 / (lm * T)) - 1));
}
export function normaliserA560(s: Spectre): Spectre {
  const i = LAMBDAS.indexOf(560);
  const v = s[i] || 1;
  return s.map((x) => x / v);
}

export const ILLUMINANTS = {
  D65: normaliserA560(spectre((l) => corpsNoir(6504, l) * (1 + 0.08 * Math.sin((l - 380) / 22)))),
  A: normaliserA560(spectre((l) => corpsNoir(2856, l))),
  F: normaliserA560(
    spectre(
      (l) =>
        0.35 * corpsNoir(4200, l) / corpsNoir(4200, 560) +
        [436, 546, 578, 611].reduce((s, c, k) => s + [1.2, 2.2, 0.8, 1.6][k] * Math.exp(-((l - c) ** 2) / (2 * 3 ** 2)), 0),
    ),
  ),
  egal: spectre(() => 1),
} as const;
export type NomIlluminant = keyof typeof ILLUMINANTS;

/** ∫ s(λ) w(λ) dλ (somme de Riemann, pas 5 nm). */
export function integrer(s: Spectre, w: (l: number) => number): number {
  let acc = 0;
  for (let i = 0; i < LAMBDAS.length; i++) acc += s[i] * w(LAMBDAS[i]) * 5;
  return acc;
}
export function versXYZ(s: Spectre): [number, number, number] {
  return [integrer(s, (l) => cmf(l)[0]), integrer(s, (l) => cmf(l)[1]), integrer(s, (l) => cmf(l)[2])];
}
export function versLMS(s: Spectre): [number, number, number] {
  return [integrer(s, (l) => lms(l)[0]), integrer(s, (l) => lms(l)[1]), integrer(s, (l) => lms(l)[2])];
}

/** Couleur CSS d'un stimulus spectral, la luminance étant ramenée à Y = cible (normalisation pour l'affichage). */
export function cssDeSpectre(s: Spectre, ref: Spectre = ILLUMINANTS.D65, cible = 0.75): string {
  const xyz = versXYZ(s);
  const Yref = versXYZ(ref)[1];
  const k = cible / Math.max(1e-9, Yref);
  const rgb = xyzVersRgbLin(xyz.map((v) => v * k));
  const enc = rgb.map((v) => Math.round(encoderSrgb(v) * 255));
  return `rgb(${enc.join(',')})`;
}

/**
 * Construit un métamère de s sous l'illuminant E : on ajoute un « noir métamérique » (combinaison de
 * fonctions qui n'excitent pas les cônes) pour changer la forme du spectre sans changer LMS.
 */
export function metamere(reflectance: Spectre, E: Spectre, amplitude = 0.35): Spectre {
  // base de perturbations lisses
  const bases = [0, 1, 2, 3, 4, 5].map((k) => spectre((l) => Math.sin(((l - 380) / 400) * Math.PI * (k + 2) + k)));
  // pour chaque base b, retirer sa projection sur l'espace engendré par E·lms (pour que ∫ E·b·s_c = 0)
  // (orthogonal aux trois fonctions colorimétriques : XYZ, donc LMS, identiques)
  const poids = [0, 1, 2].map((c) => spectre((l) => cmf(l)[c]).map((v, i) => v * E[i]));
  // Gram-Schmidt sur les poids
  const ortho: Spectre[] = [];
  for (const p of poids) {
    let v = Float64Array.from(p);
    for (const o of ortho) {
      const d = pt(v, o);
      v = v.map((x, i) => x - d * o[i]);
    }
    const n = Math.sqrt(pt(v, v));
    ortho.push(v.map((x) => x / n));
  }
  let noir = new Float64Array(LAMBDAS.length);
  bases.forEach((b, k) => {
    let v = Float64Array.from(b);
    for (const o of ortho) {
      const d = pt(v, o);
      v = v.map((x, i) => x - d * o[i]);
    }
    noir = noir.map((x, i) => x + v[i] * (k % 2 ? -1 : 1) * 0.6 ** k);
  });
  const m = Math.max(...noir.map(Math.abs)) || 1;
  // on reste dans [0, 1] : réflectance physiquement possible
  return reflectance.map((r, i) => Math.min(1, Math.max(0, r + (amplitude * noir[i]) / m)));
}
function pt(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Écart de couleur simple entre deux XYZ (CIE76 dans Lab), pour illustrer « visible / invisible ». */
export function deltaE(a: [number, number, number], b: [number, number, number], blanc: [number, number, number]): number {
  const lab = (x: [number, number, number]) => {
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
    const [fx, fy, fz] = [f(x[0] / blanc[0]), f(x[1] / blanc[1]), f(x[2] / blanc[2])];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * Couleur affichable d'un stimulus vu sous un illuminant, après adaptation chromatique de von Kries
 * (on suppose l'observateur adapté au blanc de l'illuminant : c'est ce que fait la balance des blancs).
 */
export function cssAdapte(reflectance: Spectre, E: Spectre, luminosite = 0.85): string {
  const stim = reflectance.map((r, i) => r * E[i]);
  const brut = (s: Spectre): [number, number, number] => {
    const [x, y, z] = versXYZ(s);
    return HPE.map((r) => r[0] * x + r[1] * y + r[2] * z) as [number, number, number];
  };
  const q = brut(stim);
  const blanc = brut(E);
  const blancRef = brut(ILLUMINANTS.D65);
  const adapte = q.map((v, k) => (v / blanc[k]) * blancRef[k]);
  // LMS (HPE) → XYZ
  const inv = inverser3x3(HPE);
  const xyz = inv.map((r) => r[0] * adapte[0] + r[1] * adapte[1] + r[2] * adapte[2]);
  const Yref = versXYZ(ILLUMINANTS.D65)[1];
  const rgb = xyzVersRgbLin(xyz.map((v) => (v / Yref) * luminosite));
  return `rgb(${rgb.map((v) => Math.round(encoderSrgb(v) * 255)).join(',')})`;
}
function inverser3x3(m: number[][]): number[][] {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}
