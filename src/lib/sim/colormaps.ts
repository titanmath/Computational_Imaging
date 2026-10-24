// Palettes pour visualiser des grandeurs scalaires (PSF, cartes d'erreur…).
type Arret = [number, number, number, number]; // t, r, g, b (0–255)

const FEU: Arret[] = [
  [0, 0, 0, 4],
  [0.13, 28, 16, 68],
  [0.25, 79, 18, 123],
  [0.38, 129, 37, 129],
  [0.5, 181, 54, 122],
  [0.63, 229, 80, 100],
  [0.75, 251, 135, 97],
  [0.88, 254, 194, 135],
  [1, 252, 253, 191],
];
const DIVERGENTE: Arret[] = [
  [0, 33, 102, 172],
  [0.25, 103, 169, 207],
  [0.5, 247, 247, 247],
  [0.75, 239, 138, 98],
  [1, 178, 24, 43],
];

function echantillonner(p: Arret[], t: number): [number, number, number] {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < p.length; i++)
    if (t <= p[i][0]) {
      const a = p[i - 1], b = p[i];
      const u = (t - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
    }
  const d = p[p.length - 1];
  return [d[1], d[2], d[3]];
}

export const feu = (t: number) => echantillonner(FEU, t);
export const divergente = (t: number) => echantillonner(DIVERGENTE, t);

/** Dessine une carte scalaire l × h dans un canvas avec une palette. */
export function dessinerCarte(
  canvas: HTMLCanvasElement,
  v: ArrayLike<number>,
  l: number,
  h: number,
  palette: (t: number) => [number, number, number] = feu,
  transfert: (x: number) => number = (x) => x,
) {
  canvas.width = l;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const im = ctx.createImageData(l, h);
  for (let i = 0; i < l * h; i++) {
    const [r, g, b] = palette(transfert(v[i]));
    im.data[4 * i] = r;
    im.data[4 * i + 1] = g;
    im.data[4 * i + 2] = b;
    im.data[4 * i + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}
