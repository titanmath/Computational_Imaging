// Tracé de rayons exact à travers des dioptres sphériques (loi de Snell vectorielle).
// Axe optique = x. Chaque surface est une calotte sphérique de sommet xs et de rayon R
// (R > 0 : centre à droite). Utilisé pour montrer les aberrations réelles.

export type V3 = [number, number, number];

export interface Surface {
  x: number; // position du sommet sur l'axe
  R: number; // rayon de courbure (Infinity = plan)
  /** indice après la surface (fonction de λ en nm) */
  nApres: (lambda: number) => number;
  demiOuverture: number;
}

const sous = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const ajout = (a: V3, b: V3, k = 1): V3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const pt = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norme = (a: V3): V3 => {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
};

/** Réfraction de la direction unitaire d à travers la normale n (orientée contre d), n1 → n2. */
export function refracter(d: V3, n: V3, n1: number, n2: number): V3 | null {
  const eta = n1 / n2;
  const c = -pt(d, n);
  const k = 1 - eta * eta * (1 - c * c);
  if (k < 0) return null; // réflexion totale
  return norme(ajout([d[0] * eta, d[1] * eta, d[2] * eta], n, eta * c - Math.sqrt(k)));
}

function intersecter(o: V3, d: V3, s: Surface): { p: V3; n: V3 } | null {
  if (!isFinite(s.R)) {
    const t = (s.x - o[0]) / d[0];
    if (t <= 0) return null;
    return { p: ajout(o, d, t), n: [-1, 0, 0] };
  }
  const c: V3 = [s.x + s.R, 0, 0];
  const oc = sous(o, c);
  const b = pt(oc, d);
  const disc = b * b - (pt(oc, oc) - s.R * s.R);
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  // on prend l'intersection du côté du sommet
  const t = s.R > 0 ? -b - sq : -b + sq;
  if (t <= 1e-9) return null;
  const p = ajout(o, d, t);
  let n = norme(sous(p, c));
  if (pt(n, d) > 0) n = [-n[0], -n[1], -n[2]];
  return { p, n };
}

/**
 * Trace un rayon à travers les surfaces puis jusqu'au plan x = xCapteur.
 * Renvoie la polyligne (points) ou null si le rayon est bloqué.
 */
export function tracer(o: V3, d: V3, surfaces: Surface[], xCapteur: number, lambda = 550): V3[] | null {
  const pts: V3[] = [o];
  let n1 = 1;
  let pos = o;
  let dir = norme(d);
  for (const s of surfaces) {
    const h = intersecter(pos, dir, s);
    if (!h) return null;
    if (Math.hypot(h.p[1], h.p[2]) > s.demiOuverture) return null;
    const n2 = s.nApres(lambda);
    const nd = refracter(dir, h.n, n1, n2);
    if (!nd) return null;
    pts.push(h.p);
    pos = h.p;
    dir = nd;
    n1 = n2;
  }
  const t = (xCapteur - pos[0]) / dir[0];
  pts.push(ajout(pos, dir, t));
  return pts;
}

/** Lentille simple biconvexe (singulet) : deux surfaces de rayons R1, R2, épaisseur e. */
export function singulet(x: number, R1: number, R2: number, e: number, demi: number, n: (l: number) => number): Surface[] {
  return [
    { x, R: R1, nApres: n, demiOuverture: demi },
    { x: x + e, R: R2, nApres: () => 1, demiOuverture: demi },
  ];
}

/** Focale paraxiale d'un singulet épais (formule du fabricant de lentilles). */
export function focaleSingulet(R1: number, R2: number, e: number, n: number): number {
  const p = (n - 1) * (1 / R1 - 1 / R2 + ((n - 1) * e) / (n * R1 * R2));
  return 1 / p;
}
