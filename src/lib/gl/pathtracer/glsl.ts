// Briques GLSL du path tracer : aléatoire, échantillonnage, intersections, caméras physiques.
// Les scènes fournissent `bool scene(Rayon r, inout Impact h)` et `vec3 ciel(vec3 d)`.

export const ENTETE = /* glsl */ `
precision highp float;
precision highp int;

#define PI 3.14159265358979
#define INF 1e20

// --- Aléatoire : PCG 32 bits ---
uint etatAlea;
uint pcg(inout uint s) {
  s = s * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float alea() { return float(pcg(etatAlea)) / 4294967296.0; }
vec2 alea2() { return vec2(alea(), alea()); }

// Point uniforme dans le disque unité (méthode concentrique de Shirley).
vec2 disque(vec2 u) {
  vec2 o = 2.0 * u - 1.0;
  if (o.x == 0.0 && o.y == 0.0) return vec2(0.0);
  float r, th;
  if (abs(o.x) > abs(o.y)) { r = o.x; th = (PI / 4.0) * (o.y / o.x); }
  else { r = o.y; th = (PI / 2.0) - (PI / 4.0) * (o.x / o.y); }
  return r * vec2(cos(th), sin(th));
}

// Direction cosinus-pondérée autour de n.
vec3 hemisphereCos(vec3 n, vec2 u) {
  float r = sqrt(u.x), phi = 2.0 * PI * u.y;
  vec3 t = normalize(abs(n.y) < 0.99 ? cross(n, vec3(0, 1, 0)) : cross(n, vec3(1, 0, 0)));
  vec3 b = cross(n, t);
  return normalize(r * cos(phi) * t + r * sin(phi) * b + sqrt(max(0.0, 1.0 - u.x)) * n);
}

struct Rayon { vec3 o; vec3 d; };

// Matériaux : 0 diffus, 1 émissif pur, 2 miroir, 3 verre (indice ior)
struct Impact {
  float t;
  vec3 n;
  vec3 albedo;
  vec3 emission;
  int type;
  float ior;
};

Impact aucun() { Impact h; h.t = INF; h.n = vec3(0, 1, 0); h.albedo = vec3(0.0); h.emission = vec3(0.0); h.type = 0; h.ior = 1.5; return h; }

// --- Intersections analytiques (mettent à jour h si plus proche) ---
bool sphere(Rayon r, vec3 c, float rad, inout Impact h) {
  vec3 oc = r.o - c;
  float b = dot(oc, r.d);
  float cc = dot(oc, oc) - rad * rad;
  float disc = b * b - cc;
  if (disc < 0.0) return false;
  float s = sqrt(disc);
  float t = -b - s;
  if (t < 1e-4) t = -b + s;
  if (t < 1e-4 || t >= h.t) return false;
  h.t = t;
  h.n = normalize(r.o + t * r.d - c);
  return true;
}

bool planY(Rayon r, float y, inout Impact h) {
  if (abs(r.d.y) < 1e-6) return false;
  float t = (y - r.o.y) / r.d.y;
  if (t < 1e-4 || t >= h.t) return false;
  h.t = t;
  h.n = vec3(0.0, r.d.y < 0.0 ? 1.0 : -1.0, 0.0);
  return true;
}

bool boite(Rayon r, vec3 bmin, vec3 bmax, inout Impact h) {
  vec3 inv = 1.0 / r.d;
  vec3 t0 = (bmin - r.o) * inv, t1 = (bmax - r.o) * inv;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), tmin.z);
  float tf = min(min(tmax.x, tmax.y), tmax.z);
  if (tn > tf || tf < 1e-4) return false;
  float t = tn > 1e-4 ? tn : tf;
  if (t >= h.t) return false;
  h.t = t;
  vec3 p = r.o + t * r.d;
  vec3 c = 0.5 * (bmin + bmax), e = 0.5 * (bmax - bmin);
  vec3 q = (p - c) / e;
  vec3 a = abs(q);
  h.n = a.x > a.y && a.x > a.z ? vec3(sign(q.x), 0, 0) : a.y > a.z ? vec3(0, sign(q.y), 0) : vec3(0, 0, sign(q.z));
  return true;
}

float damier(vec2 p, float taille) {
  vec2 q = floor(p / taille);
  return mod(q.x + q.y, 2.0);
}
`;

/**
 * Caméras physiques. Repère caméra : regarde vers −Z, capteur derrière l'ouverture (z = +S).
 * L'image est retournée sur le capteur ; on lit le capteur à l'envers pour l'afficher droite.
 * Renvoie le poids radiométrique (A cos⁴θ / S²) normalisé par celui d'un trou de référence.
 */
export const CAMERA = /* glsl */ `
uniform int uModeCam;        // 0 : sténopé (trou de diamètre uOuverture), 1 : lentille mince
uniform vec3 uCamPos;
uniform mat3 uCamRot;        // caméra → monde
uniform vec2 uCapteur;       // largeur, hauteur du capteur (m)
uniform float uDistCapteur;  // S : ouverture → capteur (m)
uniform float uOuverture;    // diamètre du trou / de la pupille (m)
uniform float uFocale;       // f (lentille mince)
uniform float uOuvRef;       // diamètre de référence pour normaliser la luminosité
uniform float uVignetage;    // 1 : appliquer cos⁴θ, 0 : non

float camera(vec2 ndc, out Rayon r) {
  vec3 ps = vec3(-ndc.x * 0.5 * uCapteur.x, -ndc.y * 0.5 * uCapteur.y, uDistCapteur);
  vec2 a = disque(alea2()) * 0.5 * uOuverture;
  vec3 pa = vec3(a, 0.0);
  vec3 d;
  if (uModeCam == 1) {
    float zf = 1.0 / max(1e-6, 1.0 / uFocale - 1.0 / uDistCapteur);
    vec3 c = normalize(-ps);
    float t = (-zf - ps.z) / c.z;
    vec3 P = ps + c * t;
    d = normalize(P - pa);
  } else {
    d = normalize(pa - ps);
  }
  r.o = uCamPos + uCamRot * pa;
  r.d = normalize(uCamRot * d);
  float cosT = abs(normalize(pa - ps).z);
  float c4 = mix(1.0, cosT * cosT * cosT * cosT, uVignetage);
  float rapport = uOuverture / max(1e-9, uOuvRef);
  return rapport * rapport * c4;
}
`;

export const VERTEX = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Shader d'accumulation : la scène est injectée entre ENTETE/CAMERA et le main. */
export function fragmentAccumulation(scene: string): string {
  return /* glsl */ `
${ENTETE}
${CAMERA}
uniform sampler2D uPrec;
uniform float uN;
uniform vec2 uRes;
uniform uint uGraine;
uniform int uSpp;
uniform int uRebonds;
uniform vec3 uSoleilDir;
uniform vec3 uSoleil;        // radiance × angle solide du soleil
uniform float uTemps;
in vec2 vUv;
out vec4 sortie;

${scene}

bool ombre(vec3 p, vec3 d) {
  Rayon r; r.o = p; r.d = d;
  Impact h = aucun();
  return scene(r, h);
}

vec3 tracer(Rayon r) {
  vec3 L = vec3(0.0), debit = vec3(1.0);
  for (int k = 0; k < 8; k++) {
    if (k > uRebonds) break;
    Impact h = aucun();
    bool touche = scene(r, h);
#ifdef BRUME
    // Brume homogène (modèle de Koschmieder) sur le premier segment : I = J·t + A·(1 − t), t = e^{−β·distance}
    if (k == 0) { float tr = touche ? exp(-uBeta * h.t) : 0.0; L += debit * uAir * (1.0 - tr); debit *= tr; }
#endif
    if (!touche) { L += debit * ciel(r.d); break; }
    vec3 p = r.o + h.t * r.d;
    L += debit * h.emission;
    if (h.type == 1) break;
    if (h.type == 2) { r.o = p + h.n * 1e-4; r.d = reflect(r.d, h.n); debit *= h.albedo; continue; }
    if (h.type == 3) {
      bool entre = dot(r.d, h.n) < 0.0;
      vec3 n = entre ? h.n : -h.n;
      float eta = entre ? 1.0 / h.ior : h.ior;
      float c = -dot(r.d, n);
      float r0 = (1.0 - eta) / (1.0 + eta); r0 *= r0;
      float fres = r0 + (1.0 - r0) * pow(1.0 - c, 5.0);
      vec3 t = refract(r.d, n, eta);
      if (dot(t, t) < 1e-6 || alea() < fres) { r.d = reflect(r.d, n); r.o = p + n * 1e-4; }
      else { r.d = normalize(t); r.o = p - n * 1e-4; }
      debit *= h.albedo;
      continue;
    }
    // Diffus : éclairage direct par le soleil + rebond indirect.
    vec3 n = h.n;
    float ns = dot(n, uSoleilDir);
    if (ns > 0.0 && !ombre(p + n * 1e-4, uSoleilDir)) L += debit * h.albedo * uSoleil * ns / PI;
    debit *= h.albedo;
    r.o = p + n * 1e-4;
    r.d = hemisphereCos(n, alea2());
    if (k >= 2) { // roulette russe
      float q = clamp(max(debit.r, max(debit.g, debit.b)), 0.05, 0.95);
      if (alea() > q) break;
      debit /= q;
    }
  }
  return L;
}

void main() {
  etatAlea = uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u + uGraine * 26699u;
  pcg(etatAlea);
  vec3 somme = vec3(0.0);
  for (int s = 0; s < 16; s++) {
    if (s >= uSpp) break;
    vec2 jitter = alea2();
    vec2 ndc = ((gl_FragCoord.xy - 0.5 + jitter) / uRes) * 2.0 - 1.0;
    Rayon r;
    float w = camera(ndc, r);
    somme += w * tracer(r);
  }
  vec3 nouveau = somme / float(uSpp);
  vec3 prec = texture(uPrec, vUv).rgb;
  float total = uN + float(uSpp);
  sortie = vec4(mix(prec, nouveau, float(uSpp) / total), 1.0);
}
`;
}

/** Affichage : exposition, tone mapping doux, encodage sRGB. */
export const FRAGMENT_AFFICHAGE = /* glsl */ `
precision highp float;
uniform sampler2D uAccum;
uniform float uExposition;
uniform int uTonemap; // 0 : écrêtage linéaire (comme un capteur), 1 : ACES, 2 : Reinhard L/(1+L) sur la luminance
uniform float uBruit; // écart-type relatif du bruit photonique simulé (0 = aucun)
uniform int uVue;     // 0 : image, 1 : canal sombre min_fenêtre min_RGB (I/A), 2 : débrumage par canal sombre
uniform vec3 uAir;    // lumière atmosphérique A (pour les vues 1 et 2)
uniform int uRayon;   // rayon de la fenêtre du canal sombre (pixels, ≤ 6)
uniform float uOmega;
in vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float gaussien(vec2 p) {
  float u1 = max(1e-6, hash(p)), u2 = hash(p + 17.31);
  return sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2);
}
out vec4 sortie;
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 srgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
// radiance brute (avant exposition) : le modèle de brume et A sont exprimés en radiance de scène
vec3 lire(ivec2 q) {
  ivec2 t = textureSize(uAccum, 0);
  return texelFetch(uAccum, clamp(q, ivec2(0), t - 1), 0).rgb;
}
void main() {
  vec3 c = texture(uAccum, vUv).rgb;
  if (uVue > 0) {
    ivec2 p = ivec2(vUv * vec2(textureSize(uAccum, 0)));
    float dm = 1e9;
    for (int j = -6; j <= 6; j++)
      for (int i = -6; i <= 6; i++) {
        if (abs(i) > uRayon || abs(j) > uRayon) continue;
        vec3 v = lire(p + ivec2(i, j)) / uAir;
        dm = min(dm, min(v.r, min(v.g, v.b)));
      }
    if (uVue == 1) { sortie = vec4(srgb(vec3(clamp(dm, 0.0, 1.0))), 1.0); return; }
    float t = max(1.0 - uOmega * dm, 0.1);
    c = (c - uAir) / t + uAir;
  }
  c *= uExposition;
  if (uBruit > 0.0) {
    // bruit photonique : σ ∝ √signal, amplifié par le gain (ISO) — un tirage fixe par pixel
    vec2 q = floor(gl_FragCoord.xy);
    c += sqrt(max(c, 0.0) * uBruit) * vec3(gaussien(q), gaussien(q + 3.1), gaussien(q + 7.7));
  }
  if (uTonemap == 1) c = aces(c);
  else if (uTonemap == 2) {
    float Lw = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c *= (1.0 / (1.0 + Lw));
  }
  sortie = vec4(srgb(c), 1.0);
}
`;
