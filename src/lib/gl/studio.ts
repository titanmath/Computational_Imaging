// « Studio » commun aux scènes à base de maillages : caméra perspective, orbite amortie et bornée,
// éclairage de table optique, post-traitement bloom (les rayons lumineux « brillent »).
import type * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { ContexteScene } from './types';

export interface OptionsStudio {
  position?: [number, number, number];
  cible?: [number, number, number];
  fov?: number;
  orbite?: boolean;
  /** Limites d'orbite (radians) autour de la vue initiale. */
  azimut?: number;
  polaire?: [number, number];
  distance?: [number, number];
  bloom?: { force: number; rayon: number; seuil: number } | false;
  fond?: number;
  /** Rotation automatique lente tant que l'utilisateur n'a pas touché la scène. */
  autoRotation?: number;
}

export interface Studio {
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  controles?: OrbitControls;
  rendre(): void;
  redimensionner(l: number, h: number): void;
  /** true pendant que l'amortissement de l'orbite est en cours. */
  bouge(): boolean;
  detruire(): void;
}

export function creerStudio(ctx: ContexteScene, o: OptionsStudio = {}): Studio {
  const { THREE, renderer, canvas } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.fond ?? 0x0d0f12);
  const camera = new THREE.PerspectiveCamera(o.fov ?? 35, ctx.largeur / ctx.hauteur, 0.01, 200);
  camera.position.set(...(o.position ?? [4, 2.5, 6]));
  const cible = new THREE.Vector3(...(o.cible ?? [0, 0, 0]));
  camera.lookAt(cible);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  // Éclairage doux de « table optique » + liseré froid.
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1a1712, 0.55));
  const cle = new THREE.DirectionalLight(0xfff2e0, 1.6);
  cle.position.set(4, 6, 5);
  scene.add(cle);
  const lisere = new THREE.DirectionalLight(0x9fb7ff, 0.6);
  lisere.position.set(-5, 2, -4);
  scene.add(lisere);

  let controles: OrbitControls | undefined;
  let interagi = false;
  if (o.orbite !== false) {
    controles = new OrbitControls(camera, canvas);
    controles.target.copy(cible);
    controles.enableDamping = true;
    controles.dampingFactor = 0.08;
    controles.enablePan = false;
    controles.rotateSpeed = 0.7;
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(cible));
    const az = o.azimut ?? Math.PI / 2.2;
    controles.minAzimuthAngle = sph.theta - az;
    controles.maxAzimuthAngle = sph.theta + az;
    controles.minPolarAngle = o.polaire?.[0] ?? 0.25;
    controles.maxPolarAngle = o.polaire?.[1] ?? Math.PI / 2;
    controles.minDistance = o.distance?.[0] ?? sph.radius * 0.55;
    controles.maxDistance = o.distance?.[1] ?? sph.radius * 1.6;
    controles.autoRotate = !!o.autoRotation;
    controles.autoRotateSpeed = o.autoRotation ?? 0;
    controles.addEventListener('start', () => {
      interagi = true;
      if (controles) controles.autoRotate = false;
    });
    controles.addEventListener('change', () => ctx.demanderRendu());
    controles.update();
  }

  let composer: EffectComposer | undefined;
  if (o.bloom !== false) {
    const b = o.bloom ?? { force: 0.9, rayon: 0.5, seuil: 0.6 };
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(ctx.largeur, ctx.hauteur), b.force, b.rayon, b.seuil));
    composer.addPass(new OutputPass());
  }

  return {
    scene,
    camera,
    controles,
    rendre() {
      controles?.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    redimensionner(l, h) {
      camera.aspect = l / h;
      camera.updateProjectionMatrix();
      composer?.setPixelRatio(renderer.getPixelRatio());
      composer?.setSize(l, h);
    },
    bouge: () => !!controles && (controles.autoRotate || interagi),
    detruire() {
      controles?.dispose();
      composer?.dispose();
      scene.traverse((obj) => {
        const m = obj as T.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as T.Material | T.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    },
  };
}
