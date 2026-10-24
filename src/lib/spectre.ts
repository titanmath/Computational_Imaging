// Couleur d'accent de chaque chapitre, prise dans le spectre visible.
// 00 → 410 nm (violet) … 08 → 650 nm (rouge) ; au-delà on continue vers 700 nm.
import { hexSpectral, teinteSpectrale } from './sim/couleur';

export function nmDuChapitre(numero: number, nm?: number): number {
  if (nm) return nm;
  if (numero <= 8) return 410 + numero * 30;
  return Math.min(700, 650 + (numero - 8) * 8);
}

export interface Accent {
  nm: number;
  /** Accent lisible sur papier clair. */
  clair: string;
  /** Accent lisible sur ardoise. */
  sombre: string;
  /** Couleur spectrale brute (gradients, lumière). */
  brut: string;
}

export function accent(nm: number): Accent {
  const h = teinteSpectrale(nm).toFixed(1);
  // Le jaune-vert paraît plus clair à luminance OKLab égale : on baisse un peu L.
  const jaune = nm > 540 && nm < 600 ? 0.06 : 0;
  return {
    nm,
    clair: `oklch(${(0.5 - jaune).toFixed(3)} 0.15 ${h})`,
    sombre: `oklch(${(0.8 - jaune / 2).toFixed(3)} 0.13 ${h})`,
    brut: hexSpectral(nm),
  };
}

/** Dégradé CSS du spectre visible (motif « rayon diffracté »). */
export function degradeSpectre(de = 400, a = 700, pas = 12): string {
  const arrets: string[] = [];
  for (let i = 0; i <= pas; i++) {
    const nm = de + ((a - de) * i) / pas;
    arrets.push(`${hexSpectral(nm)} ${((100 * i) / pas).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${arrets.join(', ')})`;
}
