// A priori d'image pour le débruitage : min_x ½‖x − b‖² + λ Ψ(x), avec Ψ une pénalité sur les gradients.
// 1D : L2² (forme fermée, système tridiagonal), L1 / TV (gradient projeté sur le dual), L0 (exact, programmation
// dynamique du modèle de Potts). 2D : TV isotrope / anisotrope (primal-dual de Chambolle-Pock), L2² (forme fermée
// par FFT), L0 (lissage L0 de Xu et al. 2011, séparation demi-quadratique). Chapitre 08.
import { fft2d } from './fft';

// ---------- 1D ----------

/** Différences avant d_i = x_{i+1} − x_i (n − 1 valeurs). */
export function diff1D(x: ArrayLike<number>): Float64Array {
  const d = new Float64Array(x.length - 1);
  for (let i = 0; i < d.length; i++) d[i] = x[i + 1] - x[i];
  return d;
}

/** Dᵀp pour D les différences avant (p de taille n − 1, résultat de taille n). */
function diffT(p: ArrayLike<number>, n: number): Float64Array {
  const r = new Float64Array(n);
  for (let i = 0; i < n - 1; i++) {
    r[i] -= p[i];
    r[i + 1] += p[i];
  }
  return r;
}

/**
 * L2² : min ½‖x − b‖² + λ‖Dx‖²  ⇔  (I + 2λ DᵀD) x = b. DᵀD est tridiagonal (laplacien 1D, bords libres) :
 * résolution exacte par l'algorithme de Thomas, en O(n).
 */
export function l2Ferme1D(b: ArrayLike<number>, lambda: number): Float64Array {
  const n = b.length;
  const a = new Float64Array(n), diag = new Float64Array(n), c = new Float64Array(n), d = Float64Array.from(b as ArrayLike<number>);
  const k = 2 * lambda;
  for (let i = 0; i < n; i++) {
    const voisins = (i > 0 ? 1 : 0) + (i < n - 1 ? 1 : 0);
    diag[i] = 1 + k * voisins;
    if (i > 0) a[i] = -k;
    if (i < n - 1) c[i] = -k;
  }
  for (let i = 1; i < n; i++) {
    const m = a[i] / diag[i - 1];
    diag[i] -= m * c[i - 1];
    d[i] -= m * d[i - 1];
  }
  const x = new Float64Array(n);
  x[n - 1] = d[n - 1] / diag[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = (d[i] - c[i] * x[i + 1]) / diag[i];
  return x;
}

/**
 * TV 1D : min ½‖x − b‖² + λ‖Dx‖₁. Problème dual : min_p ½‖b − Dᵀp‖² sous |p_i| ≤ λ,
 * résolu par gradient projeté (pas 1/4 = 1/‖D‖²) ; x = b − Dᵀp.
 */
export function tv1D(b: ArrayLike<number>, lambda: number, iterations = 3000): Float64Array {
  const n = b.length;
  const p = new Float64Array(n - 1);
  let x = Float64Array.from(b as ArrayLike<number>);
  if (lambda <= 0) return x;
  for (let k = 0; k < iterations; k++) {
    const dtp = diffT(p, n);
    for (let i = 0; i < n; i++) x[i] = b[i] - dtp[i];
    for (let i = 0; i < n - 1; i++) p[i] = Math.max(-lambda, Math.min(lambda, p[i] + 0.25 * (x[i + 1] - x[i])));
  }
  const dtp = diffT(p, n);
  x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = b[i] - dtp[i];
  return x;
}

/**
 * L0 1D : min ½‖x − b‖² + λ·#{i : x_{i+1} ≠ x_i}. La solution est constante par morceaux (modèle de Potts) ;
 * programmation dynamique exacte : B(r) = min_l B(l − 1) + λ + E(l..r), E = ½ Σ (b − moyenne)².
 */
export function l0Potts1D(b: ArrayLike<number>, lambda: number): Float64Array {
  const n = b.length;
  const S = new Float64Array(n + 1), S2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    S[i + 1] = S[i] + b[i];
    S2[i + 1] = S2[i] + b[i] * b[i];
  }
  const E = (l: number, r: number) => {
    const m = r - l + 1, s = S[r + 1] - S[l];
    return 0.5 * (S2[r + 1] - S2[l] - (s * s) / m);
  };
  const B = new Float64Array(n + 1);
  const debut = new Int32Array(n);
  B[0] = -lambda; // le premier segment ne coûte pas de saut
  for (let r = 0; r < n; r++) {
    let best = Infinity, arg = 0;
    for (let l = 0; l <= r; l++) {
      const v = B[l] + lambda + E(l, r);
      if (v < best) {
        best = v;
        arg = l;
      }
    }
    B[r + 1] = best;
    debut[r] = arg;
  }
  const x = new Float64Array(n);
  let r = n - 1;
  while (r >= 0) {
    const l = debut[r];
    const m = (S[r + 1] - S[l]) / (r - l + 1);
    for (let i = l; i <= r; i++) x[i] = m;
    r = l - 1;
  }
  return x;
}

/** Opérateurs de seuillage : minimiseur de ½(x − b)² + λψ(x) pour un seul coefficient. */
export const seuillage = {
  l2: (b: number, lambda: number) => b / (1 + 2 * lambda),
  l1: (b: number, lambda: number) => Math.sign(b) * Math.max(0, Math.abs(b) - lambda),
  l0: (b: number, lambda: number) => (b * b > 2 * lambda ? b : 0),
};

// ---------- 2D ----------

/** Gradients avant, bords libres (différence nulle sur la dernière colonne / ligne). */
export function gradients(x: ArrayLike<number>, l: number, h: number): { dx: Float64Array; dy: Float64Array } {
  const dx = new Float64Array(l * h), dy = new Float64Array(l * h);
  for (let y = 0; y < h; y++)
    for (let i = 0; i < l; i++) {
      const k = y * l + i;
      if (i < l - 1) dx[k] = x[k + 1] - x[k];
      if (y < h - 1) dy[k] = x[k + l] - x[k];
    }
  return { dx, dy };
}

/** Valeur de l'a priori Ψ(x) sur les gradients (bords libres). */
export function valeurPrior(x: ArrayLike<number>, l: number, h: number, type: 'l0' | 'l1' | 'l1aniso' | 'l2', seuil = 1e-6): number {
  const { dx, dy } = gradients(x, l, h);
  let s = 0;
  for (let k = 0; k < l * h; k++) {
    const g2 = dx[k] * dx[k] + dy[k] * dy[k];
    if (type === 'l0') s += g2 > seuil * seuil ? 1 : 0;
    else if (type === 'l1') s += Math.sqrt(g2);
    else if (type === 'l1aniso') s += Math.abs(dx[k]) + Math.abs(dy[k]);
    else s += g2;
  }
  return s;
}

export interface Iterateur {
  x: Float64Array;
  pas(): void;
}

/**
 * TV 2D : min ½‖x − b‖² + λ TV(x), primal-dual de Chambolle-Pock (τ = σ = 0,35 ; τσ‖∇‖² ≤ 1).
 * Isotrope : |p| ≤ λ par pixel (projection sur un disque) ; anisotrope : |p_x|, |p_y| ≤ λ (sur un carré).
 */
export function tvDebruitage(b: ArrayLike<number>, l: number, h: number, lambda: number, isotrope = true): Iterateur {
  const n = l * h;
  const x = Float64Array.from(b as ArrayLike<number>);
  const xb = Float64Array.from(x);
  const px = new Float64Array(n), py = new Float64Array(n);
  const tau = 0.35, sigma = 0.35;
  return {
    x,
    pas() {
      // dual : p ← proj(p + σ ∇x̄)
      for (let y = 0; y < h; y++)
        for (let i = 0; i < l; i++) {
          const k = y * l + i;
          let qx = px[k] + sigma * (i < l - 1 ? xb[k + 1] - xb[k] : 0);
          let qy = py[k] + sigma * (y < h - 1 ? xb[k + l] - xb[k] : 0);
          if (isotrope) {
            const m = Math.max(1, Math.hypot(qx, qy) / Math.max(lambda, 1e-12));
            qx /= m;
            qy /= m;
          } else {
            qx = Math.max(-lambda, Math.min(lambda, qx));
            qy = Math.max(-lambda, Math.min(lambda, qy));
          }
          px[k] = qx;
          py[k] = qy;
        }
      // primal : x ← prox(x + τ div p), div = −∇ᵀ
      for (let y = 0; y < h; y++)
        for (let i = 0; i < l; i++) {
          const k = y * l + i;
          const div =
            (i < l - 1 ? px[k] : 0) - (i > 0 ? px[k - 1] : 0) + (y < h - 1 ? py[k] : 0) - (y > 0 ? py[k - l] : 0);
          const ancien = x[k];
          const v = (x[k] + tau * div + tau * b[k]) / (1 + tau);
          x[k] = v;
          xb[k] = 2 * v - ancien;
        }
    },
  };
}

/** Spectres |F(Dx)|², |F(Dy)|² et F(Dx), F(Dy) pour les différences avant périodiques. */
function spectresGradient(l: number, h: number) {
  const fx = { re: new Float64Array(l * h), im: new Float64Array(l * h) };
  const fy = { re: new Float64Array(l * h), im: new Float64Array(l * h) };
  for (let v = 0; v < h; v++)
    for (let u = 0; u < l; u++) {
      const k = v * l + u;
      const ax = (-2 * Math.PI * u) / l, ay = (-2 * Math.PI * v) / h;
      // x_{i+1} − x_i  ↔  (e^{iω} − 1) X(ω), convention de fft2d (noyau e^{−iωn})
      fx.re[k] = Math.cos(-ax) - 1;
      fx.im[k] = Math.sin(-ax);
      fy.re[k] = Math.cos(-ay) - 1;
      fy.im[k] = Math.sin(-ay);
    }
  return { fx, fy };
}

/** L2² 2D : x = F⁻¹( F(b) / (1 + 2λ(|F Dx|² + |F Dy|²)) ), conditions périodiques. */
export function l2Ferme2D(b: ArrayLike<number>, l: number, h: number, lambda: number): Float64Array {
  const re = Float64Array.from(b as ArrayLike<number>), im = new Float64Array(l * h);
  fft2d(re, im, l, h);
  const { fx, fy } = spectresGradient(l, h);
  for (let k = 0; k < l * h; k++) {
    const d = 1 + 2 * lambda * (fx.re[k] ** 2 + fx.im[k] ** 2 + fy.re[k] ** 2 + fy.im[k] ** 2);
    re[k] /= d;
    im[k] /= d;
  }
  fft2d(re, im, l, h, true);
  return re;
}

/**
 * L0 2D (Xu, Lu, Xu & Jia 2011) : min ½‖x − b‖² + λ‖g(x)‖₀, approché par séparation demi-quadratique :
 * variables auxiliaires (h, v) ≈ ∇x, β croissant ; h,v = ∇x si |∇x|² > 2λ/β, 0 sinon ; puis x par FFT.
 * Itérateur : un pas = une valeur de β. `fini` quand β atteint βmax.
 */
export function l0Lissage(b: ArrayLike<number>, l: number, h: number, lambda: number, o: { kappa?: number; betaMax?: number } = {}) {
  const n = l * h;
  const kappa = o.kappa ?? 2, betaMax = o.betaMax ?? 1e5;
  const lam = 2 * lambda; // ½‖x − b‖² + λ‖g‖₀ ⇔ ‖x − b‖² + 2λ‖g‖₀ (forme de Xu et al.)
  const x = Float64Array.from(b as ArrayLike<number>);
  const Fb = { re: Float64Array.from(b as ArrayLike<number>), im: new Float64Array(n) };
  fft2d(Fb.re, Fb.im, l, h);
  const { fx, fy } = spectresGradient(l, h);
  let beta = 2 * lam;
  const etat = { x, beta, fini: false, pas };
  function pas() {
    if (etat.fini) return;
    // sous-problème (h, v) : seuillage dur du gradient (périodique)
    const hx = new Float64Array(n), vy = new Float64Array(n);
    for (let y = 0; y < h; y++)
      for (let i = 0; i < l; i++) {
        const k = y * l + i;
        const gx = x[y * l + ((i + 1) % l)] - x[k];
        const gy = x[((y + 1) % h) * l + i] - x[k];
        if (gx * gx + gy * gy > lam / beta) {
          hx[k] = gx;
          vy[k] = gy;
        }
      }
    // sous-problème x : (1 + β DᵀD) x = b + β Dᵀ(h, v), diagonal en Fourier
    const Hr = hx, Hi = new Float64Array(n), Vr = vy, Vi = new Float64Array(n);
    fft2d(Hr, Hi, l, h);
    fft2d(Vr, Vi, l, h);
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      // conj(F Dx)·F h + conj(F Dy)·F v
      const nr = fx.re[k] * Hr[k] + fx.im[k] * Hi[k] + fy.re[k] * Vr[k] + fy.im[k] * Vi[k];
      const ni = fx.re[k] * Hi[k] - fx.im[k] * Hr[k] + fy.re[k] * Vi[k] - fy.im[k] * Vr[k];
      const d = 1 + beta * (fx.re[k] ** 2 + fx.im[k] ** 2 + fy.re[k] ** 2 + fy.im[k] ** 2);
      re[k] = (Fb.re[k] + beta * nr) / d;
      im[k] = (Fb.im[k] + beta * ni) / d;
    }
    fft2d(re, im, l, h, true);
    x.set(re);
    beta *= kappa;
    etat.beta = beta;
    if (beta > betaMax) etat.fini = true;
  }
  return etat;
}

// ---------- Canal sombre (He, Sun & Tang 2009) ----------

/** Minimum sur RGB puis minimum sur une fenêtre (2r+1)² : d(p) = min_{q∈Ω(p)} min_c x_c(q). */
export function canalSombre(rgb: ArrayLike<number>, l: number, h: number, r: number, A: [number, number, number] = [1, 1, 1]): Float64Array {
  const m = new Float64Array(l * h);
  for (let k = 0; k < l * h; k++) m[k] = Math.min(rgb[3 * k] / A[0], rgb[3 * k + 1] / A[1], rgb[3 * k + 2] / A[2]);
  // minimum séparable : lignes puis colonnes
  const t = new Float64Array(l * h), d = new Float64Array(l * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      let v = Infinity;
      for (let i = Math.max(0, x - r); i <= Math.min(l - 1, x + r); i++) v = Math.min(v, m[y * l + i]);
      t[y * l + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      let v = Infinity;
      for (let j = Math.max(0, y - r); j <= Math.min(h - 1, y + r); j++) v = Math.min(v, t[j * l + x]);
      d[y * l + x] = v;
    }
  return d;
}

/**
 * Débrumage par canal sombre : A estimée sur les 0,1 % de pixels les plus brillants du canal sombre,
 * t̃ = 1 − ω·dark(I/A), J = (I − A)/max(t̃, t₀) + A.
 */
export function debrumer(I: ArrayLike<number>, l: number, h: number, o: { r?: number; omega?: number; t0?: number } = {}) {
  const r = o.r ?? 7, omega = o.omega ?? 0.95, t0 = o.t0 ?? 0.1;
  const sombre = canalSombre(I, l, h, r);
  const ordre = Array.from({ length: l * h }, (_, k) => k).sort((a, b) => sombre[b] - sombre[a]);
  const nb = Math.max(1, Math.round(l * h * 0.001));
  let best = -1, A: [number, number, number] = [1, 1, 1];
  for (let j = 0; j < nb; j++) {
    const k = ordre[j];
    const s = I[3 * k] + I[3 * k + 1] + I[3 * k + 2];
    if (s > best) {
      best = s;
      A = [I[3 * k], I[3 * k + 1], I[3 * k + 2]];
    }
  }
  const sA = canalSombre(I, l, h, r, A);
  const t = new Float64Array(l * h);
  const J = new Float64Array(3 * l * h);
  for (let k = 0; k < l * h; k++) {
    t[k] = 1 - omega * sA[k];
    const tt = Math.max(t[k], t0);
    for (let c = 0; c < 3; c++) J[3 * k + c] = (I[3 * k + c] - A[c]) / tt + A[c];
  }
  return { sombre, A, t, J };
}
