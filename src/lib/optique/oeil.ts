// Œil schématique (inspiré de l'œil de Le Grand) pour le tracé de rayons exact :
// cornée (une surface), cristallin à deux faces dont la courbure varie avec l'accommodation.
// Unités : mm. Axe optique = x, cornée en x = 0.
import type { Surface, V3 } from './trace';
import { tracer } from './trace';

export const N_HUMEUR = 1.336;
export const N_CRISTALLIN = 1.42;

export function surfacesOeil(accommodation: number, demiPupille = 2): Surface[] {
  const Ra = 10.2 / (1 + 0.115 * accommodation);
  const Rp = -6.0 / (1 + 0.06 * accommodation);
  return [
    { x: 0, R: 7.8, nApres: () => N_HUMEUR, demiOuverture: 6 },
    { x: 3.6, R: Ra, nApres: () => N_CRISTALLIN, demiOuverture: demiPupille },
    { x: 7.6, R: Rp, nApres: () => N_HUMEUR, demiOuverture: 4.5 },
  ];
}

/** Longueur axiale (position de la rétine) selon l'œil. */
export const LONGUEUR = { emmetrope: 24.0, myope: 25.6, hypermetrope: 22.6 } as const;
export type TypeOeil = keyof typeof LONGUEUR;

/** Position du point de convergence (croisement de l'axe) des rayons d'un point à distance d (mm, Infinity possible). */
export function foyerOeil(accommodation: number, distance: number): number {
  const surf = surfacesOeil(accommodation);
  const h = 0.4;
  const o: V3 = isFinite(distance) ? [-distance, 0, 0] : [-1000, h, 0];
  const d: V3 = isFinite(distance) ? [distance, h, 0] : [1, 0, 0];
  const pts = tracer(o, d, surf, 40);
  if (!pts) return NaN;
  const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
  return a[0] - (a[1] * (b[0] - a[0])) / (b[1] - a[1]);
}

/** Accommodation (unités du modèle) nécessaire pour focaliser un objet à d sur la rétine de longueur L. */
export function accommodationNecessaire(distance: number, L: number): number {
  let a = 0, b = 14;
  for (let k = 0; k < 40; k++) {
    const m = (a + b) / 2;
    if (foyerOeil(m, distance) > L) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** Facteur de conversion approché « unités du modèle » → dioptries d'accommodation. */
export const DIOPTRIES_PAR_UNITE = 1.32;

/** Lunette mince (n = 1,5, faces symétriques) de puissance P (dioptries) placée à 12 mm devant la cornée. */
export function lunette(P: number): Surface[] {
  if (Math.abs(P) < 1e-3) return [];
  const n = 1.5;
  const R = (2 * (n - 1)) / (P / 1000); // mm
  return [
    { x: -12.5, R, nApres: () => n, demiOuverture: 12 },
    { x: -11.5, R: -R, nApres: () => 1, demiOuverture: 12 },
  ];
}

/** Puissance de lunette qui ramène le foyer de l'infini (œil au repos) sur la rétine. */
export function correction(L: number): number {
  let a = -12, b = 12;
  const foyer = (P: number) => {
    const surf = [...lunette(P), ...surfacesOeil(0)];
    const pts = tracer([-1000, 0.4, 0], [1, 0, 0], surf, 40);
    if (!pts) return NaN;
    const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
    return p[0] - (p[1] * (q[0] - p[0])) / (q[1] - p[1]);
  };
  for (let k = 0; k < 40; k++) {
    const m = (a + b) / 2;
    // plus de puissance → foyer plus court
    if (foyer(m) > L) a = m;
    else b = m;
  }
  return (a + b) / 2;
}
