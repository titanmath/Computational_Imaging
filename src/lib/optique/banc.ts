// Banc d'aberrations partagé entre la scène 3D (rayons visibles) et le diagramme de points 2D.
// Un singulet biconvexe réel (surfaces sphériques), tracé exact par la loi de Snell.
import { indiceCauchy } from './lentille';
import { focaleSingulet, singulet, tracer, type Surface, type V3 } from './trace';

export type Aberration = 'spherique' | 'coma' | 'chromatique';

export const BANC = {
  R1: 60, // mm
  R2: -60,
  e: 9,
  demi: 20, // demi-ouverture (mm)
  xLentille: 0,
};

/** Verre très dispersif pour rendre l'aberration chromatique visible (flint). */
export const indiceFlint = (l: number) => indiceCauchy(l, 1.6, 12000);
export const indiceCrown = (l: number) => indiceCauchy(l);

export function surfacesBanc(chromatique: boolean): Surface[] {
  const n = chromatique ? indiceFlint : indiceCrown;
  return singulet(BANC.xLentille, BANC.R1, BANC.R2, BANC.e, BANC.demi, n);
}

/** Position du foyer paraxial (550 nm) derrière la lentille, en mm. */
export function foyerParaxial(chromatique: boolean): number {
  const surf = surfacesBanc(chromatique);
  const pts = tracer([-200, 0.05, 0], [1, 0, 0], surf, 400, 550)!;
  const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
  return a[0] - (a[1] * (b[0] - a[0])) / (b[1] - a[1]);
}

export function focaleBanc(): number {
  return focaleSingulet(BANC.R1, BANC.R2, BANC.e, indiceCrown(550));
}

export interface RayonBanc {
  points: V3[];
  lambda: number;
  /** hauteur relative dans la pupille (0 = centre, 1 = bord) */
  rho: number;
}

/**
 * Rayons incidents parallèles (objet à l'infini), d'angle de champ `champ` (degrés),
 * échantillonnant la pupille : `anneaux` × `secteurs`. xCapteur relatif à la lentille (mm).
 */
export function rayonsBanc(
  type: Aberration,
  xCapteur: number,
  o: { anneaux?: number; secteurs?: number; champ?: number; meridien?: boolean; aleatoire?: number } = {},
): RayonBanc[] {
  const chrom = type === 'chromatique';
  const surf = surfacesBanc(chrom);
  const champ = ((o.champ ?? (type === 'coma' ? 9 : 0)) * Math.PI) / 180;
  const dir: V3 = [Math.cos(champ), Math.sin(champ), 0];
  const lambdas = chrom ? [460, 550, 640] : [550];
  const out: RayonBanc[] = [];
  const anneaux = o.anneaux ?? 6;
  const secteurs = o.secteurs ?? 12;
  const rMax = BANC.demi * 0.98;
  for (const lambda of lambdas) {
    const pupille: [number, number, number][] = [];
    if (o.aleatoire) {
      // échantillonnage uniforme de la pupille (suite de Halton, base 2 et 3) : pas d'anneaux artificiels
      const halton = (i: number, b: number) => {
        let f = 1, r = 0;
        while (i > 0) {
          f /= b;
          r += f * (i % b);
          i = Math.floor(i / b);
        }
        return r;
      };
      for (let i = 1; i <= o.aleatoire; i++) {
        const r = Math.sqrt(halton(i, 2)) * rMax;
        const th = halton(i, 3) * Math.PI * 2;
        pupille.push([r * Math.cos(th), r * Math.sin(th), r / rMax]);
      }
    } else if (o.meridien) {
      for (let i = -anneaux; i <= anneaux; i++) pupille.push([(i / anneaux) * rMax, 0, Math.abs(i / anneaux)]);
    } else {
      pupille.push([0, 0, 0]);
      for (let a = 1; a <= anneaux; a++) {
        const r = (a / anneaux) * rMax;
        const ns = Math.max(6, Math.round((secteurs * a) / anneaux));
        for (let s = 0; s < ns; s++) {
          const th = (s / ns) * Math.PI * 2;
          pupille.push([r * Math.cos(th), r * Math.sin(th), a / anneaux]);
        }
      }
    }
    for (const [py, pz, rho] of pupille) {
      // point de départ : sur le plan x = −80, de sorte à passer par (0, py, pz) au niveau de la lentille
      const x0 = -80;
      const o3: V3 = [x0, py + (x0 * dir[1]) / dir[0], pz];
      const pts = tracer(o3, dir, surf, xCapteur, lambda);
      if (pts) out.push({ points: pts, lambda, rho });
    }
  }
  return out;
}

/** Diagramme de points : impacts (y, z) sur le capteur, en mm. */
export function impacts(type: Aberration, xCapteur: number, n = 2500): { y: number; z: number; lambda: number }[] {
  const r = rayonsBanc(type, xCapteur, { aleatoire: type === 'chromatique' ? Math.round(n / 2) : n });
  return r.map((k) => {
    const p = k.points[k.points.length - 1];
    return { y: p[1], z: p[2], lambda: k.lambda };
  });
}
