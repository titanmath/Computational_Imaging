// Petites textures dessinées au Canvas 2D (étiquettes posées dans la scène, motifs).
import type * as T from 'three';
import type { THREE } from './types';

/** Étiquette typographique (petites capitales espacées), à poser à plat dans la scène. */
export function etiquette(
  THREE: THREE,
  texte: string,
  o: { couleur?: string; taille?: number; sous?: string } = {},
): { mesh: T.Mesh; largeur: number } {
  const ech = 4;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const police = `600 ${28 * ech}px "Source Sans 3 Variable", system-ui, sans-serif`;
  ctx.font = police;
  const espacement = 0.18 * 28 * ech;
  const lettres = [...texte.toUpperCase()];
  let l = lettres.reduce((s, ch) => s + ctx.measureText(ch).width + espacement, 0);
  if (o.sous) {
    ctx.font = `italic 400 ${22 * ech}px "Fraunces Variable", Georgia, serif`;
    l = Math.max(l, ctx.measureText(o.sous).width);
  }
  c.width = Math.ceil(l + 20 * ech);
  c.height = (o.sous ? 78 : 44) * ech;
  ctx.font = police;
  ctx.fillStyle = o.couleur ?? '#e7e3d8';
  ctx.textBaseline = 'top';
  let x = 10 * ech;
  for (const ch of lettres) {
    ctx.fillText(ch, x, 6 * ech);
    x += ctx.measureText(ch).width + espacement;
  }
  if (o.sous) {
    ctx.font = `italic 400 ${22 * ech}px "Fraunces Variable", Georgia, serif`;
    ctx.globalAlpha = 0.7;
    ctx.fillText(o.sous, 10 * ech, 42 * ech);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const h = o.taille ?? 0.12;
  const largeur = (h * c.width) / (44 * ech);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, (h * c.height) / (44 * ech)),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  return { mesh, largeur };
}

/** Texture à partir d'une fonction de dessin 2D. */
export function textureDessinee(
  THREE: THREE,
  l: number,
  h: number,
  dessiner: (ctx: CanvasRenderingContext2D, l: number, h: number) => void,
): T.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = l;
  c.height = h;
  dessiner(c.getContext('2d')!, l, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
