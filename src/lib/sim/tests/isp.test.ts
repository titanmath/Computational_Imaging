import { describe, expect, it } from 'vitest';
import { corrigerDefauts, dct8, dematricer, gainsBalance, idct8, jpeg, tableQualite } from '../isp';
import { creerImg } from '../image';

describe('ISP (exemples des slides)', () => {
  it('table de quantification Q40 : DC = 20, (0,1) = 14', () => {
    const t = tableQualite(40);
    expect(t[0]).toBe(20);
    expect(t[1]).toBe(14);
    const q = Math.round(-470.09 / 14);
    expect(q).toBe(-34);
    expect(q * 14).toBe(-476);
    expect(Math.round(389.75 / 20)).toBe(19);
  });
  it('pixel chaud remplacé par la moyenne des voisins de même couleur : 1010 DN', () => {
    const im = creerImg(5, 5, 1);
    im.d.fill(500);
    im.d[2 * 5 + 2] = 4095;
    im.d[2 * 5 + 0] = 1000; // gauche (à 2 sites)
    im.d[2 * 5 + 4] = 980; // droite
    im.d[0 * 5 + 2] = 1040; // haut
    im.d[4 * 5 + 2] = 1020; // bas
    const c = corrigerDefauts(im, [[2, 2]]);
    expect(c.d[12]).toBeCloseTo(1010, 9);
  });
  it('balance des blancs : neutre (0,2 ; 0,8 ; 0,8), k = 0,8 → gains (4, 1, 1)', () => {
    const g = gainsBalance([0.2, 0.8, 0.8], 0.8);
    expect(g[0]).toBeCloseTo(4, 9);
    expect(g[1]).toBeCloseTo(1, 9);
    expect(g[2]).toBeCloseTo(1, 9);
  });
  it('DCT 8×8 : aller-retour exact', () => {
    const b = Array.from({ length: 64 }, (_, i) => Math.sin(i * 0.7) * 50);
    const r = idct8(dct8(b));
    r.forEach((v, i) => expect(v).toBeCloseTo(b[i], 8));
  });
  it('dématriçage d’une image uniforme : uniforme', () => {
    const raw = creerImg(8, 8, 1);
    raw.d.fill(0.5);
    const rgb = dematricer(raw);
    for (const v of rgb.d) expect(v).toBeCloseTo(0.5, 9);
  });
  it('JPEG : plus de qualité → plus de coefficients conservés', () => {
    const im = creerImg(32, 32, 3);
    for (let i = 0; i < im.d.length; i++) im.d[i] = 0.5 + 0.4 * Math.sin(i * 0.37);
    expect(jpeg(im, 90).nonNuls).toBeGreaterThan(jpeg(im, 10).nonNuls);
  });
});
