// Chapitre 03 — la chaîne ISP en 3D : chaque étape est une plaque, alignées comme des diapositives
// sur un banc. L'étape active s'avance et s'illumine. Paramètres : images (ImageData[]), active, noms.
import gsap from 'gsap';
import type * as T from 'three';
import type { FabriqueScene } from '../types';
import { creerStudio } from '../studio';
import { etiquette } from '../textures';

const fabrique: FabriqueScene = (ctx) => {
  const { THREE } = ctx;
  const studio = creerStudio(ctx, {
    position: [5.8, 2.4, 6.2],
    cible: [0.6, 0, 0],
    fov: 36,
    bloom: { force: 0.35, rayon: 0.3, seuil: 0.9 },
    azimut: Math.PI / 2.5,
  });
  const { scene } = studio;
  const groupe = new THREE.Group();
  scene.add(groupe);
  const plaques: { m: T.Mesh; cadre: T.Mesh; lbl: T.Mesh; base: number }[] = [];
  let active = -1;
  let anim: gsap.core.Tween[] = [];

  function construire(images: ImageData[], noms: string[]) {
    for (const p of plaques) {
      groupe.remove(p.m, p.cadre, p.lbl);
      p.m.geometry.dispose();
      ((p.m.material as T.MeshBasicMaterial).map as T.Texture | null)?.dispose();
    }
    plaques.length = 0;
    const n = images.length;
    images.forEach((im, k) => {
      const c = document.createElement('canvas');
      c.width = im.width;
      c.height = im.height;
      c.getContext('2d')!.putImageData(im, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      const larg = 2.4, haut = (2.4 * im.height) / im.width;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, haut), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, toneMapped: false }));
      const x = (k - (n - 1) / 2) * 0.62;
      m.position.set(x, 0, 0);
      m.rotation.y = -Math.PI / 2 + 0.0;
      const cadre = new THREE.Mesh(
        new THREE.PlaneGeometry(larg + 0.06, haut + 0.06),
        new THREE.MeshBasicMaterial({ color: 0x8aa6cf, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
      );
      cadre.position.set(x - 0.005, 0, 0);
      cadre.rotation.y = m.rotation.y;
      const { mesh: lbl } = etiquette(THREE, `${k + 1}. ${noms[k] ?? ''}`, { taille: 0.1 });
      lbl.position.set(x, -haut / 2 - 0.18, 0);
      lbl.rotation.y = -Math.PI / 2 + 0.6;
      groupe.add(cadre, m, lbl);
      plaques.push({ m, cadre, lbl, base: x });
    });
  }

  function activer(k: number) {
    if (k === active) return;
    active = k;
    anim.forEach((a) => a.kill());
    anim = [];
    plaques.forEach((p, j) => {
      const sel = j === k;
      anim.push(gsap.to(p.m.position, { y: sel ? 0.35 : 0, z: sel ? 0.9 : 0, duration: 0.6, ease: 'power3.out', onUpdate: ctx.demanderRendu }));
      anim.push(gsap.to(p.cadre.position, { y: sel ? 0.35 : 0, z: sel ? 0.9 : 0, duration: 0.6, ease: 'power3.out' }));
      anim.push(gsap.to(p.m.material as T.MeshBasicMaterial, { opacity: sel ? 1 : 0.55, duration: 0.4 }));
      anim.push(gsap.to(p.cadre.material as T.MeshBasicMaterial, { opacity: sel ? 0.9 : 0.12, duration: 0.4 }));
    });
  }

  let images: ImageData[] = [];
  function maj(p: Record<string, unknown>) {
    const nv = (p.images as ImageData[]) ?? [];
    if (nv !== images && nv.length) {
      images = nv;
      construire(images, (p.noms as string[]) ?? []);
      active = -1;
    }
    activer((p.active as number) ?? 0);
  }
  maj(ctx.params);

  let enMouvement = 0;
  return {
    maj,
    frame() {
      studio.rendre();
      enMouvement = anim.some((a) => a.isActive()) ? 30 : Math.max(0, enMouvement - 1);
      return enMouvement > 0;
    },
    redimensionner: (l, h) => studio.redimensionner(l, h),
    detruire() {
      anim.forEach((a) => a.kill());
      studio.detruire();
    },
  };
};
export default fabrique;
