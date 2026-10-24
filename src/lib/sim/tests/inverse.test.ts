import { describe, expect, it } from 'vitest';
import { convoluer1D, deconvoluer1D, noyauGauss1D, spectre1D, tf2, noyauVersImage, convoluerFFT, wiener, deconvolutionTV } from '../inverse';
import { creerAlea, gauss } from '../rng';

describe('déconvolution', () => {
  it('sans bruit, le filtre inverse retrouve le signal (1D)', () => {
    const n = 128;
    const x = Float64Array.from({ length: n }, (_, i) => (i > 40 && i < 80 ? 1 : 0.2));
    const H = spectre1D(noyauGauss1D(1.1), n);
    const y = convoluer1D(x, H);
    const r = deconvoluer1D(y, H, 0);
    let e = 0;
    for (let i = 0; i < n; i++) e = Math.max(e, Math.abs(r[i] - x[i]));
    expect(e).toBeLessThan(1e-4);
  });
  it('avec un bruit de 0,005, le filtre inverse explose et Wiener reste raisonnable', () => {
    const n = 128;
    const a = creerAlea(1);
    const x = Float64Array.from({ length: n }, (_, i) => (i > 40 && i < 80 ? 1 : 0.2));
    const H = spectre1D(noyauGauss1D(1.1), n);
    const y = convoluer1D(x, H).map((v) => v + 0.005 * gauss(a));
    const rmse = (r: Float64Array) => Math.sqrt(r.reduce((s, v, i) => s + (v - x[i]) ** 2, 0) / n);
    expect(rmse(deconvoluer1D(y, H, 0))).toBeGreaterThan(0.2);
    expect(rmse(deconvoluer1D(y, H, 1e-3))).toBeLessThan(0.15);
  });
  it('TV améliore une déconvolution 2D bruitée par rapport à l’observation', () => {
    const l = 32, h = 32;
    const x = new Float64Array(l * h);
    for (let y = 0; y < h; y++) for (let i = 0; i < l; i++) x[y * l + i] = (i > 10 && i < 22 && y > 8 && y < 24) ? 0.9 : 0.1;
    const k = new Float64Array(25).fill(1 / 25);
    const K = tf2(noyauVersImage(k, 2, l, h), l, h);
    const a = creerAlea(3);
    const J = convoluerFFT(x, K).map((v) => v + 0.01 * gauss(a));
    const tv = deconvolutionTV(J, K, 0.004, { pasAppr: 0.02 });
    for (let it = 0; it < 150; it++) tv.pas();
    const rmse = (r: ArrayLike<number>) => Math.sqrt(Array.from(r).reduce((s, v, i) => s + (v - x[i]) ** 2, 0) / x.length);
    expect(rmse(tv.x)).toBeLessThan(rmse(J));
    expect(rmse(wiener(J, K, 1e-2))).toBeLessThan(rmse(J) * 1.2);
  });
});
