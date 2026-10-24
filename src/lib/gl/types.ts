// Contrat entre l'enveloppe <Scene3D> et chaque scène 3D.
// Une scène est un module qui exporte par défaut une fabrique asynchrone.
import type * as THREE_NS from 'three';
import type { Qualite } from './qualite';

export type THREE = typeof THREE_NS;

export interface ContexteScene {
  THREE: THREE;
  renderer: THREE_NS.WebGLRenderer;
  canvas: HTMLCanvasElement;
  qualite: Qualite;
  /** Dimensions CSS du canvas (pixels logiques). */
  largeur: number;
  hauteur: number;
  /** Paramètres initiaux (les mêmes que ceux passés ensuite à maj). */
  params: Record<string, unknown>;
  /** Demande un rendu au prochain frame (scènes qui ne s'animent pas en continu). */
  demanderRendu: () => void;
}

export interface InstanceScene {
  /** Nouveaux paramètres venant des curseurs. */
  maj?(params: Record<string, unknown>): void;
  /**
   * Un pas d'animation. Renvoie `true` si la scène a encore besoin de frames
   * (animation en cours, path tracer pas encore convergé), `false` sinon.
   */
  frame(t: number, dt: number): boolean;
  redimensionner?(largeur: number, hauteur: number): void;
  detruire(): void;
  /** Texte d'état facultatif affiché sous la scène (ex. « 128 échantillons / px »). */
  etat?(): string;
}

export type FabriqueScene = (ctx: ContexteScene) => Promise<InstanceScene> | InstanceScene;

export interface ModuleScene {
  default: FabriqueScene;
}
