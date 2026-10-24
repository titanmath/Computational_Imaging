// Outils partagés par les simulations du chapitre 08 (2D et 3D) : image test en niveaux de gris (encodée sRGB, [0, 1],
// comme une photo), bruit gaussien seedé, conversion vers Img pour l'affichage, PSNR.
import { scenePaysage } from '@/lib/sim/scenes';
import { creerImg, versGris, type Img } from '@/lib/sim/image';
import { encoderSrgb } from '@/lib/sim/couleur';
import { creerAlea, gauss } from '@/lib/sim/rng';

export const L = 256;
export const H = 128;

let cache: Float64Array | undefined;
/** Paysage procédural recadré sur 256 × 128 (puissances de 2 pour la FFT). */
export function imageGrise(): Float64Array {
  if (cache) return cache;
  const s = versGris(scenePaysage(256, 192));
  const d = new Float64Array(L * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) d[y * L + x] = encoderSrgb(s.d[(y + 40) * 256 + x]);
  return (cache = d);
}

export function bruiter(x: ArrayLike<number>, sigma: number, graine = 1): Float64Array {
  const a = creerAlea(graine);
  return Float64Array.from(x as ArrayLike<number>, (v) => v + sigma * gauss(a));
}

export function versImg(d: ArrayLike<number>, l = L, h = H): Img {
  const im = creerImg(l, h, 1);
  for (let i = 0; i < l * h; i++) im.d[i] = Math.min(1, Math.max(0, d[i]));
  return im;
}

export function psnr(a: ArrayLike<number>, ref: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < ref.length; i++) s += (Math.min(1, Math.max(0, a[i])) - ref[i]) ** 2;
  return 10 * Math.log10(ref.length / Math.max(s, 1e-12));
}
