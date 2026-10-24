// Métrique de similarité structurelle (SSIM, Wang et al. 2004), fenêtre gaussienne σ = 1,5.
import { flouGauss } from './conv';
import { creerImg, versGris, type Img } from './image';

export function ssim(a: Img, b: Img, P = 1): number {
  const x = versGris(a), y = versGris(b);
  const C1 = (0.01 * P) ** 2, C2 = (0.03 * P) ** 2;
  const prod = (p: Img, q: Img) => {
    const o = creerImg(p.l, p.h, 1);
    for (let i = 0; i < p.d.length; i++) o.d[i] = p.d[i] * q.d[i];
    return o;
  };
  const mx = flouGauss(x, 1.5), my = flouGauss(y, 1.5);
  const sxx = flouGauss(prod(x, x), 1.5), syy = flouGauss(prod(y, y), 1.5), sxy = flouGauss(prod(x, y), 1.5);
  let s = 0;
  for (let i = 0; i < x.d.length; i++) {
    const ux = mx.d[i], uy = my.d[i];
    const vx = sxx.d[i] - ux * ux, vy = syy.d[i] - uy * uy, cxy = sxy.d[i] - ux * uy;
    s += ((2 * ux * uy + C1) * (2 * cxy + C2)) / ((ux * ux + uy * uy + C1) * (vx + vy + C2));
  }
  return s / x.d.length;
}
