<script lang="ts">
  // JPEG : chaque bloc 8 × 8 est décomposé sur 64 bases cosinus (DCT), puis chaque coefficient est
  // divisé par un pas de quantification et arrondi. Moins de qualité → pas plus grands → plus de zéros.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { dct8, encoder, jpeg, tableQualite } from '@/lib/sim/isp';
  import { creerImg, psnr, type Img } from '@/lib/sim/image';
  import { divergente } from '@/lib/sim/colormaps';

  let qualite = $state(40);
  let src: Img | undefined;
  let rendu: Img | undefined = $state();
  let loupe: Img | undefined = $state();
  let info = $state({ psnr: 0, nonNuls: 0, total: 1 });
  let cBases: HTMLCanvasElement;
  let cCoef: HTMLCanvasElement;
  let cQuant: HTMLCanvasElement;
  // bloc d'étude : un bord net (toit / mur)
  const BX = 56, BY = 64;

  function zoom(im: Img): Img {
    const Z = 48, H = 36, x0 = 160, y0 = 76;
    const out = creerImg(Z, H, 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < Z; x++) for (let k = 0; k < 3; k++) out.d[(y * Z + x) * 3 + k] = im.d[((y0 + y) * im.l + x0 + x) * 3 + k];
    return out;
  }
  function carte(canvas: HTMLCanvasElement, v: number[], max: number) {
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    const im = ctx.createImageData(8, 8);
    v.forEach((x, i) => {
      const [r, g, b] = divergente(0.5 + 0.5 * Math.sign(x) * Math.min(1, Math.sqrt(Math.abs(x) / max)));
      im.data.set([r, g, b, 255], i * 4);
    });
    ctx.putImageData(im, 0, 0);
  }
  function calculer() {
    if (!src) return;
    const r = jpeg(src, qualite);
    rendu = r.image;
    loupe = zoom(r.image);
    info = { psnr: psnr(r.image, src), nonNuls: r.nonNuls, total: (src.l * src.h * 3) };
    // coefficients du bloc d'étude (luminance)
    const bloc: number[] = [];
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = ((BY + y) * src.l + BX + x) * 3;
        bloc.push(255 * (0.299 * src.d[i] + 0.587 * src.d[i + 1] + 0.114 * src.d[i + 2]) - 128);
      }
    const D = dct8(bloc);
    const Q = tableQualite(qualite);
    const max = Math.max(...D.map(Math.abs));
    carte(cCoef, D, max);
    carte(cQuant, D.map((d, k) => Math.round(d / Q[k]) * Q[k]), max);
  }
  onMount(() => {
    src = encoder(scenePaysage(240, 176));
    // 64 bases DCT
    cBases.width = 8 * 9 - 1;
    cBases.height = 8 * 9 - 1;
    const ctx = cBases.getContext('2d')!;
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, cBases.width, cBases.height);
    for (let v = 0; v < 8; v++)
      for (let u = 0; u < 8; u++) {
        const im = ctx.createImageData(8, 8);
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) {
            const b = Math.cos(((2 * x + 1) * u * Math.PI) / 16) * Math.cos(((2 * y + 1) * v * Math.PI) / 16);
            const g = Math.round(127.5 + 127.5 * b);
            im.data.set([g, g, g, 255], (y * 8 + x) * 4);
          }
        ctx.putImageData(im, u * 9, v * 9);
      }
    calculer();
  });
  let attente = 0;
  $effect(() => {
    void qualite;
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(calculer);
  });
</script>

<Panneau note="Compression simplifiée (YCbCr 4:4:4, tables standard de l’IJG mises à l’échelle par la qualité, sans codage entropique). La « part des coefficients conservés » approche la taille du fichier.">
  {#snippet figure()}
    <div class="g">
      <Toile image={rendu} etiquette={`Qualité ${qualite} · PSNR ${info.psnr.toFixed(1)} dB`} lisse />
      <Toile image={loupe} etiquette="Loupe : artefacts de blocs et de « ringing »" />
      <div class="dct">
        <figure><canvas bind:this={cBases} class="pix"></canvas><figcaption>Les 64 bases DCT (u →, v ↓)</figcaption></figure>
        <div class="paire">
          <figure><canvas bind:this={cCoef} class="pix"></canvas><figcaption>Coefficients D</figcaption></figure>
          <figure><canvas bind:this={cQuant} class="pix"></canvas><figcaption>Après quantification</figcaption></figure>
        </div>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Qualité JPEG" bind:value={qualite} min={5} max={95} step={1} />
    <p class="info">Coefficients non nuls : <b>{((100 * info.nonNuls) / info.total).toFixed(1)} %</b> des 64 × blocs × 3 canaux</p>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.9fr); gap: 1rem; padding: 1rem 1.1rem 0.3rem; align-items: start; }
  @media (max-width: 700px) { .g { grid-template-columns: 1fr 1fr; } .dct { grid-column: 1 / -1; } }
  figure { margin: 0; }
  .pix { width: 100%; aspect-ratio: 1; image-rendering: pixelated; border-radius: 4px; display: block; }
  figcaption { font-size: 0.74rem; color: var(--encre-3); text-align: center; margin-top: 0.25rem; }
  .paire { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.6rem; }
  .info { margin: 0; font-size: 0.9rem; color: var(--encre-2); align-self: center; }
</style>
