// Champ neuronal 1D : un petit MLP F_θ(u) (coordonnée → valeur) ajusté à UNE observation bruitée.
// Caractéristiques de Fourier aléatoires γ(u) = [sin 2πBu, cos 2πBu] (Tancik et al. 2020), deux couches tanh,
// sortie linéaire ; rétropropagation écrite à la main, optimiseur Adam, lot complet.
// Le réseau apprend d'abord les basses fréquences (biais spectral) : arrêté tôt, il débruite ; trop tard, il
// recopie le bruit. C'est le mécanisme du Deep Image Prior et des champs neuronaux (chapitre 08).
import { creerAlea, gauss } from './rng';

export interface OptionsChamp {
  /** Nombre de fréquences aléatoires. */
  m?: number;
  /** Écart-type des fréquences (cycles sur le domaine). */
  sigma?: number;
  /** Largeur des couches cachées. */
  largeur?: number;
  pas?: number;
  graine?: number;
}

export function creerChamp(u: ArrayLike<number>, b: ArrayLike<number>, o: OptionsChamp = {}) {
  const n = u.length;
  const m = o.m ?? 32, H = o.largeur ?? 48, eta = o.pas ?? 4e-3;
  const a = creerAlea(o.graine ?? 7);
  const B = Float64Array.from({ length: m }, () => (o.sigma ?? 12) * gauss(a));
  const F = 2 * m;
  // γ(u) précalculé : n × F
  const G = new Float64Array(n * F);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      G[i * F + j] = Math.sin(2 * Math.PI * B[j] * u[i]);
      G[i * F + m + j] = Math.cos(2 * Math.PI * B[j] * u[i]);
    }
  const init = (k: number, fanIn: number) => Float64Array.from({ length: k }, () => gauss(a) * Math.sqrt(1 / fanIn));
  // paramètres : W1 (F×H), b1 (H), W2 (H×H), b2 (H), w3 (H), b3
  const P = {
    W1: init(F * H, F),
    b1: new Float64Array(H),
    W2: init(H * H, H),
    b2: new Float64Array(H),
    w3: init(H, H),
    b3: new Float64Array(1),
  };
  type Cle = keyof typeof P;
  const cles = Object.keys(P) as Cle[];
  const M = Object.fromEntries(cles.map((k) => [k, new Float64Array(P[k].length)])) as Record<Cle, Float64Array>;
  const V = Object.fromEntries(cles.map((k) => [k, new Float64Array(P[k].length)])) as Record<Cle, Float64Array>;
  const Gr = Object.fromEntries(cles.map((k) => [k, new Float64Array(P[k].length)])) as Record<Cle, Float64Array>;
  const h1 = new Float64Array(n * H), h2 = new Float64Array(n * H);
  const sortie = new Float64Array(n);
  let t = 0;

  function avant() {
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < H; k++) {
        let s = P.b1[k];
        for (let j = 0; j < F; j++) s += G[i * F + j] * P.W1[j * H + k];
        h1[i * H + k] = Math.tanh(s);
      }
      for (let k = 0; k < H; k++) {
        let s = P.b2[k];
        for (let j = 0; j < H; j++) s += h1[i * H + j] * P.W2[j * H + k];
        h2[i * H + k] = Math.tanh(s);
      }
      let s = P.b3[0];
      for (let k = 0; k < H; k++) s += h2[i * H + k] * P.w3[k];
      sortie[i] = s;
    }
  }

  function pas() {
    avant();
    for (const k of cles) Gr[k].fill(0);
    const d2 = new Float64Array(H), d1 = new Float64Array(H);
    for (let i = 0; i < n; i++) {
      const e = (sortie[i] - b[i]) / n; // dérivée de ½·moyenne des carrés
      Gr.b3[0] += e;
      for (let k = 0; k < H; k++) {
        Gr.w3[k] += e * h2[i * H + k];
        d2[k] = e * P.w3[k] * (1 - h2[i * H + k] ** 2);
      }
      for (let j = 0; j < H; j++) {
        let s = 0;
        for (let k = 0; k < H; k++) {
          Gr.W2[j * H + k] += h1[i * H + j] * d2[k];
          s += P.W2[j * H + k] * d2[k];
        }
        d1[j] = s * (1 - h1[i * H + j] ** 2);
      }
      for (let k = 0; k < H; k++) {
        Gr.b2[k] += d2[k];
        Gr.b1[k] += d1[k];
      }
      for (let j = 0; j < F; j++) {
        const g = G[i * F + j];
        if (g === 0) continue;
        for (let k = 0; k < H; k++) Gr.W1[j * H + k] += g * d1[k];
      }
    }
    t++;
    const b1c = 1 - 0.9 ** t, b2c = 1 - 0.999 ** t;
    for (const k of cles) {
      const p = P[k], g = Gr[k], mm = M[k], vv = V[k];
      for (let i = 0; i < p.length; i++) {
        mm[i] = 0.9 * mm[i] + 0.1 * g[i];
        vv[i] = 0.999 * vv[i] + 0.001 * g[i] * g[i];
        p[i] -= (eta * (mm[i] / b1c)) / (Math.sqrt(vv[i] / b2c) + 1e-8);
      }
    }
    return t;
  }

  return {
    pas,
    /** Prédiction courante F_θ(u). */
    predire() {
      avant();
      return Float64Array.from(sortie);
    },
    get iteration() {
      return t;
    },
  };
}
