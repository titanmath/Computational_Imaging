// Méthode du bord incliné (slanted edge, ISO 12233 ; SFRMAT5 de P. D. Burns) et comparaison avec la
// source ponctuelle, pour la tâche 2 de l'A2. Unités : pixels du capteur.
//   1. localiser le bord ligne par ligne (centroïde de la dérivée), ajuster une droite x = a·y + b ;
//   2. projeter chaque pixel sur la normale au bord et moyenner par cases de 1/4 de pixel → ESF suréchantillonnée ;
//   3. LSF = dESF/du, normalisée à une aire de 1 ; FWHM entre les deux passages à mi-hauteur.
import { convoluer, noyauDisque, noyauGauss, normaliser, type Noyau } from './conv';
import { creerImg } from './image';
import { creerAlea, gauss } from './rng';

/** Convolution de deux petits noyaux (PSF composée). */
export function composer(a: Noyau, b: Noyau): Noyau {
  const r = a.r + b.r, t = 2 * r + 1, ta = 2 * a.r + 1, tb = 2 * b.r + 1;
  const k = new Float32Array(t * t);
  for (let ya = 0; ya < ta; ya++)
    for (let xa = 0; xa < ta; xa++) {
      const va = a.k[ya * ta + xa];
      if (!va) continue;
      for (let yb = 0; yb < tb; yb++)
        for (let xb = 0; xb < tb; xb++) k[(ya + yb) * t + xa + xb] += va * b.k[yb * tb + xb];
    }
  return normaliser({ r, k });
}

/** Gaussienne anisotrope (σx ≠ σy) : une PSF qui n'a pas la même largeur dans toutes les directions. */
export function noyauGaussAniso(sx: number, sy: number): Noyau {
  const r = Math.max(1, Math.ceil(3 * Math.max(sx, sy)));
  const t = 2 * r + 1;
  const k = new Float32Array(t * t);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) k[(y + r) * t + x + r] = Math.exp(-(x * x) / (2 * sx * sx) - (y * y) / (2 * sy * sy));
  return normaliser({ r, k });
}

export type TypePSF = 'gauss' | 'stenope' | 'aniso';
/** PSF du système, de « taille » s (pixels) : gaussienne σ = s ; sténopé = disque (géométrie) ∗ gaussienne (diffraction, capteur). */
export function psfSysteme(type: TypePSF, s: number): Noyau {
  if (type === 'gauss') return noyauGauss(s);
  if (type === 'aniso') return noyauGaussAniso(s * 1.6, s * 0.7);
  return composer(noyauDisque(s * 1.4), noyauGauss(Math.max(0.35, s * 0.35)));
}

export interface OptionsCapture {
  bruit?: number;
  graine?: number;
  noir?: number;
  blanc?: number;
}

/** Image d'un bord noir (gauche) / blanc (droite) incliné de `angleDeg` par rapport à la verticale, floutée par la PSF. */
export function imageBord(l: number, h: number, angleDeg: number, psf: Noyau, o: OptionsCapture = {}): Float64Array {
  const noir = o.noir ?? 0.06, blanc = o.blanc ?? 0.8;
  const tg = Math.tan((angleDeg * Math.PI) / 180);
  const ideal = creerImg(l, h, 1);
  const ss = 8;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      let c = 0;
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const px = x + (i + 0.5) / ss, py = y + (j + 0.5) / ss;
          if (px > l / 2 + (py - h / 2) * tg) c++;
        }
      ideal.d[y * l + x] = noir + ((blanc - noir) * c) / (ss * ss);
    }
  const flou = convoluer(ideal, psf);
  const a = creerAlea(o.graine ?? 3);
  return Float64Array.from(flou.d, (v) => v + (o.bruit ?? 0) * gauss(a));
}

/** Image d'une petite source lumineuse (disque de diamètre `taille` px) au centre, floutée par la PSF. */
export function imagePoint(l: number, h: number, psf: Noyau, taille: number, o: OptionsCapture = {}): Float64Array {
  const fond = o.noir ?? 0.03, pic = o.blanc ?? 1;
  const src = creerImg(l, h, 1);
  const ss = 8, r2 = Math.max(1e-6, (taille / 2) ** 2);
  let total = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      let c = 0;
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const dx = x + (i + 0.5) / ss - l / 2, dy = y + (j + 0.5) / ss - h / 2;
          if (dx * dx + dy * dy <= r2) c++;
        }
      src.d[y * l + x] = c;
      total += c;
    }
  if (total === 0) src.d[(h / 2) * l + l / 2] = total = 1;
  // énergie fixée : l'image du point a toujours la même intensité totale
  for (let k = 0; k < src.d.length; k++) src.d[k] = (src.d[k] / total) * pic * 12;
  const flou = convoluer(src, psf);
  const a = creerAlea(o.graine ?? 5);
  return Float64Array.from(flou.d, (v) => v + fond + (o.bruit ?? 0) * gauss(a));
}

export interface ResultatBord {
  /** pente du bord : x = a·y + b */
  a: number;
  b: number;
  angleDeg: number;
  /** abscisses (distance normale au bord, px) des cases */
  u: Float64Array;
  esf: Float64Array;
  /** pas des cases le long de la normale (≈ 0,25 px) */
  dx: number;
  lsf: Float64Array;
  fwhm: number;
  /** quelques pixels projetés (pour un nuage de points) */
  nuage: { u: number; v: number }[];
}

/** Largeur à mi-hauteur du pic principal (interpolation linéaire), au pas dx. */
export function largeurMiHauteur(p: ArrayLike<number>, dx: number): number {
  let im = 0;
  for (let i = 1; i < p.length; i++) if (p[i] > p[im]) im = i;
  const demi = p[im] / 2;
  let g = im;
  while (g > 0 && p[g] > demi) g--;
  let d = im;
  while (d < p.length - 1 && p[d] > demi) d++;
  const xg = g + (demi - p[g]) / ((p[g + 1] - p[g]) || 1);
  const xd = d - 1 + (p[d - 1] - demi) / ((p[d - 1] - p[d]) || 1);
  return (xd - xg) * dx;
}

/** Normalise un profil à une aire de 1 (∫ p du = 1). */
export function normaliserAire(p: Float64Array, dx: number): Float64Array {
  const s = p.reduce((t, v) => t + v, 0) * dx;
  return p.map((v) => v / (s || 1));
}

/** Analyse d'une ROI contenant un bord quasi vertical sombre → clair (comme SFRMAT5, version simplifiée). */
export function analyserBord(img: ArrayLike<number>, l: number, h: number, sur = 4, demiLargeur = 12): ResultatBord {
  // 1. bord par ligne : centroïde de la dérivée horizontale, dans une fenêtre de ±6 px autour de son maximum
  //    (sans fenêtre, le bruit de toute la ligne tire le centroïde vers le milieu de la ROI)
  const ys: number[] = [], xs: number[] = [];
  for (let y = 0; y < h; y++) {
    let xm = 0, dm = -Infinity;
    for (let x = 1; x < l - 2; x++) {
      const d = img[y * l + x + 2] - img[y * l + x - 1]; // dérivée un peu lissée pour trouver le pic
      if (d > dm) {
        dm = d;
        xm = x;
      }
    }
    let s = 0, sx = 0;
    for (let x = Math.max(0, xm - 6); x < Math.min(l - 1, xm + 7); x++) {
      const d = img[y * l + x + 1] - img[y * l + x];
      if (d > 0) {
        s += d;
        sx += d * (x + 1);
      }
    }
    if (s > 0) {
      ys.push(y + 0.5);
      xs.push(sx / s);
    }
  }
  // 2. droite x = a·y + b (moindres carrés)
  const n = ys.length;
  const my = ys.reduce((t, v) => t + v, 0) / n, mx = xs.reduce((t, v) => t + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (ys[i] - my) * (xs[i] - mx);
    den += (ys[i] - my) ** 2;
  }
  const a = den > 0 ? num / den : 0, b = mx - a * my;
  const cos = 1 / Math.sqrt(1 + a * a);
  // 3. projection horizontale de chaque pixel (centre x + 0,5) sur des cases de 1/sur px
  const nb = 2 * demiLargeur * sur;
  const somme = new Float64Array(nb), compte = new Float64Array(nb);
  const nuage: { u: number; v: number }[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const s = x + 0.5 - (a * (y + 0.5) + b);
      const k = Math.floor((s + demiLargeur) * sur);
      if (k < 0 || k >= nb) continue;
      somme[k] += img[y * l + x];
      compte[k]++;
      if ((x * 7 + y * 13) % 5 === 0) nuage.push({ u: s * cos, v: img[y * l + x] });
    }
  const esf = new Float64Array(nb);
  for (let k = 0; k < nb; k++) esf[k] = compte[k] ? somme[k] / compte[k] : NaN;
  // cases vides : interpolation entre voisines
  for (let k = 0; k < nb; k++)
    if (Number.isNaN(esf[k])) {
      let g = k - 1, d = k + 1;
      while (g >= 0 && Number.isNaN(esf[g])) g--;
      while (d < nb && Number.isNaN(esf[d])) d++;
      esf[k] = g < 0 ? esf[d] : d >= nb ? esf[g] : esf[g] + ((esf[d] - esf[g]) * (k - g)) / (d - g);
    }
  const dx = cos / sur;
  const u = Float64Array.from({ length: nb }, (_, k) => ((k + 0.5) / sur - demiLargeur) * cos);
  // 4. LSF = dESF/du (différences centrées), normalisée
  const brute = new Float64Array(nb);
  for (let k = 1; k < nb - 1; k++) brute[k] = (esf[k + 1] - esf[k - 1]) / (2 * dx);
  const lsf = normaliserAire(brute, dx);
  return { a, b, angleDeg: (Math.atan(a) * 180) / Math.PI, u, esf, dx, lsf, fwhm: largeurMiHauteur(lsf, dx), nuage };
}

/**
 * Projection 1D de l'image d'une source ponctuelle parallèlement au bord (angle donné par rapport à la verticale) :
 * fond soustrait, somme le long des droites parallèles au bord, cases de 1 px (case la plus proche), aire normalisée à 1. Pas de suréchantillonnage ici : une tache compacte ne couvre que quelques
 * lignes, pas assez de phases sous-pixel (c'est justement l'intérêt du bord long et incliné).
 */
export function projeterPoint(img: ArrayLike<number>, l: number, h: number, angleDeg: number, demiLargeur = 12) {
  // fond : médiane des bords de l'image
  const bord: number[] = [];
  for (let x = 0; x < l; x++) bord.push(img[x], img[(h - 1) * l + x]);
  bord.sort((p, q) => p - q);
  const fond = bord[Math.floor(bord.length / 2)];
  // centroïde
  let s = 0, cx = 0, cy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      const v = Math.max(0, img[y * l + x] - fond);
      s += v;
      cx += v * (x + 0.5);
      cy += v * (y + 0.5);
    }
  cx /= s;
  cy /= s;
  const th = (angleDeg * Math.PI) / 180;
  const nb = 2 * demiLargeur + 1;
  const p = new Float64Array(nb);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      // coordonnée le long de la normale au bord (le bord fait un angle th avec la verticale)
      const u = (x + 0.5 - cx) * Math.cos(th) - (y + 0.5 - cy) * Math.sin(th) + demiLargeur;
      const k = Math.round(u);
      if (k >= 0 && k < nb) p[k] += img[y * l + x] - fond;
    }
  const u = Float64Array.from({ length: nb }, (_, k) => k - demiLargeur);
  const prof = normaliserAire(p, 1);
  return { u, profil: prof, dx: 1, fwhm: largeurMiHauteur(prof, 1) };
}
