<script lang="ts">
  // Mesurer une PSF avec une « source ponctuelle » qui ne l'est pas tout à fait :
  // l'image mesurée est PSF ∗ (image de la source). Si la source est trop grosse, on surestime la largeur.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { convoluer, fwhm, noyauDisque, noyauGauss, projectionHorizontale, type Noyau } from '@/lib/sim/conv';
  import { creerImg } from '@/lib/sim/image';
  import { dessinerCarte } from '@/lib/sim/colormaps';

  let source = $state(1); // diamètre de l'image de la source (px)
  const sigma = 2.2;
  const vraie = noyauGauss(sigma);
  let cMesure: HTMLCanvasElement;
  let res = $state({ vrai: 0, mesure: 0, profilV: [] as number[], profilM: [] as number[] });

  $effect(() => {
    const d = source;
    // image de la source : disque de diamètre d, centré
    const T = 41;
    const im = creerImg(T, T, 1);
    const disque = noyauDisque(Math.max(0.3, d / 2));
    const t = 2 * disque.r + 1;
    for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) im.d[(20 - disque.r + y) * T + 20 - disque.r + x] = disque.k[y * t + x];
    const mes = convoluer(im, vraie);
    const pM = new Float32Array(T);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pM[x] += mes.d[y * T + x];
    const pV = projectionHorizontale(vraie);
    const mx = Math.max(...pM), mv = Math.max(...pV);
    if (cMesure) dessinerCarte(cMesure, mes.d, T, T, undefined, (v) => Math.sqrt(v / Math.max(...mes.d)));
    // profils normalisés au pic, centrés
    const decal = Math.floor(T / 2) - vraie.r;
    res = {
      vrai: fwhm(pV),
      mesure: fwhm(pM),
      profilV: Array.from({ length: T }, (_, i) => (i - decal >= 0 && i - decal < pV.length ? pV[i - decal] / mv : 0)),
      profilM: Array.from(pM, (v) => v / mx),
    };
  });
  const chemin = (p: number[]) => p.map((v, i) => `${i ? 'L' : 'M'}${30 + i * 7.3},${150 - v * 120}`).join(' ');
</script>

<Panneau sombre note="PSF vraie : gaussienne (σ = 2,2 px, FWHM ≈ 5,2 px). Profils projetés sur l’horizontale, comme en A2.">
  {#snippet figure()}
    <div class="g">
      <figure><canvas bind:this={cMesure}></canvas><figcaption>Image mesurée de la « source ponctuelle »</figcaption></figure>
      <svg viewBox="0 0 340 170" role="img" aria-label="Profils de la PSF vraie et mesurée">
        <path d={chemin(res.profilV)} class="v" />
        <path d={chemin(res.profilM)} class="m" />
        <line x1="30" x2="330" y1="90" y2="90" class="demi" />
        <text x="332" y="94" class="g">½</text>
        <text x="34" y="20" class="g lv">— PSF vraie : FWHM {res.vrai.toFixed(2)} px</text>
        <text x="34" y="36" class="g lm">— mesurée : FWHM {res.mesure.toFixed(2)} px (+{(100 * (res.mesure / res.vrai - 1)).toFixed(0)} %)</text>
      </svg>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Diamètre de l’image de la source" bind:value={source} min={0.5} max={12} step={0.5} unite="px" />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  figure { margin: 0; }
  canvas { width: 100%; aspect-ratio: 1; image-rendering: pixelated; border-radius: 6px; }
  figcaption { font-size: 0.78rem; color: var(--table-encre-2); text-align: center; margin-top: 0.3rem; }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .v { fill: none; stroke: #8fa3c4; stroke-width: 2; }
  .m { fill: none; stroke: #fca86a; stroke-width: 2.2; }
  .demi { stroke: var(--table-filet); stroke-dasharray: 3 3; }
  .g { font-size: 11px; fill: var(--table-encre-2); }
  .lv { fill: #8fa3c4; }
  .lm { fill: #fca86a; }
</style>
