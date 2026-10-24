<script lang="ts">
  // Correction du vignetage par champ plat : v(x,y) mesuré sur un fond uniforme, gain 1/v appliqué au RAW.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { profilVignetage } from '@/lib/sim/isp';
  import { creerImg, versGris, type Img } from '@/lib/sim/image';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { creerAlea, poisson } from '@/lib/sim/rng';

  let force = $state(0.6);
  let corrige = $state(false);
  let scene: Img | undefined;
  let carteV: Img | undefined = $state();
  let carteG: Img | undefined = $state();
  let image: Img | undefined = $state();
  const L = 192, H = 144;

  function calculer() {
    if (!scene) return;
    const v = profilVignetage(L, H, force);
    const cv = creerImg(L, H, 1), cg = creerImg(L, H, 1), im = creerImg(L, H, 1);
    const alea = creerAlea(4);
    const gmax = 1 / Math.min(...v);
    for (let i = 0; i < L * H; i++) {
      cv.d[i] = v[i];
      cg.d[i] = (1 / v[i] - 1) / Math.max(1e-6, gmax - 1); // affiché de 1× (noir) à g max (blanc)
      const mesure = poisson(alea, scene.d[i] * v[i] * 400) / 400;
      im.d[i] = corrige ? mesure / v[i] : mesure;
    }
    carteV = cv;
    carteG = cg;
    image = im;
  }
  onMount(() => {
    scene = versGris(scenePaysage(L, H));
    calculer();
  });
  $effect(() => {
    void force, corrige;
    calculer();
  });
</script>

<Panneau note="Gain affiché de 1× (noir) au gain maximal (blanc). Le gain amplifie aussi le bruit : les coins corrigés sont plus bruités que le centre.">
  {#snippet figure()}
    <div class="trois">
      <Toile image={carteV} etiquette="Champ uniforme capturé : v (centre ≈ 1)" lisse />
      <Toile image={carteG} etiquette="Gain de correction 1/v" lisse />
      <Toile image={image} etiquette={corrige ? 'Après correction' : 'Avant correction'} />
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Force du vignetage" bind:value={force} min={0} max={0.9} step={0.05} />
    <Bascule label="Correction" bind:value={corrige} options={[{ valeur: false, texte: 'Avant' }, { valeur: true, texte: 'Après (× 1/v)' }]} />
  {/snippet}
</Panneau>

<style>
  .trois { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 600px) { .trois { grid-template-columns: 1fr 1fr; } }
</style>
