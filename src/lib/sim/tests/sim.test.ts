import { describe, expect, it } from 'vitest';
import { creerAlea, gauss, poisson } from '../rng';
import { fft1d, fft2d } from '../fft';
import { fwhm, noyauGauss, projectionHorizontale } from '../conv';
import { cholesky, MoindresCarres } from '../linalg';
import { cmf, encoderSrgb, xyzVersRgbLin } from '../couleur';
import { creerImg, psnr } from '../image';

describe('aléatoire', () => {
  it('Poisson : variance ≈ moyenne (bruit photonique)', () => {
    const a = creerAlea(7);
    for (const mu of [4, 16, 64]) {
      const n = 20000;
      let s = 0, s2 = 0;
      for (let i = 0; i < n; i++) {
        const k = poisson(a, mu);
        s += k;
        s2 += k * k;
      }
      const m = s / n;
      const v = s2 / n - m * m;
      expect(Math.abs(m - mu) / mu).toBeLessThan(0.03);
      expect(Math.abs(v - mu) / mu).toBeLessThan(0.08);
    }
  });
  it('Gauss : moyenne 0, écart-type 1', () => {
    const a = creerAlea(3);
    let s = 0, s2 = 0;
    const n = 50000;
    for (let i = 0; i < n; i++) {
      const g = gauss(a);
      s += g;
      s2 += g * g;
    }
    expect(Math.abs(s / n)).toBeLessThan(0.02);
    expect(Math.abs(Math.sqrt(s2 / n) - 1)).toBeLessThan(0.02);
  });
});

describe('FFT', () => {
  it('aller-retour 1D', () => {
    const re = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i) + (i % 5));
    const im = new Float64Array(64);
    const ref = Float64Array.from(re);
    fft1d(re, im);
    fft1d(re, im, true);
    re.forEach((v, i) => expect(v).toBeCloseTo(ref[i], 9));
  });
  it('2D : la composante continue vaut la somme', () => {
    const re = Float64Array.from({ length: 16 * 8 }, (_, i) => (i * 7) % 3);
    const im = new Float64Array(16 * 8);
    const somme = re.reduce((a, b) => a + b, 0);
    fft2d(re, im, 16, 8);
    expect(re[0]).toBeCloseTo(somme, 9);
  });
});

describe('PSF', () => {
  it('FWHM d’une gaussienne ≈ 2,355 σ', () => {
    for (const s of [1.5, 3, 5]) {
      const lsf = projectionHorizontale(noyauGauss(s));
      expect(fwhm(lsf)).toBeCloseTo(2.3548 * s, 0);
    }
  });
});

describe('algèbre linéaire', () => {
  it('Cholesky résout un système SPD', () => {
    const A = Float64Array.from([4, 2, 0, 2, 5, 1, 0, 1, 3]);
    const x = cholesky(A, Float64Array.from([2, 3, 4]), 3);
    expect(4 * x[0] + 2 * x[1]).toBeCloseTo(2, 9);
    expect(2 * x[0] + 5 * x[1] + x[2]).toBeCloseTo(3, 9);
    expect(x[1] + 3 * x[2]).toBeCloseTo(4, 9);
  });
  it('moindres carrés : exemple surdéterminé du cours', () => {
    // x1 + x2 = 3 ; 2x1 − x2 = 0 ; x1 − x2 = 1
    const mc = new MoindresCarres(2);
    mc.ajouter([0, 1], [1, 1], 3);
    mc.ajouter([0, 1], [2, -1], 0);
    mc.ajouter([0, 1], [1, -1], 1);
    const x = mc.resoudre();
    // équations normales : AᵀA = [[6,−2],[−2,3]], Aᵀb = [4,2] → x = (8/7, 10/7)
    expect(x[0]).toBeCloseTo(8 / 7, 9);
    expect(x[1]).toBeCloseTo(10 / 7, 9);
  });
});

describe('couleur et métriques (valeurs des slides)', () => {
  it('0,18 linéaire → 118/255 en sRGB', () => {
    expect(Math.round(encoderSrgb(0.18) * 255)).toBe(118);
    expect(encoderSrgb(0.18)).toBeCloseTo(0.46136, 4);
  });
  it('MSE = 0,01 → PSNR = 20 dB ; MSE = 0,0025 → 26,02 dB', () => {
    const a = creerImg(2, 2, 1);
    a.d.set([0.2, 0.2, 0.8, 0.8]);
    const b = creerImg(2, 2, 1);
    b.d.set([0.4, 0.2, 0.8, 0.8]);
    expect(psnr(a, b)).toBeCloseTo(20, 6);
  });
  it('CMF : ȳ culmine vers 555 nm', () => {
    let best = 0, lb = 0;
    for (let l = 400; l <= 700; l++) if (cmf(l)[1] > best) [best, lb] = [cmf(l)[1], l];
    expect(Math.abs(lb - 557)).toBeLessThan(6);
  });
  it('blanc D65 → sRGB ≈ (1,1,1)', () => {
    const rgb = xyzVersRgbLin([0.9505, 1.0, 1.089]);
    rgb.forEach((v) => expect(v).toBeCloseTo(1, 1));
  });
});

import { CAPTEUR_TYPE, energiePhoton, qeTypique, varianceAttendue } from '../capteur';
describe('capteur (valeurs des slides)', () => {
  it('énergie d’un photon : 450 nm → 4,41e-19 J, 650 nm → 3,06e-19 J', () => {
    expect(energiePhoton(450) / 1e-19).toBeCloseTo(4.41, 2);
    expect(energiePhoton(650) / 1e-19).toBeCloseTo(3.06, 2);
  });
  it('bruit total : g = 0,1, μd = 4, σread = 3 → σ = 0,47 / 0,68 / 1,10 DN', () => {
    const p = { ...CAPTEUR_TYPE, gain: 0.1, lecture: 3 };
    expect(Math.sqrt(varianceAttendue(p, 1, 4))).toBeCloseTo(0.47, 2);
    expect(Math.sqrt(varianceAttendue(p, 25, 4))).toBeCloseTo(0.68, 2);
    expect(Math.sqrt(varianceAttendue(p, 100, 4))).toBeCloseTo(1.1, 2);
  });
  it('QE typique : ≈ 85 % à 460 nm, ≈ 30 % à 900 nm', () => {
    expect(qeTypique(460)).toBeGreaterThan(0.8);
    expect(qeTypique(900)).toBeGreaterThan(0.25);
    expect(qeTypique(900)).toBeLessThan(0.38);
  });
});

import { ssim } from '../qualite';
describe('SSIM', () => {
  it('vaut 1 pour deux images identiques et baisse avec le bruit', () => {
    const a = creerImg(32, 32, 1);
    for (let i = 0; i < a.d.length; i++) a.d[i] = 0.5 + 0.3 * Math.sin(i * 0.3);
    expect(ssim(a, a)).toBeCloseTo(1, 6);
    const b = { ...a, d: a.d.map((v, i) => v + 0.1 * Math.sin(i * 7.7)) };
    expect(ssim(a, b)).toBeLessThan(0.97);
  });
});
