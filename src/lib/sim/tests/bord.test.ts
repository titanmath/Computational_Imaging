import { describe, expect, it } from 'vitest';
import { analyserBord, imageBord, imagePoint, projeterPoint, psfSysteme } from '../bordIncline';
import { noyauGauss } from '../conv';

describe('bord incliné', () => {
  it('retrouve l’angle et la FWHM d’une gaussienne (2,355 σ)', () => {
    const sigma = 1.5;
    const img = imageBord(64, 64, 5, noyauGauss(sigma));
    const r = analyserBord(img, 64, 64);
    expect(r.angleDeg).toBeCloseTo(5, 0);
    expect(r.dx).toBeCloseTo(0.249, 2);
    expect(r.fwhm).toBeGreaterThan(2.355 * sigma * 0.93);
    expect(r.fwhm).toBeLessThan(2.355 * sigma * 1.1);
    // aire de la LSF = 1
    expect(r.lsf.reduce((s, v) => s + v, 0) * r.dx).toBeCloseTo(1, 6);
  });
  it('source ponctuelle projetée : même FWHM ; une source trop grosse élargit', () => {
    const psf = psfSysteme('gauss', 1.5);
    const p = projeterPoint(imagePoint(48, 48, psf, 0.2), 48, 48, 5);
    expect(p.fwhm).toBeGreaterThan(3.2);
    expect(p.fwhm).toBeLessThan(4.1); // cases de 1 px : léger élargissement (effet réel de la mesure)
    const gros = projeterPoint(imagePoint(48, 48, psf, 6), 48, 48, 5);
    expect(gros.fwhm).toBeGreaterThan(p.fwhm + 1);
  });
  it('PSF anisotrope : le bord ne voit que la largeur horizontale', () => {
    const psf = psfSysteme('aniso', 1.2); // σx = 1,92, σy = 0,84
    const r = analyserBord(imageBord(64, 64, 5, psf), 64, 64);
    expect(r.fwhm).toBeGreaterThan(2.355 * 1.92 * 0.92);
    expect(r.fwhm).toBeLessThan(2.355 * 1.92 * 1.1);
  });
});
