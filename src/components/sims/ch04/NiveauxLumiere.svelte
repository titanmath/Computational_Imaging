<script lang="ts">
  // Simulation (illustrative) de l'apparence selon le niveau de lumière : photopique, mésopique, scotopique.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { flouGauss } from '@/lib/sim/conv';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, poisson } from '@/lib/sim/rng';

  let log = $state(1); // log10 de la luminance (cd/m²)
  let scene: Img | undefined;
  let rendu: Img | undefined = $state();
  const regime = $derived(log > 0.5 ? 'photopique : les cônes dominent' : log > -2 ? 'mésopique : bâtonnets et cônes' : 'scotopique : les bâtonnets dominent');

  function calculer() {
    if (!scene) return;
    // t = 1 en photopique, 0 en scotopique
    const t = Math.min(1, Math.max(0, (log + 2.5) / 3));
    const flou = flouGauss(scene, (1 - t) * 2.2);
    const out = creerImg(scene.l, scene.h, 3);
    const a = creerAlea(2);
    const photons = 40 * Math.pow(10, Math.min(2, log + 2));
    for (let i = 0; i < scene.l * scene.h; i++) {
      const r = flou.d[3 * i], g = flou.d[3 * i + 1], b = flou.d[3 * i + 2];
      // luminance scotopique : sensibilité décalée vers le bleu-vert (effet Purkinje)
      const sco = 0.05 * r + 0.55 * g + 0.4 * b;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // fovéa (centre) sans bâtonnets : en vision de nuit, le centre de l'image est aveugle
      const x = (i % scene.l) / scene.l - 0.5, y = Math.floor(i / scene.l) / scene.h - 0.5;
      const centre = Math.exp(-(x * x + y * y) / 0.004);
      const voile = 1 - (1 - t) * 0.75 * centre;
      for (let k = 0; k < 3; k++) {
        const c = [r, g, b][k];
        const teinte = t * c + (1 - t) * sco * [0.8, 0.95, 1.1][k];
        const v = (teinte * (0.3 + 0.7 * t) + 0 * lum) * voile;
        out.d[3 * i + k] = poisson(a, v * photons) / photons;
      }
    }
    rendu = out;
  }
  onMount(() => {
    scene = scenePaysage(240, 180);
    calculer();
  });
  let attente = 0;
  $effect(() => {
    void log;
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(calculer);
  });
</script>

<Panneau note="Simulation illustrative, pas une modélisation précise : perte des couleurs, décalage vers le bleu (effet Purkinje), perte d’acuité, bruit, et centre aveugle de nuit (la fovéa n’a presque pas de bâtonnets).">
  {#snippet figure()}
    <div class="g">
      <Toile image={rendu} lisse />
      <p class="regime">{regime}</p>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Luminance de la scène" bind:value={log} min={-4} max={2} step={0.1} format={(v) => `10^${v.toFixed(1)} cd/m²`} />
  {/snippet}
</Panneau>

<style>
  .g { padding: 1rem 1.1rem 0.3rem; display: grid; gap: 0.4rem; justify-items: center; }
  .g :global(.toile) { width: min(100%, 30rem); }
  .regime { margin: 0; font-family: var(--f-titre); font-size: 1.1rem; }
</style>
