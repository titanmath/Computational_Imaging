// Modèle de capteur (EMVA 1288, simplifié) partagé par les chapitres Capteurs, ISP, Calibration, HDR et A2.
//   N_e = min(Poisson(α·N_γ) + Poisson(D·t), Q_FW)
//   I   = Q( g · (N_e + n_read) + b ),   n_read ~ N(0, σ_read²)
import { creerAlea, gauss, poisson, type Alea } from './rng';

export interface ParamsCapteur {
  /** efficacité quantique α (0–1) */
  qe: number;
  /** capacité du puits (électrons) */
  puits: number;
  /** gain global g (DN par électron) */
  gain: number;
  /** niveau noir b (DN) */
  noir: number;
  /** bruit de lecture σ_read (électrons) */
  lecture: number;
  /** courant d'obscurité D (électrons / s) */
  obscurite: number;
  /** nombre de bits de l'ADC */
  bits: number;
}

export const CAPTEUR_TYPE: ParamsCapteur = {
  qe: 0.6,
  puits: 12000,
  gain: 0.25,
  noir: 64,
  lecture: 3,
  obscurite: 2,
  bits: 12,
};

/** Une mesure d'un pixel : N_γ photons incidents pendant t secondes. Renvoie la valeur numérique (DN). */
export function mesurerPixel(p: ParamsCapteur, photons: number, t: number, alea: Alea): number {
  const ne = Math.min(p.puits, poisson(alea, p.qe * photons) + poisson(alea, p.obscurite * t));
  const v = p.gain * (ne + p.lecture * gauss(alea)) + p.noir;
  const max = 2 ** p.bits - 1;
  return Math.min(max, Math.max(0, Math.round(v)));
}

/** Mesure d'une carte de photons (un canal) → DN. */
export function mesurerImage(p: ParamsCapteur, photons: Float32Array, t: number, graine = 1): Float32Array {
  const alea = creerAlea(graine);
  const out = new Float32Array(photons.length);
  for (let i = 0; i < photons.length; i++) out[i] = mesurerPixel(p, photons[i], t, alea);
  return out;
}

/** Variance attendue du signal en DN² : σ_I² = g²(μ_s + μ_d + σ_read²) + 1/12 (quantification). */
export function varianceAttendue(p: ParamsCapteur, mus: number, mud: number): number {
  return p.gain * p.gain * (mus + mud + p.lecture * p.lecture) + 1 / 12;
}

/** Énergie d'un photon (J) : E = h c / λ. */
export const energiePhoton = (lambdaNm: number) => (6.62607015e-34 * 299792458) / (lambdaNm * 1e-9);

/** Efficacité quantique approchée d'un capteur scientifique (allure ORCA-Quest 2, slides). */
export function qeTypique(lambdaNm: number): number {
  // pic ~ 0,85 vers 460 nm, chute vers l'UV et l'infrarouge (≈ 0,30 à 900 nm)
  const bleu = 1 / (1 + Math.exp(-(lambdaNm - 330) / 22));
  const ir = 1 / (1 + Math.exp((lambdaNm - 830) / 75));
  return Math.max(0, 0.9 * bleu * (0.15 + 0.85 * ir) - 0.02);
}
