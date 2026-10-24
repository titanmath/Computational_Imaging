// Algèbre linéaire dense minimale : moindres carrés par équations normales + Cholesky.
// Suffisant pour les petits systèmes des simulations (Debevec-Malik : ~300 inconnues).

/** Résout A x = b pour A symétrique définie positive (n × n, ligne par ligne). */
export function cholesky(A: Float64Array, b: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      if (i === j) {
        if (s <= 0) s = 1e-12; // régularisation numérique minimale
        L[i * n + i] = Math.sqrt(s);
      } else L[i * n + j] = s / L[j * n + j];
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k];
    y[i] = s / L[i * n + i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
    x[i] = s / L[i * n + i];
  }
  return x;
}

/**
 * Accumulateur de moindres carrés creux : on ajoute des lignes (indices, coefficients, cible)
 * et on forme directement AᵀA et Aᵀb, sans stocker A.
 */
export class MoindresCarres {
  readonly n: number;
  private AtA: Float64Array;
  private Atb: Float64Array;
  lignes = 0;
  constructor(n: number) {
    this.n = n;
    this.AtA = new Float64Array(n * n);
    this.Atb = new Float64Array(n);
  }
  ajouter(indices: number[], coefs: number[], cible: number, poids = 1) {
    const w2 = poids * poids;
    for (let a = 0; a < indices.length; a++) {
      const i = indices[a];
      this.Atb[i] += w2 * coefs[a] * cible;
      for (let b = 0; b < indices.length; b++) this.AtA[i * this.n + indices[b]] += w2 * coefs[a] * coefs[b];
    }
    this.lignes++;
  }
  resoudre(): Float64Array {
    return cholesky(this.AtA, this.Atb, this.n);
  }
}
