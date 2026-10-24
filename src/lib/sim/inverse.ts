// Problèmes inverses en imagerie : convolution circulaire par FFT, filtrage inverse, Wiener,
// déconvolution régularisée par variation totale (descente de gradient avec Adam).
import { fft1d, fft2d } from './fft';

export interface Spectre2D {
  re: Float64Array;
  im: Float64Array;
  l: number;
  h: number;
}

/** Transformée de Fourier 2D d'une image (un canal). */
export function tf2(d: ArrayLike<number>, l: number, h: number): Spectre2D {
  const re = Float64Array.from(d as ArrayLike<number>);
  const im = new Float64Array(l * h);
  fft2d(re, im, l, h);
  return { re, im, l, h };
}

/** Noyau (centré, taille impaire) plongé dans une image l × h, centre ramené en (0, 0) pour la convolution circulaire. */
export function noyauVersImage(k: ArrayLike<number>, r: number, l: number, h: number): Float64Array {
  const t = 2 * r + 1;
  const out = new Float64Array(l * h);
  for (let y = 0; y < t; y++)
    for (let x = 0; x < t; x++) {
      const yy = (y - r + h) % h, xx = (x - r + l) % l;
      out[yy * l + xx] += k[y * t + x];
    }
  return out;
}

function produit(a: Spectre2D, b: Spectre2D): Spectre2D {
  const re = new Float64Array(a.re.length), im = new Float64Array(a.re.length);
  for (let i = 0; i < re.length; i++) {
    re[i] = a.re[i] * b.re[i] - a.im[i] * b.im[i];
    im[i] = a.re[i] * b.im[i] + a.im[i] * b.re[i];
  }
  return { re, im, l: a.l, h: a.h };
}
function inverse(s: Spectre2D): Float64Array {
  const re = Float64Array.from(s.re), im = Float64Array.from(s.im);
  fft2d(re, im, s.l, s.h, true);
  return re;
}

/** J = I ∗ K (circulaire), via ℱ(I) ⊙ ℱ(K). */
export function convoluerFFT(I: ArrayLike<number>, K: Spectre2D): Float64Array {
  return inverse(produit(tf2(I, K.l, K.h), K));
}

/** Filtrage inverse (direct) : I* = ℱ⁻¹(ℱ(J) / ℱ(K)). Seuil minimal pour éviter la division par zéro exacte. */
export function filtreInverse(J: ArrayLike<number>, K: Spectre2D, eps = 1e-12): Float64Array {
  const Y = tf2(J, K.l, K.h);
  const re = new Float64Array(Y.re.length), im = new Float64Array(Y.re.length);
  for (let i = 0; i < re.length; i++) {
    const d = K.re[i] ** 2 + K.im[i] ** 2 + eps;
    re[i] = (Y.re[i] * K.re[i] + Y.im[i] * K.im[i]) / d;
    im[i] = (Y.im[i] * K.re[i] - Y.re[i] * K.im[i]) / d;
  }
  return inverse({ re, im, l: K.l, h: K.h });
}

/** Wiener : I* = ℱ⁻¹( H* Y / (|H|² + α) ). */
export function wiener(J: ArrayLike<number>, K: Spectre2D, alpha: number): Float64Array {
  const Y = tf2(J, K.l, K.h);
  const re = new Float64Array(Y.re.length), im = new Float64Array(Y.re.length);
  for (let i = 0; i < re.length; i++) {
    const d = K.re[i] ** 2 + K.im[i] ** 2 + alpha;
    re[i] = (Y.re[i] * K.re[i] + Y.im[i] * K.im[i]) / d;
    im[i] = (Y.im[i] * K.re[i] - Y.re[i] * K.im[i]) / d;
  }
  return inverse({ re, im, l: K.l, h: K.h });
}

/**
 * Déconvolution TV : min_x ½‖K∗x − J‖² + λ TV_ε(x), TV_ε = Σ √((∂ₓx)² + (∂ᵧx)² + ε) (version lisse de la TV isotrope).
 * Itérateur : chaque appel à `pas()` fait une itération d'Adam ; on peut l'animer.
 */
export function deconvolutionTV(J: Float64Array, K: Spectre2D, lambda: number, o: { pasAppr?: number; eps?: number } = {}) {
  const { l, h } = K;
  const eta = o.pasAppr ?? 0.02;
  const eps = o.eps ?? 1e-4;
  // conjugué du noyau (pour Kᵀ) : on conjugue le spectre
  const Kc: Spectre2D = { re: K.re, im: K.im.map((v) => -v), l, h };
  const x = Float64Array.from(J);
  const m = new Float64Array(l * h), v = new Float64Array(l * h);
  const b1 = 0.9, b2 = 0.999;
  let t = 0;
  function gradient(): Float64Array {
    const r = convoluerFFT(x, K);
    for (let i = 0; i < r.length; i++) r[i] -= J[i];
    const g = convoluerFFT(r, Kc); // Kᵀ(Kx − J)
    // gradient de la TV lisse (différences avant, conditions périodiques)
    const px = new Float64Array(l * h), py = new Float64Array(l * h);
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < l; xx++) {
        const i = yy * l + xx;
        const dx = x[yy * l + ((xx + 1) % l)] - x[i];
        const dy = x[((yy + 1) % h) * l + xx] - x[i];
        const n = Math.sqrt(dx * dx + dy * dy + eps);
        px[i] = dx / n;
        py[i] = dy / n;
      }
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < l; xx++) {
        const i = yy * l + xx;
        // −div(p) = −(px[i] − px[i−1] + py[i] − py[i−l])
        const div = px[i] - px[yy * l + ((xx - 1 + l) % l)] + py[i] - py[((yy - 1 + h) % h) * l + xx];
        g[i] += lambda * -div;
      }
    return g;
  }
  return {
    x,
    pas() {
      t++;
      const g = gradient();
      for (let i = 0; i < x.length; i++) {
        m[i] = b1 * m[i] + (1 - b1) * g[i];
        v[i] = b2 * v[i] + (1 - b2) * g[i] * g[i];
        const mh = m[i] / (1 - b1 ** t), vh = v[i] / (1 - b2 ** t);
        x[i] -= (eta * mh) / (Math.sqrt(vh) + 1e-8);
      }
      return t;
    },
  };
}

// --- 1D ---
/** Spectre d'un noyau 1D (taille impaire, centré) sur n échantillons. */
export function spectre1D(k: number[], n: number): { re: Float64Array; im: Float64Array } {
  const r = (k.length - 1) / 2;
  const re = new Float64Array(n), im = new Float64Array(n);
  k.forEach((v, i) => (re[(i - r + n) % n] += v));
  fft1d(re, im);
  return { re, im };
}
export function convoluer1D(x: ArrayLike<number>, H: { re: Float64Array; im: Float64Array }): Float64Array {
  const n = H.re.length;
  const re = Float64Array.from(x as ArrayLike<number>), im = new Float64Array(n);
  fft1d(re, im);
  const pr = new Float64Array(n), pi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    pr[i] = re[i] * H.re[i] - im[i] * H.im[i];
    pi[i] = re[i] * H.im[i] + im[i] * H.re[i];
  }
  fft1d(pr, pi, true);
  return pr;
}
export function deconvoluer1D(y: ArrayLike<number>, H: { re: Float64Array; im: Float64Array }, alpha: number): Float64Array {
  const n = H.re.length;
  const re = Float64Array.from(y as ArrayLike<number>), im = new Float64Array(n);
  fft1d(re, im);
  const pr = new Float64Array(n), pi = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const d = H.re[i] ** 2 + H.im[i] ** 2 + alpha + 1e-15;
    pr[i] = (re[i] * H.re[i] + im[i] * H.im[i]) / d;
    pi[i] = (im[i] * H.re[i] - re[i] * H.im[i]) / d;
  }
  fft1d(pr, pi, true);
  return pr;
}
export const noyauGauss1D = (sigma: number) => {
  const r = Math.ceil(3 * sigma);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const s = k.reduce((a, b) => a + b, 0);
  return k.map((v) => v / s);
};
