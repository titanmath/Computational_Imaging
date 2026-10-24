// Imagerie HDR : expositions simulées, courbe de réponse (CRF), fusion pondérée, solveur de Debevec-Malik,
// et opérateurs de tone mapping. Partagé par le chapitre 06 et l'assignment 2.
import { MoindresCarres } from './linalg';
import { creerAlea, gauss, type Alea } from './rng';

/**
 * Courbe de réponse « téléphone » simulée : exposition relative X = E·t → valeur 8 bits.
 * Gamma + épaule douce (tone curve), puis écrêtage et quantification. Monotone croissante.
 */
export function crfTelephone(X: number, canal = 1): number {
  const a = [0.47, 0.45, 0.43][canal];
  const u = Math.pow(Math.max(0, X), a);
  const v = (1.32 * u) / (u + 0.32); // épaule
  return Math.max(0, Math.min(255, Math.round(255 * v - 2)));
}

/** Pondération « chapeau » de Debevec-Malik : nulle aux extrémités, maximale au milieu. */
export function poidsChapeau(z: number, zmin = 0, zmax = 255): number {
  const milieu = (zmin + zmax) / 2;
  return z <= milieu ? z - zmin : zmax - z;
}

export interface Observations {
  /** Z[i][j] : valeur du pixel i dans l'image j */
  Z: number[][];
  /** ln Δt_j */
  B: number[];
}

/**
 * Debevec & Malik (SIGGRAPH 1997), « gsolve » :
 *   min Σ_ij { w(Z_ij) [g(Z_ij) − ln E_i − ln Δt_j] }²  +  λ Σ_z [ w(z) g''(z) ]²,  avec g(128) = 0.
 * Inconnues : g(0..255) puis ln E_i. Résolution par équations normales (moindres carrés).
 */
export function gsolve(obs: Observations, lambda: number, w: (z: number) => number = poidsChapeau): { g: Float64Array; lnE: Float64Array } {
  const n = 256;
  const N = obs.Z.length;
  const mc = new MoindresCarres(n + N);
  for (let i = 0; i < N; i++)
    for (let j = 0; j < obs.B.length; j++) {
      const z = obs.Z[i][j];
      const wij = w(z) + 1e-3; // +ε : garde le système bien posé même aux extrémités
      mc.ajouter([z, n + i], [1, -1], obs.B[j], wij);
    }
  // ancrage : g(128) = 0
  mc.ajouter([128], [1], 0, 10);
  // lissage : λ w(z) (g(z−1) − 2 g(z) + g(z+1)) = 0
  for (let z = 1; z < 255; z++) mc.ajouter([z - 1, z, z + 1], [1, -2, 1], 0, lambda * (w(z) + 1e-3));
  const x = mc.resoudre();
  return { g: x.slice(0, n), lnE: x.slice(n) };
}

/** Échantillonne N positions et simule leurs valeurs sous plusieurs temps de pose (un canal). */
export function simulerObservations(
  irradiances: number[],
  temps: number[],
  o: { canal?: number; bruit?: number; graine?: number } = {},
): Observations {
  const alea: Alea = creerAlea(o.graine ?? 1);
  const Z = irradiances.map((E) => temps.map((t) => crfTelephone(E * t * Math.exp((o.bruit ?? 0.01) * gauss(alea)), o.canal ?? 1)));
  return { Z, B: temps.map(Math.log) };
}

/** g « vraie » (ln f⁻¹) d'une CRF monotone, par inversion numérique, normalisée à g(128) = 0. */
export function gVraie(canal = 1): Float64Array {
  const g = new Float64Array(256).fill(NaN);
  // balayer X sur une large plage en log
  for (let k = 0; k <= 4000; k++) {
    const lnX = -9 + (k / 4000) * 11;
    const z = crfTelephone(Math.exp(lnX), canal);
    if (Number.isNaN(g[z])) g[z] = lnX;
  }
  // combler les trous par interpolation
  for (let z = 0; z < 256; z++)
    if (Number.isNaN(g[z])) {
      let a = z - 1, b = z + 1;
      while (a >= 0 && Number.isNaN(g[a])) a--;
      while (b < 256 && Number.isNaN(g[b])) b++;
      g[z] = a < 0 ? g[b] : b > 255 ? g[a] : g[a] + ((g[b] - g[a]) * (z - a)) / (b - a);
    }
  const ref = g[128];
  return g.map((v) => v - ref);
}

/** Fusion HDR : ln E_i = Σ_j w(Z_ij)(g(Z_ij) − ln Δt_j) / Σ_j w(Z_ij). */
export function fusion(Z: number[], g: ArrayLike<number>, B: number[], w: (z: number) => number = poidsChapeau): number {
  let num = 0, den = 0;
  Z.forEach((z, j) => {
    const p = w(z);
    num += p * (g[z] - B[j]);
    den += p;
  });
  return den > 0 ? num / den : g[Z[Math.floor(Z.length / 2)]] - B[Math.floor(Z.length / 2)];
}

// --- Tone mapping ---
export const reinhard = (L: number) => L / (1 + L);
