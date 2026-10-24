// Chapitre 06 — une pièce sombre avec une fenêtre ensoleillée, path-tracée en radiance flottante.
// La dynamique dépasse largement celle d'un capteur : on choisit une exposition virtuelle (en diaphragmes)
// et un mode d'affichage : écrêtage comme un capteur, Reinhard L/(1+L), ou ACES.
// Paramètres : exposition (IL), mode (0 capteur, 1 ACES, 2 Reinhard).
import type { FabriqueScene } from '../types';
import { PathTracer } from '../pathtracer/PathTracer';

const SCENE = /* glsl */ `
vec3 ciel(vec3 d) {
  float h = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(vec3(2.2, 2.6, 3.2), vec3(0.9, 1.4, 3.0), pow(h, 0.5)) * 2.0;
  float s = max(0.0, dot(d, uSoleilDir));
  return c + vec3(1.0, 0.92, 0.8) * pow(s, 900.0) * 3000.0;
}
// Pièce : x ∈ [−2, 2], y ∈ [0, 2.6], z ∈ [−4, 1]. Fenêtre dans le mur du fond (z = −4) : x ∈ [−0.2, 1.4], y ∈ [0.9, 2.1].
bool scene(Rayon r, inout Impact h) {
  bool t = false;
  vec3 mur = vec3(0.62, 0.58, 0.52);
  // sol
  if (boite(r, vec3(-2.0, -0.1, -4.0), vec3(2.0, 0.0, 1.0), h)) {
    t = true; vec3 p = r.o + h.t * r.d;
    h.albedo = mix(vec3(0.42, 0.28, 0.16), vec3(0.32, 0.2, 0.11), damier(vec2(p.x * 4.0, p.z), 1.0));
    h.emission = vec3(0.0); h.type = 0;
  }
  // plafond, murs gauche/droit, mur avant (derrière la caméra)
  if (boite(r, vec3(-2.0, 2.6, -4.0), vec3(2.0, 2.7, 1.0), h)) { t = true; h.albedo = vec3(0.75); h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-2.1, 0.0, -4.0), vec3(-2.0, 2.6, 1.0), h)) { t = true; h.albedo = mur * vec3(1.0, 0.95, 0.9); h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(2.0, 0.0, -4.0), vec3(2.1, 2.6, 1.0), h)) { t = true; h.albedo = mur; h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-2.0, 0.0, 1.0), vec3(2.0, 2.6, 1.1), h)) { t = true; h.albedo = mur; h.emission = vec3(0.0); h.type = 0; }
  // mur du fond, percé d'une fenêtre (4 morceaux)
  vec3 a = vec3(-2.0, 0.0, -4.1), b = vec3(2.0, 2.6, -4.0);
  if (boite(r, a, vec3(-0.2, 2.6, -4.0), h)) { t = true; h.albedo = mur; h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(1.4, 0.0, -4.1), b, h)) { t = true; h.albedo = mur; h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-0.2, 0.0, -4.1), vec3(1.4, 0.9, -4.0), h)) { t = true; h.albedo = mur; h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-0.2, 2.1, -4.1), vec3(1.4, 2.6, -4.0), h)) { t = true; h.albedo = mur; h.emission = vec3(0.0); h.type = 0; }
  // montants de la fenêtre
  if (boite(r, vec3(0.57, 0.9, -4.08), vec3(0.63, 2.1, -4.02), h)) { t = true; h.albedo = vec3(0.9); h.emission = vec3(0.0); h.type = 0; }
  // dehors : un arbre et une colline (vus par la fenêtre)
  if (sphere(r, vec3(1.0, 1.6, -9.0), 1.1, h)) { t = true; h.albedo = vec3(0.12, 0.35, 0.12); h.emission = vec3(0.0); h.type = 0; }
  if (sphere(r, vec3(-3.0, -40.0, -30.0), 41.0, h)) { t = true; h.albedo = vec3(0.25, 0.45, 0.18); h.emission = vec3(0.0); h.type = 0; }
  // mobilier : table, vase, tableau au mur (détails dans l'ombre)
  if (boite(r, vec3(-1.6, 0.0, -2.6), vec3(-0.6, 0.75, -1.6), h)) { t = true; h.albedo = vec3(0.36, 0.22, 0.12); h.emission = vec3(0.0); h.type = 0; }
  if (sphere(r, vec3(-1.1, 0.95, -2.1), 0.2, h)) { t = true; h.albedo = vec3(0.7, 0.18, 0.12); h.emission = vec3(0.0); h.type = 0; }
  if (boite(r, vec3(-1.99, 1.1, -2.9), vec3(-1.95, 1.8, -1.7), h)) {
    t = true; vec3 p = r.o + h.t * r.d;
    h.albedo = length(vec2(p.y - 1.45, p.z + 2.3)) < 0.22 ? vec3(0.8, 0.6, 0.15) : vec3(0.12, 0.2, 0.38);
    h.emission = vec3(0.0); h.type = 0;
  }
  // une petite lampe allumée
  if (sphere(r, vec3(1.5, 0.55, -1.0), 0.07, h)) { t = true; h.albedo = vec3(0.0); h.emission = vec3(60.0, 42.0, 20.0); h.type = 1; }
  return t;
}
`;

const fabrique: FabriqueScene = ({ THREE, renderer, canvas, qualite, params }) => {
  const pt = new PathTracer(THREE, renderer, { scene: SCENE, echantillonsMax: 2048 });
  pt.uniforms.uSoleilDir.value.set(0.15, 0.55, -0.82).normalize();
  pt.uniforms.uSoleil.value.set(40, 36, 30);
  let p = { exposition: 0, mode: 0, ...params } as { exposition: number; mode: 0 | 1 | 2 };
  const appliquer = () => {
    pt.exposition = 0.6 * Math.pow(2, p.exposition);
    pt.modeTonemap = p.mode;
  };
  const taille = () => {
    pt.redimensionner(canvas.width, canvas.height);
    pt.regler({ mode: 'stenope', position: [0.2, 1.3, 0.6], cible: [0.1, 1.2, -4], hauteurCapteur: 0.024, distanceCapteur: 0.017, ouverture: 1e-5 }); // sténopé idéal (une ouverture nulle annulerait le poids radiométrique)
  };
  taille();
  appliquer();
  return {
    maj(np) {
      p = { ...p, ...(np as typeof p) };
      appliquer();
    },
    redimensionner: taille,
    frame() {
      pt.spp = qualite.budget.spp;
      pt.rebonds = Math.max(3, qualite.budget.rebonds);
      return pt.rendre();
    },
    etat: () => `${pt.echantillons} éch./px`,
    detruire: () => pt.detruire(),
  };
};
export default fabrique;
