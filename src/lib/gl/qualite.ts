// Qualité adaptative : on mesure le temps de frame et on ajuste l'échelle de rendu
// et le budget de calcul (échantillons de path tracing, particules…).

export type Palier = 'bas' | 'moyen' | 'haut';

const BUDGETS: Record<Palier, { echelle: number; spp: number; particules: number; rebonds: number }> = {
  bas: { echelle: 0.55, spp: 1, particules: 0.35, rebonds: 2 },
  moyen: { echelle: 0.8, spp: 2, particules: 0.65, rebonds: 3 },
  haut: { echelle: 1, spp: 4, particules: 1, rebonds: 4 },
};

export function palierInitial(): Palier {
  if (typeof window === 'undefined') return 'moyen';
  const coeurs = navigator.hardwareConcurrency ?? 4;
  const petit = Math.min(window.innerWidth, window.innerHeight) < 600;
  const tactile = matchMedia('(pointer: coarse)').matches;
  if (petit || tactile || coeurs <= 4) return 'bas';
  if (coeurs <= 8) return 'moyen';
  return 'haut';
}

export class Qualite {
  palier: Palier;
  private moyenne = 16.7;
  private stableDepuis = 0;
  private ecouteurs = new Set<() => void>();

  constructor(palier: Palier = palierInitial()) {
    this.palier = palier;
  }

  get budget() {
    return BUDGETS[this.palier];
  }

  /** Ratio de pixels effectif (DPR plafonné × échelle du palier). */
  get ratioPixels(): number {
    const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    return dpr * this.budget.echelle;
  }

  surChangement(f: () => void): () => void {
    this.ecouteurs.add(f);
    return () => this.ecouteurs.delete(f);
  }

  /** À appeler à chaque frame avec la durée écoulée (ms). */
  observer(dtMs: number, maintenant: number) {
    if (dtMs <= 0 || dtMs > 250) return; // onglet en pause, etc.
    this.moyenne = this.moyenne * 0.92 + dtMs * 0.08;
    if (maintenant - this.stableDepuis < 1500) return; // laisser la mesure se stabiliser
    let suivant: Palier = this.palier;
    if (this.moyenne > 26) suivant = this.palier === 'haut' ? 'moyen' : 'bas';
    else if (this.moyenne < 13 && this.palier !== 'haut') suivant = this.palier === 'bas' ? 'moyen' : 'haut';
    if (suivant !== this.palier) {
      this.palier = suivant;
      this.stableDepuis = maintenant;
      this.moyenne = 16.7;
      for (const f of this.ecouteurs) f();
    }
  }

  get fps(): number {
    return 1000 / this.moyenne;
  }
}

export function webgl2Disponible(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}
