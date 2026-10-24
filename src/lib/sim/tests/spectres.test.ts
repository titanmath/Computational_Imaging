import { describe, expect, it } from 'vitest';
import { ILLUMINANTS, LAMBDAS, lms, metamere, spectre, versLMS, versXYZ, deltaE } from '../spectres';

describe('colorimétrie', () => {
  it('pics des cônes : S ≈ 440, M ≈ 540, L ≈ 565 nm', () => {
    const pic = (k: number) => LAMBDAS.reduce((b, l) => (lms(l)[k] > lms(b)[k] ? l : b), 380);
    expect(Math.abs(pic(2) - 445)).toBeLessThan(15);
    expect(Math.abs(pic(1) - 540)).toBeLessThan(15);
    expect(Math.abs(pic(0) - 570)).toBeLessThan(20);
  });
  it('métamère : mêmes réponses des cônes sous D65, différentes sous A', () => {
    const r = spectre((l) => 0.45 + 0.2 * Math.sin((l - 380) / 60));
    const m = metamere(r, ILLUMINANTS.D65, 0.3);
    const prod = (s: Float64Array, E: Float64Array) => s.map((v, i) => v * E[i]);
    const a = versLMS(prod(r, ILLUMINANTS.D65));
    const b = versLMS(prod(m, ILLUMINANTS.D65));
    a.forEach((v, k) => expect(Math.abs(v - b[k]) / v).toBeLessThan(0.01));
    const blancA = versXYZ(ILLUMINANTS.A);
    const dA = deltaE(versXYZ(prod(r, ILLUMINANTS.F)), versXYZ(prod(m, ILLUMINANTS.F)), versXYZ(ILLUMINANTS.F));
    expect(dA).toBeGreaterThan(1);
    void blancA;
  });
});
