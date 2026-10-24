import { describe, expect, it } from 'vitest';
import { champDeVision, diametreOptimal, distanceImage, distanceObjetNette, indiceCauchy } from './lentille';
import { focaleSingulet, singulet, tracer } from './trace';

const deg = (r: number) => (r * 180) / Math.PI;

describe('lentille mince (exemples des slides)', () => {
  it('f = 50 mm, S = 60 mm → Z = 300 mm', () => expect(distanceObjetNette(50, 60)).toBeCloseTo(300, 9));
  it('f = 50 mm, Z = 500 mm → S ≈ 55,56 mm', () => expect(distanceImage(50, 500)).toBeCloseTo(55.556, 2));
  it('mise au point : Z = 1 m → S = 52,63 mm', () => expect(distanceImage(50, 1000)).toBeCloseTo(52.63, 2));
  it('FoV pour H = 24 mm', () => {
    expect(deg(champDeVision(24, 12))).toBeCloseTo(90, 1);
    expect(deg(champDeVision(24, 24))).toBeCloseTo(53.1, 1);
    expect(deg(champDeVision(24, 48))).toBeCloseTo(28.1, 1);
  });
});

describe('sténopé (A1)', () => {
  it('d_opt ≈ 0,58 mm pour f = 26 cm, λ = 550 nm, objet à 10 m', () => {
    expect(diametreOptimal(0.26, 10) * 1000).toBeCloseTo(0.583, 2);
  });
});

describe('tracé de rayons exact', () => {
  it('un rayon paraxial converge au foyer du singulet', () => {
    const n = indiceCauchy(550);
    const R1 = 0.05, R2 = -0.05, e = 0.006;
    const f = focaleSingulet(R1, R2, e, n);
    const surf = singulet(0, R1, R2, e, 0.02, () => n);
    // foyer image ≈ plan principal image + f ; on cherche le croisement de l'axe
    const pts = tracer([-1, 0.0005, 0], [1, 0, 0], surf, 1)!;
    const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
    const xCroise = a[0] - (a[1] * (b[0] - a[0])) / (b[1] - a[1]);
    // le foyer est à ~f de la lentille (à l'épaisseur près)
    expect(Math.abs(xCroise - f)).toBeLessThan(0.004);
  });
  it('aberration sphérique : les rayons marginaux focalisent avant les rayons paraxiaux', () => {
    const n = indiceCauchy(550);
    const surf = singulet(0, 0.05, -0.05, 0.012, 0.03, () => n);
    const croise = (h: number) => {
      const pts = tracer([-1, h, 0], [1, 0, 0], surf, 1)!;
      const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
      return a[0] - (a[1] * (b[0] - a[0])) / (b[1] - a[1]);
    };
    expect(croise(0.02)).toBeLessThan(croise(0.001));
  });
});

import { psfOnde, rayonAiry } from './diffraction';
describe('diffraction', () => {
  it('Airy à f/4, 550 nm : premier zéro à 2,68 µm (slide)', () => {
    expect(rayonAiry(4) * 1e6).toBeCloseTo(2.68, 2);
    const p = psfOnde(4, 0);
    const c = p.n / 2;
    // chercher le premier minimum le long de la ligne centrale
    let i = 1;
    while (p.h[c * p.n + c + i + 1] < p.h[c * p.n + c + i]) i++;
    const r = (i + 0.5) * p.dx; // centre du pixel ≈ position
    expect(Math.abs(r - rayonAiry(4)) / rayonAiry(4)).toBeLessThan(0.15);
  });
});
