// Chapitre 02 — obturateur global vs roulant sur une hélice 3D.
// À gauche : la scène en direct (avec la ligne de lecture qui balaie). À droite : l'image du capteur,
// construite dans une texture persistante, bande de lignes par bande de lignes, chaque bande étant
// rendue à l'instant où elle est lue. En mode global, toutes les lignes sont lues au même instant.
// Paramètres : tours (tours/s), balayage (ms pour lire tout le capteur), mode ('roulant' | 'global').
import type * as T from 'three';
import type { FabriqueScene } from '../types';

const fabrique: FabriqueScene = (ctx) => {
  const { THREE, renderer } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0f12);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);
  scene.add(new THREE.HemisphereLight(0xe8eeff, 0x1a1712, 1.1));
  const cle = new THREE.DirectionalLight(0xfff2e0, 2.2);
  cle.position.set(3, 4, 5);
  scene.add(cle);

  // Hélice : moyeu + 5 pales légèrement vrillées
  const helice = new THREE.Group();
  const matPale = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.45, metalness: 0.1 });
  const matBout = new THREE.MeshStandardMaterial({ color: 0xd0553a, roughness: 0.5 });
  for (let k = 0; k < 5; k++) {
    const forme = new THREE.Shape();
    forme.moveTo(0.12, -0.08);
    forme.bezierCurveTo(0.7, -0.22, 1.45, -0.2, 1.75, 0.0);
    forme.bezierCurveTo(1.45, 0.16, 0.7, 0.2, 0.12, 0.08);
    const geo = new THREE.ExtrudeGeometry(forme, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    const pale = new THREE.Mesh(geo, matPale);
    pale.rotation.z = (k * 2 * Math.PI) / 5;
    helice.add(pale);
    const bout = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), matBout);
    bout.position.set(1.55 * Math.cos((k * 2 * Math.PI) / 5), 1.55 * Math.sin((k * 2 * Math.PI) / 5), 0.07);
    helice.add(bout);
  }
  const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 32), new THREE.MeshStandardMaterial({ color: 0x3a3f4a, metalness: 0.6, roughness: 0.3 }));
  moyeu.rotation.x = Math.PI / 2;
  helice.add(moyeu);
  scene.add(helice);

  // Ligne de lecture (visible uniquement sur la vue de gauche)
  const ligne = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 0.012),
    new THREE.MeshBasicMaterial({ color: 0x3cffc0, transparent: true, opacity: 0.9 }),
  );
  ligne.position.z = 0.5;
  scene.add(ligne);

  // Cible persistante = l'image du capteur
  let cible = new THREE.WebGLRenderTarget(4, 4);
  const sceneEcran = new THREE.Scene();
  const camEcran = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: cible.texture, toneMapped: false }));
  sceneEcran.add(quad);

  let p = { tours: 6, balayage: 60, mode: 'roulant', ...ctx.params } as { tours: number; balayage: number; mode: string };
  let l = ctx.largeur;
  let h = ctx.hauteur;
  let ligneLue = 0; // en pixels de la cible
  let t0: number | null = null;
  const demiH = () => Math.floor(h);

  function angle(t: number) {
    return -t * p.tours * 2 * Math.PI;
  }
  function redimensionner(L: number, H: number) {
    l = L;
    h = H;
    const pr = renderer.getPixelRatio();
    cible.dispose();
    cible = new THREE.WebGLRenderTarget(Math.round((L / 2) * pr), Math.round(H * pr));
    cible.texture.colorSpace = THREE.SRGBColorSpace;
    (quad.material as T.MeshBasicMaterial).map = cible.texture;
    camera.aspect = L / 2 / H;
    camera.updateProjectionMatrix();
    ligneLue = 0;
  }
  redimensionner(l, h);

  function rendreBande(y0: number, y1: number, t: number) {
    helice.rotation.z = angle(t);
    ligne.visible = false;
    const H = cible.height;
    // les lignes de l'image vont du haut vers le bas ; WebGL compte depuis le bas
    cible.viewport.set(0, 0, cible.width, H);
    cible.scissor.set(0, H - y1, cible.width, y1 - y0);
    cible.scissorTest = true;
    renderer.setRenderTarget(cible);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  }
  let dernierBalayage = -1;
  let dernierGlobal = -1;

  return {
    maj(np) {
      p = { ...p, ...(np as typeof p) };
      ligneLue = 0;
      dernierBalayage = -1;
      dernierGlobal = -1;
    },
    redimensionner,
    frame(t) {
      if (t0 === null) t0 = t;
      const tt = t - t0;
      const H = cible.height;
      const T = p.balayage / 1000;
      const pas = Math.max(2, Math.ceil(H / 120));
      const n = Math.floor(tt / T);
      const phase = (tt % T) / T;
      if (p.mode === 'global') {
        // une exposition « instantanée » de toutes les lignes, une fois par période
        if (n !== dernierGlobal) {
          rendreBande(0, H, tt);
          dernierGlobal = n;
        }
      } else {
        const lire = (de: number, a: number, k: number) => {
          for (let y = de; y < a; y += pas) rendreBande(y, Math.min(a, y + pas), k * T + (y / H) * T);
        };
        const cibleLigne = Math.floor(phase * H);
        if (n !== dernierBalayage) {
          if (dernierBalayage >= 0) lire(ligneLue, H, dernierBalayage); // terminer l'image précédente
          ligneLue = 0;
          dernierBalayage = n;
        }
        lire(ligneLue, cibleLigne, n);
        ligneLue = Math.max(ligneLue, cibleLigne - (cibleLigne % pas));
      }

      // Vue de gauche : scène en direct + ligne de lecture
      const pr = renderer.getPixelRatio();
      helice.rotation.z = angle(tt);
      ligne.visible = p.mode !== 'global';
      if (ligne.visible) {
        // position verticale de la ligne dans le champ de la caméra (au plan z = 0.5)
        const demiHaut = Math.tan((camera.fov * Math.PI) / 360) * (camera.position.z - 0.5);
        ligne.position.y = demiHaut * (1 - 2 * phase);
      }
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, l / 2, h);
      renderer.setScissor(0, 0, l / 2, h);
      renderer.render(scene, camera);
      // Vue de droite : image du capteur
      renderer.setViewport(l / 2 + 2, 0, l / 2 - 2, h);
      renderer.setScissor(l / 2 + 2, 0, l / 2 - 2, h);
      renderer.render(sceneEcran, camEcran);
      renderer.setScissorTest(false);
      void pr;
      void demiH;
      return true;
    },
    etat: () => (p.mode === 'global' ? 'gauche : scène · droite : capteur à obturateur global' : 'gauche : scène et ligne de lecture · droite : capteur à obturateur roulant'),
    detruire() {
      cible.dispose();
      scene.traverse((o) => {
        const m = o as T.Mesh;
        m.geometry?.dispose?.();
        (m.material as T.Material | undefined)?.dispose?.();
      });
      quad.geometry.dispose();
    },
  };
};
export default fabrique;
