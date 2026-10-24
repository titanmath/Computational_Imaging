<script lang="ts">
  // Même MSE, qualité perçue très différente : décalage de luminosité, flou, bruit, JPEG.
  // On ajuste chaque dégradation pour atteindre la même MSE, puis on compare MSE, PSNR et SSIM.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { flouGauss } from '@/lib/sim/conv';
  import { creerImg, mse, versGris, type Img } from '@/lib/sim/image';
  import { creerAlea, gauss } from '@/lib/sim/rng';
  import { encoder, jpeg } from '@/lib/sim/isp';
  import { ssim } from '@/lib/sim/qualite';

  const CIBLE = 0.0045;
  let ref: Img | undefined = $state();
  let cas: { nom: string; im: Img; mse: number; ssim: number }[] = $state([]);

  function cherche(f: (t: number) => Img, a: number, b: number, r: Img) {
    // dichotomie sur le paramètre pour atteindre la MSE cible
    for (let k = 0; k < 22; k++) {
      const m = (a + b) / 2;
      if (mse(f(m), r) < CIBLE) a = m;
      else b = m;
    }
    return f((a + b) / 2);
  }
  onMount(() => {
    const r = versGris(encoder(scenePaysage(200, 150)));
    ref = r;
    const decal = (t: number) => ({ ...r, d: r.d.map((v) => Math.min(1, v + t)) });
    const flou = (t: number) => flouGauss(r, t);
    const bruit = (t: number) => {
      const a = creerAlea(3);
      return { ...r, d: r.d.map((v) => v + t * gauss(a)) };
    };
    const comp = (q: number) => {
      const rgb = creerImg(r.l, r.h, 3);
      for (let i = 0; i < r.d.length; i++) rgb.d[3 * i] = rgb.d[3 * i + 1] = rgb.d[3 * i + 2] = r.d[i];
      return versGris(jpeg(rgb, Math.round(q)).image);
    };
    const liste: [string, Img][] = [
      ['Décalage de luminosité', cherche(decal, 0, 0.3, r)],
      ['Flou', cherche(flou, 0.2, 6, r)],
      ['Bruit', cherche(bruit, 0, 0.3, r)],
      ['Compression JPEG', cherche((t) => comp(100 - t), 1, 98, r)],
    ];
    cas = liste.map(([nom, im]) => ({ nom, im, mse: mse(im, r), ssim: ssim(im, r) }));
  });
</script>

<Panneau note="MSE calculée sur des valeurs sRGB dans [0, 1]. SSIM ∈ [−1, 1] : 1 = identique. Les quatre images ont (à peu près) la même MSE ; regarde laquelle te paraît la plus dégradée.">
  {#snippet figure()}
    <div class="g">
      <Toile image={ref} etiquette="Référence" />
      {#each cas as c}
        <div>
          <Toile image={c.im} />
          <p class="leg"><b>{c.nom}</b><br />MSE {c.mse.toFixed(4)} · PSNR {(10 * Math.log10(1 / c.mse)).toFixed(1)} dB · <span class="ssim">SSIM {c.ssim.toFixed(2)}</span></p>
        </div>
      {/each}
    </div>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.9rem; padding: 1rem 1.1rem 0.4rem; }
  .leg { margin: 0.35rem 0 0; font-size: 0.78rem; color: var(--encre-2); text-align: center; line-height: 1.4; font-variant-numeric: tabular-nums; }
  .ssim { color: var(--accent); font-weight: 600; }
</style>
