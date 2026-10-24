import { describe, expect, it } from 'vitest';
import { gsolve, gVraie, simulerObservations, crfTelephone } from '../hdr';
import { creerAlea } from '../rng';

describe('Debevec-Malik', () => {
  it('la CRF simulée est monotone', () => {
    let p = -1;
    for (let k = 0; k < 400; k++) {
      const z = crfTelephone(Math.exp(-8 + k * 0.025));
      expect(z).toBeGreaterThanOrEqual(p);
      p = z;
    }
  });
  it('retrouve g = ln f⁻¹ à quelques % près dans la plage utile', () => {
    const a = creerAlea(2);
    const E = Array.from({ length: 80 }, () => Math.exp(-4 + 6 * a()));
    const t = [1 / 500, 1 / 250, 1 / 125, 1 / 60, 1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1].map((x) => x * 8);
    const obs = simulerObservations(E, t, { bruit: 0.01 });
    const { g } = gsolve(obs, 30);
    const vrai = gVraie();
    let err = 0, n = 0;
    for (let z = 20; z <= 235; z++) {
      err += (g[z] - vrai[z]) ** 2;
      n++;
    }
    expect(Math.sqrt(err / n)).toBeLessThan(0.08); // en unités de ln (≈ 8 %)
    expect(Math.abs(g[128])).toBeLessThan(1e-3);
  });
});
