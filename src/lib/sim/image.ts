// Images flottantes linéaires (canaux entrelacés) et conversion vers un canvas.
import { encoderSrgb } from './couleur';

export interface Img {
  l: number;
  h: number;
  /** nombre de canaux : 1 (gris) ou 3 (RGB) */
  c: 1 | 3;
  d: Float32Array;
}

export function creerImg(l: number, h: number, c: 1 | 3 = 3, remplir = 0): Img {
  const d = new Float32Array(l * h * c);
  if (remplir) d.fill(remplir);
  return { l, h, c, d };
}

export function copier(im: Img): Img {
  return { ...im, d: new Float32Array(im.d) };
}

export function versGris(im: Img): Img {
  if (im.c === 1) return copier(im);
  const out = creerImg(im.l, im.h, 1);
  for (let i = 0; i < im.l * im.h; i++)
    out.d[i] = 0.2126 * im.d[3 * i] + 0.7152 * im.d[3 * i + 1] + 0.0722 * im.d[3 * i + 2];
  return out;
}

export function canal(im: Img, k: number): Img {
  const out = creerImg(im.l, im.h, 1);
  for (let i = 0; i < im.l * im.h; i++) out.d[i] = im.d[im.c * i + k];
  return out;
}

export function fusionnerCanaux(r: Img, g: Img, b: Img): Img {
  const out = creerImg(r.l, r.h, 3);
  for (let i = 0; i < r.l * r.h; i++) {
    out.d[3 * i] = r.d[i];
    out.d[3 * i + 1] = g.d[i];
    out.d[3 * i + 2] = b.d[i];
  }
  return out;
}

export type Affichage = 'srgb' | 'lineaire';

/**
 * Écrit l'image dans un ImageData. `gain` multiplie les valeurs linéaires avant écrêtage ;
 * `affichage` = 'srgb' applique l'encodage sRGB (cas normal), 'lineaire' affiche les codes bruts.
 */
export function versImageData(im: Img, o: { gain?: number; affichage?: Affichage; signe?: boolean } = {}): ImageData {
  const gain = o.gain ?? 1;
  const enc = o.affichage === 'lineaire' ? (x: number) => Math.min(1, Math.max(0, x)) : encoderSrgb;
  const out = new ImageData(im.l, im.h);
  const p = out.data;
  for (let i = 0; i < im.l * im.h; i++) {
    for (let k = 0; k < 3; k++) {
      let v = im.d[im.c * i + (im.c === 3 ? k : 0)] * gain;
      if (o.signe) v = 0.5 + 0.5 * v;
      p[4 * i + k] = Math.round(enc(v) * 255);
    }
    p[4 * i + 3] = 255;
  }
  return out;
}

/** Dessine l'image dans un canvas (à sa taille native ; le CSS se charge de l'agrandir). */
export function dessiner(canvas: HTMLCanvasElement, im: Img, o?: Parameters<typeof versImageData>[1]) {
  if (canvas.width !== im.l) canvas.width = im.l;
  if (canvas.height !== im.h) canvas.height = im.h;
  canvas.getContext('2d')!.putImageData(versImageData(im, o), 0, 0);
}

export function mse(a: Img, b: Img): number {
  let s = 0;
  for (let i = 0; i < a.d.length; i++) s += (a.d[i] - b.d[i]) ** 2;
  return s / a.d.length;
}

export function psnr(a: Img, b: Img, pic = 1): number {
  const m = mse(a, b);
  return m === 0 ? Infinity : 10 * Math.log10((pic * pic) / m);
}

export function bornerImg(im: Img, mini = 0, maxi = 1): Img {
  const out = copier(im);
  for (let i = 0; i < out.d.length; i++) out.d[i] = Math.min(maxi, Math.max(mini, out.d[i]));
  return out;
}
