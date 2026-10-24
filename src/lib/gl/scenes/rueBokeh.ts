// Scène de démonstration de la lentille mince : sphères à différentes profondeurs,
// sol en damier et guirlande de petites lampes au fond (→ bokeh).
// Paramètres : nombreF (N), miseAuPoint (m), focale (mm).
import type { FabriqueScene } from '../types';
import { PathTracer } from '../pathtracer/PathTracer';

const SCENE = /* glsl */ `
vec3 ciel(vec3 d) {
  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
  return mix(vec3(0.05, 0.06, 0.09), vec3(0.16, 0.22, 0.36), pow(h, 0.8));
}
bool scene(Rayon r, inout Impact h) {
  bool touche = false;
  if (planY(r, 0.0, h)) {
    touche = true;
    vec3 p = r.o + h.t * r.d;
    float c = damier(p.xz, 0.25);
    h.albedo = mix(vec3(0.62, 0.6, 0.56), vec3(0.16, 0.16, 0.17), c);
    h.emission = vec3(0.0); h.type = 0;
  }
  // Trois sphères à 1,2 m, 2,2 m et 4 m
  if (sphere(r, vec3(-0.32, 0.18, -1.2), 0.18, h)) { touche = true; h.albedo = vec3(0.85, 0.32, 0.18); h.emission = vec3(0.0); h.type = 0; }
  if (sphere(r, vec3(0.28, 0.3, -2.2), 0.3, h)) { touche = true; h.albedo = vec3(0.9); h.emission = vec3(0.0); h.type = 2; }
  if (sphere(r, vec3(-0.9, 0.45, -4.0), 0.45, h)) { touche = true; h.albedo = vec3(0.2, 0.45, 0.85); h.emission = vec3(0.0); h.type = 0; }
  // Guirlande de lampes à ~9 m : sources quasi ponctuelles → disques de bokeh
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec3 c = vec3(-3.2 + fi * 0.5, 1.1 + 0.18 * sin(fi * 1.7), -9.0 - 0.6 * cos(fi * 0.9));
    vec3 teinte = mix(vec3(1.0, 0.62, 0.25), vec3(1.0, 0.85, 0.55), fract(fi * 0.37));
    if (sphere(r, c, 0.035, h)) { touche = true; h.albedo = vec3(0.0); h.emission = teinte * 60.0; h.type = 1; }
  }
  return touche;
}
`;

const fabrique: FabriqueScene = ({ THREE, renderer, canvas, qualite, params }) => {
  const pt = new PathTracer(THREE, renderer, { scene: SCENE, echantillonsMax: 2048 });
  pt.uniforms.uSoleilDir.value.set(-0.5, 0.35, 0.4).normalize();
  pt.uniforms.uSoleil.value.set(1.6, 1.3, 1.0);
  let p = { nombreF: 2, miseAuPoint: 1.6, focale: 50, ...params } as Record<string, number>;

  function appliquer() {
    const f = p.focale / 1000;
    const Z = p.miseAuPoint;
    const S = (f * Z) / (Z - f); // équation de la lentille mince
    pt.regler({
      mode: 'lentille',
      position: [0, 0.42, 0.6],
      cible: [0, 0.32, -3],
      hauteurCapteur: 0.024,
      distanceCapteur: S,
      focale: f,
      ouverture: f / p.nombreF,
    });
  }
  function taille() {
    pt.redimensionner(canvas.width, canvas.height);
    appliquer();
  }
  taille();
  pt.spp = qualite.budget.spp;
  pt.rebonds = qualite.budget.rebonds;
  pt.tonemap = true;
  pt.exposition = 1.2;

  return {
    maj(np) {
      p = { ...p, ...(np as Record<string, number>) };
      appliquer();
    },
    redimensionner: taille,
    frame() {
      pt.spp = qualite.budget.spp;
      pt.rebonds = qualite.budget.rebonds;
      return pt.rendre();
    },
    etat: () => `${pt.echantillons} échantillons / pixel`,
    detruire: () => pt.detruire(),
  };
};
export default fabrique;
