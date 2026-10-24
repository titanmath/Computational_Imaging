// Colorimétrie partagée : fonctions colorimétriques CIE 1931 (ajustement analytique),
// conversions XYZ ↔ sRGB, encodage sRGB, OKLab. Utilisé par les accents du site,
// les simulations du chapitre Perception et le path tracer spectral.

/** Gaussienne asymétrique de Wyman, Sloan & Shirley (JCGT 2013). */
function g(x: number, mu: number, s1: number, s2: number): number {
  const s = x < mu ? s1 : s2;
  const t = (x - mu) / s;
  return Math.exp(-0.5 * t * t);
}

/** Fonctions colorimétriques CIE 1931 2° (approximation multi-lobes), λ en nm. */
export function cmf(lambda: number): [number, number, number] {
  const x =
    1.056 * g(lambda, 599.8, 37.9, 31.0) +
    0.362 * g(lambda, 442.0, 16.0, 26.7) -
    0.065 * g(lambda, 501.1, 20.4, 26.2);
  const y = 0.821 * g(lambda, 568.8, 46.9, 40.5) + 0.286 * g(lambda, 530.9, 16.3, 31.1);
  const z = 1.217 * g(lambda, 437.0, 11.8, 36.0) + 0.681 * g(lambda, 459.0, 26.0, 13.8);
  return [x, y, z];
}

/** Matrice XYZ (D65) → sRGB linéaire (IEC 61966-2-1), celle du cours ISP. */
export const XYZ_VERS_RGB = [
  [3.2406, -1.5372, -0.4986],
  [-0.9689, 1.8758, 0.0415],
  [0.0557, -0.204, 1.057],
] as const;

export function xyzVersRgbLin([X, Y, Z]: readonly number[]): [number, number, number] {
  const m = XYZ_VERS_RGB;
  return [
    m[0][0] * X + m[0][1] * Y + m[0][2] * Z,
    m[1][0] * X + m[1][1] * Y + m[1][2] * Z,
    m[2][0] * X + m[2][1] * Y + m[2][2] * Z,
  ];
}

/** Encodage sRGB d'une valeur linéaire dans [0, 1]. */
export function encoderSrgb(c: number): number {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** Décodage sRGB → linéaire. */
export function decoderSrgb(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** sRGB linéaire → OKLab (Ottosson 2020). */
export function rgbLinVersOklab([r, gg, b]: readonly number[]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Couleur affichable d'une lumière monochromatique : XYZ → sRGB linéaire,
 * puis désaturation minimale (ajout de blanc) pour rentrer dans le gamut.
 * Renvoie du sRGB linéaire normalisé (max = 1).
 */
export function couleurSpectrale(lambda: number): [number, number, number] {
  let rgb = xyzVersRgbLin(cmf(lambda));
  const mini = Math.min(...rgb);
  if (mini < 0) rgb = rgb.map((c) => c - mini) as [number, number, number];
  const maxi = Math.max(...rgb, 1e-9);
  return rgb.map((c) => c / maxi) as [number, number, number];
}

/** Teinte OKLCH (degrés) d'une longueur d'onde. */
export function teinteSpectrale(lambda: number): number {
  const [, a, b] = rgbLinVersOklab(couleurSpectrale(lambda));
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return (h + 360) % 360;
}

/** Couleur CSS hexadécimale d'une longueur d'onde (pour gradients spectraux). */
export function hexSpectral(lambda: number, intensite = 1): string {
  const rgb = couleurSpectrale(lambda).map((c) => Math.round(encoderSrgb(c * intensite) * 255));
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}
