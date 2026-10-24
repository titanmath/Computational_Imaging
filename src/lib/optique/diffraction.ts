// PSF d'une pupille circulaire avec défocus, en optique scalaire de Fraunhofer (paraxiale) :
// h(x) ∝ |FFT{ P(ξ) · exp(i·2π/λ · W(ξ)) }|², avec W(ρ) = Δz · ρ² / (8 N²) (défocus).
import { fft2d } from '../sim/fft';

export interface PSFOnde {
  /** intensité normalisée au pic, taille n × n */
  h: Float64Array;
  n: number;
  /** pas d'échantillonnage dans le plan image (m) */
  dx: number;
}

export function psfOnde(N: number, dz: number, lambda = 550e-9, n = 256, echPupille = 64): PSFOnde {
  const re = new Float64Array(n * n);
  const im = new Float64Array(n * n);
  const W020 = dz / (8 * N * N); // m
  const k = (2 * Math.PI) / lambda;
  const r = echPupille / 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = (x - n / 2 + 0.5) / r;
      const v = (y - n / 2 + 0.5) / r;
      const rho2 = u * u + v * v;
      if (rho2 > 1) continue;
      const phase = k * W020 * rho2;
      re[y * n + x] = Math.cos(phase);
      im[y * n + x] = Math.sin(phase);
    }
  fft2d(re, im, n, n);
  const h = new Float64Array(n * n);
  let max = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      // recentrer (fftshift)
      const sx = (x + n / 2) % n;
      const sy = (y + n / 2) % n;
      const v = re[sy * n + sx] ** 2 + im[sy * n + sx] ** 2;
      h[y * n + x] = v;
      if (v > max) max = v;
    }
  for (let i = 0; i < h.length; i++) h[i] /= max;
  // dx = λ f / (n dξ) avec dξ = D / echPupille  →  λ N · echPupille / n
  return { h, n, dx: (lambda * N * echPupille) / n };
}

/** Rayon du premier anneau noir de la tache d'Airy : 1,22 λ N. */
export const rayonAiry = (N: number, lambda = 550e-9) => 1.22 * lambda * N;
/** Rayon du disque de flou géométrique pour un défocus Δz : |Δz| / (2N). */
export const rayonDefocus = (N: number, dz: number) => Math.abs(dz) / (2 * N);
