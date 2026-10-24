// Optique géométrique paraxiale : sténopé, lentille mince, profondeur de champ.
// Unités : mètres sauf mention contraire.

/** Équation de la lentille mince 1/Z + 1/S = 1/f → S (distance image) pour un objet à Z. */
export const distanceImage = (f: number, Z: number) => (f * Z) / (Z - f);
/** … et l'objet net Z pour un capteur placé à S. */
export const distanceObjetNette = (f: number, S: number) => (f * S) / (S - f);

/**
 * Diamètre du cercle de flou géométrique sur le capteur (lentille mince d'ouverture D,
 * capteur à S, objet à Z) : c = D · |S − S_Z| / S_Z, avec S_Z l'image nette de Z.
 */
export function cercleFlou(f: number, D: number, S: number, Z: number): number {
  const SZ = distanceImage(f, Z);
  return (D * Math.abs(S - SZ)) / SZ;
}

/** Champ de vision (rad) pour une dimension de capteur H et une distance f. */
export const champDeVision = (H: number, f: number) => 2 * Math.atan(H / (2 * f));

/** Profondeur de champ approchée (slides) : DoF ≈ 2 c Z0² / (f D). */
export const profondeurDeChamp = (c: number, Z0: number, f: number, D: number) => (2 * c * Z0 * Z0) / (f * D);

/** Sténopé : flou géométrique b_g = d (s + f) / s, flou de diffraction b_d = 2.44 λ f / d. */
export const flouGeometrique = (d: number, f: number, s: number) => (d * (s + f)) / s;
export const flouDiffraction = (d: number, f: number, lambda = 550e-9) => (2.44 * lambda * f) / d;
/** Diamètre optimal (équilibre des deux flous) : d_opt = √(2.44 λ f s / (s + f)) ≈ √(2.44 λ f). */
export const diametreOptimal = (f: number, s: number, lambda = 550e-9) =>
  Math.sqrt((2.44 * lambda * f * s) / (s + f));

/** Indice de réfraction d'un verre (loi de Cauchy, BK7 approché), λ en nm. */
export const indiceCauchy = (lambdaNm: number, A = 1.5046, B = 4200) => A + B / (lambdaNm * lambdaNm);
