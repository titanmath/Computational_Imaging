// Chapitre 01 / A1 — caméra sténopé path-tracée (géométrie de la boîte de l'assignment 1 :
// écran 19 × 15 cm à f = 26 cm du trou). Le diamètre du trou règle flou ET luminosité.
// Mode « exposition fixe » : l'image s'assombrit comme d² ; mode « compensée » : on remonte
// le gain (ISO) et le bruit photonique apparaît. La diffraction n'est pas simulée ici (voir leçon).
import type { FabriqueScene } from '../types';
import { PathTracer } from '../pathtracer/PathTracer';

const SCENE = /* glsl */ `
vec3 ciel(vec3 d) {
  float h = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(vec3(0.75, 0.82, 0.9), vec3(0.28, 0.45, 0.78), pow(h, 0.6));
  float s = max(0.0, dot(d, uSoleilDir));
  return c * 1.2 + vec3(1.0, 0.9, 0.7) * pow(s, 400.0) * 40.0;
}
bool scene(Rayon r, inout Impact h) {
  bool t = false;
  if (planY(r, 0.0, h)) {
    t = true;
    vec3 p = r.o + h.t * r.d;
    float c = damier(p.xz, 1.0);
    h.albedo = mix(vec3(0.45, 0.55, 0.32), vec3(0.38, 0.48, 0.27), c);
    if (abs(p.x) < 1.2) h.albedo = mix(vec3(0.55), vec3(0.62), c); // allée
    h.emission = vec3(0.0); h.type = 0;
  }
  // maison
  if (boite(r, vec3(-4.5, 0.0, -14.0), vec3(-1.5, 2.6, -11.0), h)) { t = true; h.albedo = vec3(0.85, 0.78, 0.65); h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-4.7, 2.6, -14.2), vec3(-1.3, 3.1, -10.8), h)) { t = true; h.albedo = vec3(0.65, 0.2, 0.14); h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-3.4, 0.0, -11.05), vec3(-2.6, 1.7, -10.95), h)) { t = true; h.albedo = vec3(0.3, 0.18, 0.1); h.emission = vec3(0.0); h.type = 0; }
  // arbres
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec3 c = vec3(2.2 + fi * 1.7, 0.0, -7.0 - fi * 3.0);
    if (boite(r, c + vec3(-0.12, 0.0, -0.12), c + vec3(0.12, 1.3, 0.12), h)) { t = true; h.albedo = vec3(0.35, 0.22, 0.12); h.emission = vec3(0.0); h.type = 0; }
    if (sphere(r, c + vec3(0.0, 1.9, 0.0), 0.85, h)) { t = true; h.albedo = vec3(0.16, 0.42, 0.18); h.emission = vec3(0.0); h.type = 0; }
  }
  // panneau rayé (détails fins pour juger la netteté)
  if (boite(r, vec3(-1.0, 0.0, -6.0), vec3(1.0, 1.4, -5.9), h)) {
    t = true;
    vec3 p = r.o + h.t * r.d;
    float bande = step(0.5, fract((p.x + 1.0) * 4.0));
    h.albedo = p.y > 0.5 ? mix(vec3(0.95), vec3(0.08), bande) : vec3(0.3);
    h.emission = vec3(0.0); h.type = 0;
  }
  // ballon
  if (sphere(r, vec3(1.0, 0.45, -3.5), 0.45, h)) { t = true; h.albedo = vec3(0.9, 0.35, 0.1); h.emission = vec3(0.0); h.type = 0; }
  return t;
}
`;

const fabrique: FabriqueScene = ({ THREE, renderer, canvas, qualite, params }) => {
  const pt = new PathTracer(THREE, renderer, { scene: SCENE, echantillonsMax: 1536 });
  pt.uniforms.uSoleilDir.value.set(0.55, 0.62, 0.35).normalize();
  pt.uniforms.uSoleil.value.set(3.2, 2.9, 2.5);
  let p = { diametre: 1, focale: 0.26, compenser: false, ...params } as { diametre: number; focale: number; compenser: boolean };
  const D_REF = 1; // mm : diamètre de référence pour l'exposition

  function appliquer() {
    const d = p.diametre / 1000;
    pt.regler({
      mode: 'stenope',
      position: [0, 1.1, 2],
      cible: [0, 1.1, -10],
      hauteurCapteur: 0.15,
      distanceCapteur: p.focale,
      ouverture: d,
      ouvertureReference: D_REF / 1000,
      vignetage: true,
    });
    const rapport = (D_REF / p.diametre) ** 2; // la lumière reçue varie comme d²
    pt.exposition = p.compenser ? 1.0 * rapport : 1.0;
    // compenser = augmenter le gain : le bruit relatif croît comme 1/d
    pt.bruit = p.compenser ? 0.004 * rapport : 0.004;
  }
  const taille = () => {
    pt.redimensionner(canvas.width, canvas.height);
    appliquer();
  };
  taille();
  pt.tonemap = false;

  return {
    maj(np) {
      p = { ...p, ...(np as typeof p) };
      appliquer();
    },
    redimensionner: taille,
    frame() {
      pt.spp = qualite.budget.spp;
      pt.rebonds = Math.min(3, qualite.budget.rebonds);
      return pt.rendre();
    },
    etat: () => `${pt.echantillons} éch./px`,
    detruire: () => pt.detruire(),
  };
};
export default fabrique;
