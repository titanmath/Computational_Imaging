// Rayons lumineux « visibles » : polylignes épaisses (Line2) en couleur HDR pour le bloom,
// révélées progressivement le long de leur longueur (animation de propagation).
import type * as T from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { THREE } from './types';

type P3 = [number, number, number];

interface Trace {
  ligne: Line2;
  segments: number;
  /** Abscisse curviligne normalisée [0,1] de chaque point. */
  abscisses: number[];
}

export class Faisceau {
  readonly groupe: T.Group;
  private THREE: THREE;
  private traces: Trace[] = [];
  private materiaux = new Map<string, LineMaterial>();
  private largeur: number;
  private resolution: T.Vector2;

  constructor(THREE: THREE, opts: { largeur?: number } = {}) {
    this.THREE = THREE;
    this.groupe = new THREE.Group();
    this.largeur = opts.largeur ?? 2.2;
    this.resolution = new THREE.Vector2(800, 450);
  }

  private materiau(couleur: string | number, intensite: number, opacite: number): LineMaterial {
    const cle = `${couleur}|${intensite}|${opacite}`;
    let m = this.materiaux.get(cle);
    if (!m) {
      const c = new this.THREE.Color(couleur).multiplyScalar(intensite);
      m = new LineMaterial({
        color: c.getHex(),
        linewidth: this.largeur,
        transparent: opacite < 1,
        opacity: opacite,
        depthWrite: false,
        toneMapped: false,
        worldUnits: false,
      });
      m.color.copy(c); // garder les composantes > 1 (HDR) pour le bloom
      m.resolution.copy(this.resolution);
      this.materiaux.set(cle, m);
    }
    return m;
  }

  /** Ajoute un rayon passant par les points donnés (polyligne). */
  ajouter(points: P3[], couleur: string | number, o: { intensite?: number; opacite?: number; finesse?: number } = {}) {
    const finesse = o.finesse ?? 90;
    // Échantillonnage uniforme en longueur pour une propagation à vitesse constante.
    const longueurs = [0];
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1], points[i]];
      longueurs.push(longueurs[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    const total = longueurs[longueurs.length - 1] || 1;
    const pos: number[] = [];
    const abscisses: number[] = [];
    let j = 0;
    for (let k = 0; k <= finesse; k++) {
      const s = (k / finesse) * total;
      while (j < points.length - 2 && longueurs[j + 1] < s) j++;
      const t = (s - longueurs[j]) / (longueurs[j + 1] - longueurs[j] || 1);
      const a = points[j];
      const b = points[j + 1];
      pos.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
      abscisses.push(k / finesse);
    }
    const g = new LineGeometry();
    g.setPositions(pos);
    const ligne = new Line2(g, this.materiau(couleur, o.intensite ?? 2.2, o.opacite ?? 1));
    ligne.computeLineDistances();
    this.groupe.add(ligne);
    this.traces.push({ ligne, segments: finesse, abscisses });
    return ligne;
  }

  /** Révèle les rayons jusqu'à la fraction p de leur longueur (0 → rien, 1 → tout). */
  progression(p: number) {
    for (const t of this.traces) {
      const n = Math.max(0, Math.min(t.segments, Math.round(p * t.segments)));
      (t.ligne.geometry as LineGeometry).instanceCount = n;
      t.ligne.visible = n > 0;
    }
  }

  vider() {
    for (const t of this.traces) {
      this.groupe.remove(t.ligne);
      t.ligne.geometry.dispose();
    }
    this.traces = [];
  }

  redimensionner(l: number, h: number) {
    this.resolution.set(l, h);
    for (const m of this.materiaux.values()) m.resolution.set(l, h);
  }

  detruire() {
    this.vider();
    for (const m of this.materiaux.values()) m.dispose();
  }
}
