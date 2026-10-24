// Chapitre 08 — une rue path-tracée qui s'enfonce dans une brume homogène (modèle de Koschmieder, celui de
// He et al. : I = J·t + A(1 − t), t = e^{−βd}). La vue « canal sombre » calcule min fenêtre min RGB de I/A
// dans le shader d'affichage ; la vue « débrumée » inverse le modèle avec t̃ = 1 − ω·dark(I/A).
// Paramètres : beta (m⁻¹), vue (0 | 1 | 2), rayon (px), omega.
import type { FabriqueScene } from '../types';
import { PathTracer } from '../pathtracer/PathTracer';

const AIR: [number, number, number] = [0.78, 0.82, 0.88];

const SCENE = /* glsl */ `
#define BRUME
uniform float uBeta;
uniform vec3 uAir;
vec3 ciel(vec3 d) {
  float h = clamp(d.y, 0.0, 1.0);
  return mix(vec3(0.85, 0.9, 1.0), vec3(0.35, 0.55, 0.95), pow(h, 0.6)) * 1.2;
}
vec3 palette(float k) {
  k = mod(k, 6.0);
  if (k < 1.0) return vec3(0.75, 0.12, 0.08);
  if (k < 2.0) return vec3(0.1, 0.25, 0.7);
  if (k < 3.0) return vec3(0.85, 0.6, 0.08);
  if (k < 4.0) return vec3(0.12, 0.5, 0.22);
  if (k < 5.0) return vec3(0.55, 0.15, 0.55);
  return vec3(0.9, 0.35, 0.1);
}
bool scene(Rayon r, inout Impact h) {
  bool t = false;
  if (planY(r, 0.0, h)) {
    t = true;
    vec3 p = r.o + h.t * r.d;
    bool route = abs(p.x) < 1.6;
    float bande = step(0.92, fract(p.z * 0.25)) * step(abs(p.x), 0.06);
    h.albedo = route ? mix(vec3(0.12, 0.12, 0.13), vec3(0.85, 0.8, 0.6), bande) : mix(vec3(0.3, 0.45, 0.15), vec3(0.22, 0.36, 0.12), damier(p.xz, 0.5));
    h.emission = vec3(0.0); h.type = 0;
  }
  // bâtiments des deux côtés, tous les 5 m, jusqu'à 120 m
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float z0 = -3.0 - fi * 5.0;
    float haut = 3.0 + 3.0 * fract(sin(fi * 12.9898) * 43758.5453);
    float haut2 = 3.0 + 3.5 * fract(sin(fi * 78.233) * 12345.678);
    if (boite(r, vec3(-7.5, 0.0, z0 - 4.2), vec3(-3.0, haut, z0), h)) { t = true; h.albedo = palette(fi); h.emission = vec3(0.0); h.type = 0; }
    if (boite(r, vec3(3.0, 0.0, z0 - 4.2), vec3(7.5, haut2, z0), h)) { t = true; h.albedo = palette(fi + 3.0); h.emission = vec3(0.0); h.type = 0; }
  }
  // arbres au bord de la route
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float z = -5.5 - fi * 11.0;
    if (sphere(r, vec3(2.3, 1.6, z), 0.75, h)) { t = true; h.albedo = vec3(0.08, 0.32, 0.1); h.emission = vec3(0.0); h.type = 0; }
    if (sphere(r, vec3(-2.3, 1.6, z - 5.5), 0.75, h)) { t = true; h.albedo = vec3(0.1, 0.36, 0.1); h.emission = vec3(0.0); h.type = 0; }
  }
  return t;
}
`;

const fabrique: FabriqueScene = ({ THREE, renderer, canvas, qualite, params }) => {
  const pt = new PathTracer(THREE, renderer, {
    scene: SCENE,
    echantillonsMax: 1024,
    uniformsScene: { uBeta: { value: 0.05 }, uAir: { value: new THREE.Vector3(...AIR) } },
  });
  pt.uniforms.uSoleilDir.value.set(-0.4, 0.75, 0.35).normalize();
  pt.uniforms.uSoleil.value.set(5.2, 4.8, 4.2);
  let p = { beta: 0.035, vue: 0, rayon: 4, omega: 0.95, ...params } as { beta: number; vue: 0 | 1 | 2; rayon: number; omega: number };

  function appliquer() {
    pt.regler({ mode: 'stenope', position: [0.4, 1.5, 4], cible: [0, 2.2, -30], hauteurCapteur: 0.024, distanceCapteur: 0.024, ouverture: 0.0004 });
    pt.uniforms.uBeta.value = p.beta;
    pt.regarder(p.vue, { air: AIR, rayon: p.rayon, omega: p.omega });
  }
  function taille() {
    pt.redimensionner(canvas.width, canvas.height);
    appliquer();
  }
  taille();
  pt.spp = qualite.budget.spp;
  pt.rebonds = qualite.budget.rebonds;
  pt.exposition = 0.75;
  pt.modeTonemap = 1; // même rendu (ACES) pour l'image et la vue débrumée : comparaison honnête

  return {
    maj(np) {
      const avant = { ...p };
      p = { ...p, ...(np as Partial<typeof p>) };
      if (avant.beta !== p.beta) appliquer();
      else {
        // seules les vues changent : pas besoin de relancer l'accumulation
        pt.regarder(p.vue, { air: AIR, rayon: p.rayon, omega: p.omega });
      }
    },
    redimensionner: taille,
    frame() {
      pt.spp = qualite.budget.spp;
      pt.rebonds = qualite.budget.rebonds;
      return pt.rendre();
    },
    etat: () => `β = ${p.beta.toFixed(3)} m⁻¹ · ${pt.echantillons} échantillons / pixel`,
    detruire: () => pt.detruire(),
  };
};
export default fabrique;
