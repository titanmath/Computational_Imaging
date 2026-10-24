// Générateur pseudo-aléatoire reproductible (mulberry32) + lois usuelles du bruit capteur.

export type Alea = () => number;

export function creerAlea(graine = 1): Alea {
  let a = graine >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loi normale centrée réduite (Box-Muller). */
export function gauss(alea: Alea): number {
  let u = 0;
  while (u === 0) u = alea();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * alea());
}

/**
 * Loi de Poisson de moyenne mu. Méthode de Knuth pour mu < 30,
 * approximation normale (avec correction de continuité) au-delà.
 */
export function poisson(alea: Alea, mu: number): number {
  if (mu <= 0) return 0;
  if (mu < 30) {
    const L = Math.exp(-mu);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= alea();
    } while (p > L);
    return k - 1;
  }
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * gauss(alea)));
}
