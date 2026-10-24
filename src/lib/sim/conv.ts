// Noyaux (PSF) et convolution 2D. Bords : réplication du pixel le plus proche.
import { creerImg, type Img } from './image';

export interface Noyau {
  r: number; // rayon : taille (2r+1)²
  k: Float32Array;
}

export function normaliser(n: Noyau): Noyau {
  const s = n.k.reduce((a, b) => a + b, 0) || 1;
  return { r: n.r, k: n.k.map((v) => v / s) };
}

export function noyauGauss(sigma: number): Noyau {
  const r = Math.max(1, Math.ceil(3 * sigma));
  const t = 2 * r + 1;
  const k = new Float32Array(t * t);
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) k[(y + r) * t + x + r] = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
  return normaliser({ r, k });
}

/** Disque uniforme (défocus géométrique), anti-crénelé par sur-échantillonnage. */
export function noyauDisque(rayon: number): Noyau {
  const r = Math.max(1, Math.ceil(rayon));
  const t = 2 * r + 1;
  const k = new Float32Array(t * t);
  const ss = 4;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      let c = 0;
      for (let a = 0; a < ss; a++)
        for (let b = 0; b < ss; b++) {
          const px = x - 0.5 + (a + 0.5) / ss;
          const py = y - 0.5 + (b + 0.5) / ss;
          if (px * px + py * py <= rayon * rayon) c++;
        }
      k[(y + r) * t + x + r] = c;
    }
  if (rayon < 0.5) k[r * t + r] = 1;
  return normaliser({ r, k });
}

/** Flou de bougé linéaire (angle en radians, longueur en pixels). */
export function noyauBouge(longueur: number, angle: number): Noyau {
  const r = Math.max(1, Math.ceil(longueur / 2));
  const t = 2 * r + 1;
  const k = new Float32Array(t * t);
  const n = Math.max(8, Math.ceil(longueur * 4));
  for (let i = 0; i <= n; i++) {
    const s = (i / n - 0.5) * longueur;
    const x = Math.round(s * Math.cos(angle)) + r;
    const y = Math.round(s * Math.sin(angle)) + r;
    k[y * t + x] += 1;
  }
  return normaliser({ r, k });
}

export function convoluer(im: Img, n: Noyau): Img {
  const { l, h, c } = im;
  const out = creerImg(l, h, c);
  const t = 2 * n.r + 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++)
      for (let ch = 0; ch < c; ch++) {
        let s = 0;
        for (let j = -n.r; j <= n.r; j++) {
          const yy = Math.min(h - 1, Math.max(0, y - j));
          for (let i = -n.r; i <= n.r; i++) {
            const w = n.k[(j + n.r) * t + i + n.r];
            if (w === 0) continue;
            const xx = Math.min(l - 1, Math.max(0, x - i));
            s += w * im.d[(yy * l + xx) * c + ch];
          }
        }
        out.d[(y * l + x) * c + ch] = s;
      }
  return out;
}

/** Profil 1D d'un noyau projeté sur l'axe horizontal (intégration verticale) → LSF. */
export function projectionHorizontale(n: Noyau): Float32Array {
  const t = 2 * n.r + 1;
  const p = new Float32Array(t);
  for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) p[x] += n.k[y * t + x];
  return p;
}

/** Largeur à mi-hauteur d'un profil échantillonné au pas dx (interpolation linéaire). */
export function fwhm(profil: ArrayLike<number>, dx = 1): number {
  let iMax = 0;
  for (let i = 1; i < profil.length; i++) if (profil[i] > profil[iMax]) iMax = i;
  const demi = profil[iMax] / 2;
  let g = iMax;
  while (g > 0 && profil[g] > demi) g--;
  let d = iMax;
  while (d < profil.length - 1 && profil[d] > demi) d++;
  const xg = g + (demi - profil[g]) / (profil[g + 1] - profil[g] || 1);
  const xd = d - 1 + (profil[d - 1] - demi) / (profil[d - 1] - profil[d] || 1);
  return (xd - xg) * dx;
}

/** Flou gaussien séparable (rapide, pour les grands σ). */
export function flouGauss(im: Img, sigma: number): Img {
  if (sigma < 0.25) return { ...im, d: new Float32Array(im.d) };
  const r = Math.ceil(3 * sigma);
  const k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) s += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const { l, h, c } = im;
  const tmp = creerImg(l, h, c);
  const out = creerImg(l, h, c);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++)
      for (let ch = 0; ch < c; ch++) {
        let a = 0;
        for (let i = -r; i <= r; i++) a += k[i + r] * im.d[(y * l + Math.min(l - 1, Math.max(0, x - i))) * c + ch];
        tmp.d[(y * l + x) * c + ch] = a;
      }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++)
      for (let ch = 0; ch < c; ch++) {
        let a = 0;
        for (let i = -r; i <= r; i++) a += k[i + r] * tmp.d[(Math.min(h - 1, Math.max(0, y - i)) * l + x) * c + ch];
        out.d[(y * l + x) * c + ch] = a;
      }
  return out;
}
