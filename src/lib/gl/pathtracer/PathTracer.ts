// Path tracer progressif : chaque frame ajoute quelques échantillons par pixel dans une
// texture flottante (ping-pong). Changer un paramètre remet l'accumulation à zéro.
import type * as T from 'three';
import type { THREE } from '../types';
import { fragmentAccumulation, FRAGMENT_AFFICHAGE, VERTEX } from './glsl';

export interface CameraPhysique {
  mode: 'stenope' | 'lentille';
  position: [number, number, number];
  cible: [number, number, number];
  /** Taille du capteur (m) : on ajuste la largeur au rapport d'aspect du canvas. */
  hauteurCapteur: number;
  /** Distance ouverture → capteur S (m). */
  distanceCapteur: number;
  /** Diamètre du trou ou de la pupille (m). */
  ouverture: number;
  /** Focale (lentille mince), m. */
  focale?: number;
  /** Diamètre de référence pour la luminosité (souvent = ouverture → luminosité constante). */
  ouvertureReference?: number;
  vignetage?: boolean;
}

export interface OptionsPathTracer {
  /** Code GLSL : `bool scene(Rayon r, inout Impact h)` et `vec3 ciel(vec3 d)`. */
  scene: string;
  uniformsScene?: Record<string, T.IUniform>;
  echantillonsMax?: number;
}

export class PathTracer {
  readonly uniforms: Record<string, T.IUniform>;
  private THREE: THREE;
  private renderer: T.WebGLRenderer;
  private cibles: [T.WebGLRenderTarget, T.WebGLRenderTarget];
  private matAccum: T.RawShaderMaterial;
  private matAffichage: T.RawShaderMaterial;
  private quad: T.Mesh;
  private scene: T.Scene;
  private camOrtho: T.OrthographicCamera;
  private n = 0;
  private frame = 0;
  echantillonsMax: number;
  spp = 2;
  rebonds = 4;
  largeur = 1;
  hauteur = 1;

  constructor(THREE: THREE, renderer: T.WebGLRenderer, opts: OptionsPathTracer) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.echantillonsMax = opts.echantillonsMax ?? 1024;
    const float = renderer.extensions.has('EXT_color_buffer_float');
    const cible = () =>
      new THREE.WebGLRenderTarget(1, 1, {
        type: float ? THREE.FloatType : THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
      });
    this.cibles = [cible(), cible()];

    this.uniforms = {
      uPrec: { value: null },
      uN: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uGraine: { value: 0 },
      uSpp: { value: 2 },
      uRebonds: { value: 4 },
      uSoleilDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uSoleil: { value: new THREE.Vector3(3, 2.8, 2.5) },
      uTemps: { value: 0 },
      uModeCam: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uCamRot: { value: new THREE.Matrix3() },
      uCapteur: { value: new THREE.Vector2(0.036, 0.024) },
      uDistCapteur: { value: 0.05 },
      uOuverture: { value: 0.001 },
      uFocale: { value: 0.05 },
      uOuvRef: { value: 0.001 },
      uVignetage: { value: 0 },
      ...opts.uniformsScene,
    };

    this.matAccum = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX,
      fragmentShader: fragmentAccumulation(opts.scene),
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.matAffichage = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT_AFFICHAGE,
      uniforms: {
        uAccum: { value: null },
        uExposition: { value: 1 },
        uTonemap: { value: 1 },
        uBruit: { value: 0 },
        uVue: { value: 0 },
        uAir: { value: new THREE.Vector3(1, 1, 1) },
        uRayon: { value: 4 },
        uOmega: { value: 0.95 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.scene = new THREE.Scene();
    this.camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.matAccum);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  get echantillons() {
    return this.n;
  }
  get converge() {
    return this.n >= this.echantillonsMax;
  }

  set exposition(v: number) {
    this.matAffichage.uniforms.uExposition.value = v;
  }
  set bruit(v: number) {
    this.matAffichage.uniforms.uBruit.value = v;
  }
  set tonemap(v: boolean) {
    this.matAffichage.uniforms.uTonemap.value = v ? 1 : 0;
  }
  /** 0 : écrêtage (capteur), 1 : ACES, 2 : Reinhard. */
  set modeTonemap(m: 0 | 1 | 2) {
    this.matAffichage.uniforms.uTonemap.value = m;
  }

  /** Vue d'affichage : 0 image, 1 canal sombre, 2 débrumage (He et al. 2009) avec A, rayon et ω donnés. */
  regarder(vue: 0 | 1 | 2, o: { air?: [number, number, number]; rayon?: number; omega?: number } = {}) {
    const u = this.matAffichage.uniforms;
    u.uVue.value = vue;
    if (o.air) (u.uAir.value as T.Vector3).set(...o.air);
    if (o.rayon !== undefined) u.uRayon.value = Math.max(0, Math.min(6, Math.round(o.rayon)));
    if (o.omega !== undefined) u.uOmega.value = o.omega;
  }

  reinitialiser() {
    this.n = 0;
  }

  /** Taille interne en pixels (déjà multipliée par le ratio de pixels). */
  redimensionner(l: number, h: number) {
    l = Math.max(1, Math.round(l));
    h = Math.max(1, Math.round(h));
    if (l === this.largeur && h === this.hauteur) return;
    this.largeur = l;
    this.hauteur = h;
    for (const c of this.cibles) c.setSize(l, h);
    (this.uniforms.uRes.value as T.Vector2).set(l, h);
    this.reinitialiser();
  }

  regler(cam: CameraPhysique) {
    const THREE = this.THREE;
    const u = this.uniforms;
    u.uModeCam.value = cam.mode === 'lentille' ? 1 : 0;
    const pos = new THREE.Vector3(...cam.position);
    const cible = new THREE.Vector3(...cam.cible);
    const m = new THREE.Matrix4().lookAt(pos, cible, new THREE.Vector3(0, 1, 0));
    (u.uCamRot.value as T.Matrix3).setFromMatrix4(m);
    (u.uCamPos.value as T.Vector3).copy(pos);
    const aspect = this.largeur / this.hauteur;
    (u.uCapteur.value as T.Vector2).set(cam.hauteurCapteur * aspect, cam.hauteurCapteur);
    u.uDistCapteur.value = cam.distanceCapteur;
    u.uOuverture.value = cam.ouverture;
    u.uFocale.value = cam.focale ?? cam.distanceCapteur;
    u.uOuvRef.value = cam.ouvertureReference ?? cam.ouverture;
    u.uVignetage.value = cam.vignetage ? 1 : 0;
    this.reinitialiser();
  }

  /** Ajoute des échantillons puis affiche. Renvoie true s'il reste du travail. */
  rendre(): boolean {
    const r = this.renderer;
    if (!this.converge) {
      const [lire, ecrire] = this.cibles;
      const spp = Math.max(1, Math.min(16, this.spp));
      this.uniforms.uPrec.value = this.n === 0 ? null : lire.texture;
      this.uniforms.uN.value = this.n;
      this.uniforms.uSpp.value = spp;
      this.uniforms.uRebonds.value = this.rebonds;
      this.uniforms.uGraine.value = (this.frame++ * 2654435761) >>> 0;
      this.quad.material = this.matAccum;
      r.setRenderTarget(ecrire);
      r.render(this.scene, this.camOrtho);
      this.n += spp;
      this.cibles = [ecrire, lire];
    }
    this.matAffichage.uniforms.uAccum.value = this.cibles[0].texture;
    this.quad.material = this.matAffichage;
    r.setRenderTarget(null);
    r.render(this.scene, this.camOrtho);
    return !this.converge;
  }

  detruire() {
    for (const c of this.cibles) c.dispose();
    this.matAccum.dispose();
    this.matAffichage.dispose();
    this.quad.geometry.dispose();
  }
}
