import { describe, expect, it } from 'vitest';
import { canalSombre, debrumer, diff1D, l0Lissage, l0Potts1D, l2Ferme1D, l2Ferme2D, seuillage, tv1D, tvDebruitage, valeurPrior } from '../priors';
import { signalMorceaux } from '../scenes';
import { creerAlea, gauss } from '../rng';

const bruite = (s: ArrayLike<number>, sigma: number, graine = 3) => {
  const a = creerAlea(graine);
  return Float64Array.from(s as ArrayLike<number>, (v) => v + sigma * gauss(a));
};
const rmse = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
};

describe('priors 1D', () => {
  const x = signalMorceaux(160);
  const b = bruite(x, 0.06);
  it('λ = 0 rend l’observation', () => {
    expect(rmse(l2Ferme1D(b, 0), b)).toBeLessThan(1e-12);
    expect(rmse(tv1D(b, 0), b)).toBeLessThan(1e-12);
    expect(rmse(l0Potts1D(b, 0), b)).toBeLessThan(1e-12);
  });
  it('L2² vérifie les équations normales', () => {
    const lam = 3;
    const s = l2Ferme1D(b, lam);
    const d = diff1D(s);
    // (I + 2λDᵀD)s = b
    for (let i = 0; i < s.length; i++) {
      const dtd = (i > 0 ? d[i - 1] : 0) - (i < s.length - 1 ? d[i] : 0);
      expect(s[i] + 2 * lam * dtd).toBeCloseTo(b[i], 9);
    }
  });
  it('les trois a priori débruitent', () => {
    expect(rmse(l2Ferme1D(b, 2), x)).toBeLessThan(rmse(b, x));
    expect(rmse(tv1D(b, 0.08), x)).toBeLessThan(rmse(b, x) * 0.7);
    expect(rmse(l0Potts1D(b, 0.05), x)).toBeLessThan(rmse(b, x));
  });
  it('TV : sous-optimalité négligeable vs perturbations', () => {
    const lam = 0.08;
    const s = tv1D(b, lam);
    const J = (v: ArrayLike<number>) => 0.5 * rmse(v, b) ** 2 * v.length + lam * diff1D(v).reduce((a, c) => a + Math.abs(c), 0);
    const a = creerAlea(9);
    for (let k = 0; k < 20; k++) {
      const p = Float64Array.from(s, (v) => v + 0.002 * gauss(a));
      expect(J(p)).toBeGreaterThan(J(s) - 1e-6);
    }
  });
  it('L0 très fort : une seule constante (la moyenne)', () => {
    const s = l0Potts1D(b, 1e6);
    const m = b.reduce((a, c) => a + c, 0) / b.length;
    expect(Math.max(...s) - Math.min(...s)).toBeLessThan(1e-12);
    expect(s[0]).toBeCloseTo(m, 10);
  });
  it('seuillages', () => {
    expect(seuillage.l1(0.3, 0.1)).toBeCloseTo(0.2);
    expect(seuillage.l1(0.05, 0.1)).toBe(0);
    expect(seuillage.l0(0.3, 0.02)).toBe(0.3);
    expect(seuillage.l0(0.1, 0.02)).toBe(0);
    expect(seuillage.l2(0.3, 1)).toBeCloseTo(0.1);
  });
});

describe('priors 2D', () => {
  const l = 64, h = 32;
  const x = new Float64Array(l * h);
  for (let y = 0; y < h; y++) for (let i = 0; i < l; i++) x[y * l + i] = (i > 20 && i < 44 && y > 8 && y < 24 ? 0.8 : 0.2);
  const b = bruite(x, 0.1, 5);
  it('TV isotrope et anisotrope débruitent', () => {
    for (const iso of [true, false]) {
      const it_ = tvDebruitage(b, l, h, 0.1, iso);
      for (let k = 0; k < 300; k++) it_.pas();
      expect(rmse(it_.x, x)).toBeLessThan(rmse(b, x) * 0.4);
    }
  });
  it('L2² 2D et L0 2D débruitent', () => {
    expect(rmse(l2Ferme2D(b, l, h, 0.65), x)).toBeLessThan(rmse(b, x));
    const z = l0Lissage(b, l, h, 0.02);
    while (!z.fini) z.pas();
    expect(rmse(z.x, x)).toBeLessThan(rmse(b, x) * 0.5);
    // très peu de gradients non nuls
    expect(valeurPrior(z.x, l, h, 'l0', 1e-3)).toBeLessThan(0.15 * l * h);
  });
  it('TV iso vs aniso pour ∇ = (3, 4)', () => {
    const v = new Float64Array([0, 3, 4, 0]); // 2×2 : dx(0,0) = 3, dy(0,0) = 4
    expect(valeurPrior(v, 2, 2, 'l1')).toBeCloseTo(5 + 4 + 3, 9); // pixel (0,0) : 5 ; (1,0) : dy = 0 − 3 ; (0,1) : dx = 0 − 4
    expect(valeurPrior(v, 2, 2, 'l1aniso')).toBeCloseTo(7 + 3 + 4, 9);
  });
});

describe('canal sombre', () => {
  it('brume synthétique : t estimée proche de la vraie', () => {
    const l = 32, h = 32;
    const A: [number, number, number] = [0.9, 0.92, 0.95];
    const I = new Float64Array(3 * l * h), tv = new Float64Array(l * h);
    const a = creerAlea(2);
    for (let k = 0; k < l * h; k++) {
      const t = 0.3 + 0.6 * ((k % l) / l);
      tv[k] = t;
      const J = [a() * 0.6, a() * 0.6, 0.02]; // canal bleu sombre : le prior tient
      for (let c = 0; c < 3; c++) I[3 * k + c] = J[c] * t + A[c] * (1 - t);
    }
    // une bande de ciel (t = 0) pour l'estimation de A
    for (let k = 0; k < 4 * l; k++) for (let c = 0; c < 3; c++) I[3 * k + c] = A[c];
    const r = debrumer(I, l, h, { r: 1, omega: 1 });
    expect(r.A[2]).toBeCloseTo(0.95, 6);
    let e = 0;
    for (let k = 6 * l; k < l * h; k++) e += Math.abs(r.t[k] - tv[k]);
    expect(e / (l * h - 6 * l)).toBeLessThan(0.04);
    expect(canalSombre(I, l, h, 0)[l + 3]).toBeGreaterThanOrEqual(0);
  });
});
