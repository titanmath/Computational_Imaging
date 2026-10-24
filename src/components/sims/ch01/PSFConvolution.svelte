<script lang="ts">
  // I = h ∗ I₀ : chaque point de la scène nette dépose une copie de la PSF, pondérée par son intensité.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { convoluer, flouGauss, noyauBouge, noyauDisque, noyauGauss, type Noyau } from '@/lib/sim/conv';
  import { creerImg, type Img } from '@/lib/sim/image';

  let type = $state<'compacte' | 'disque' | 'bouge'>('disque');
  let taille = $state(4);
  let angle = $state(20);
  let nette: Img | undefined = $state();
  let floue: Img | undefined = $state();
  let vueNoyau: Img | undefined = $state();

  const noyau = $derived<Noyau>(
    type === 'compacte' ? noyauGauss(Math.max(0.4, taille / 3)) : type === 'disque' ? noyauDisque(taille) : noyauBouge(taille * 3, (angle * Math.PI) / 180),
  );

  function afficherNoyau(n: Noyau) {
    const t = 2 * n.r + 1;
    const T = 33;
    const im = creerImg(T, T, 1);
    const max = Math.max(...n.k);
    for (let y = 0; y < t; y++)
      for (let x = 0; x < t; x++) {
        const X = x - n.r + 16, Y = y - n.r + 16;
        if (X >= 0 && X < T && Y >= 0 && Y < T) im.d[Y * T + X] = n.k[y * t + x] / max;
      }
    return im;
  }

  let enAttente = 0;
  $effect(() => {
    const n = noyau;
    const t = type, s = taille;
    vueNoyau = afficherNoyau(n);
    if (!nette) return;
    cancelAnimationFrame(enAttente);
    enAttente = requestAnimationFrame(() => {
      floue = t === 'compacte' ? flouGauss(nette!, Math.max(0.4, s / 3)) : convoluer(nette!, n);
    });
  });
  onMount(() => {
    nette = scenePaysage(240, 180);
  });
</script>

<Panneau>
  {#snippet figure()}
    <div class="trio">
      <Toile image={nette} etiquette="Image nette I₀" />
      <div class="op">∗</div>
      <div class="noyau"><Toile image={vueNoyau} etiquette="PSF h (agrandie)" /></div>
      <div class="op">=</div>
      <Toile image={floue} etiquette="Image mesurée I = h ∗ I₀" />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Forme de la PSF" bind:value={type} options={[{ valeur: 'compacte', texte: 'Compacte' }, { valeur: 'disque', texte: 'Disque (défocus)' }, { valeur: 'bouge', texte: 'Asymétrique (bougé)' }]} />
    <Curseur label="Taille" bind:value={taille} min={0.5} max={10} step={0.5} unite="px" />
    {#if type === 'bouge'}<Curseur label="Direction" bind:value={angle} min={0} max={180} step={5} unite="°" />{/if}
  {/snippet}
</Panneau>

<style>
  .trio {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 0.42fr) auto minmax(0, 1fr);
    gap: 0.6rem;
    align-items: center;
    padding: 1rem 1.1rem 0.5rem;
  }
  .op {
    font-family: var(--f-titre);
    font-size: 1.6rem;
    color: var(--encre-3);
    padding-bottom: 1.5rem;
  }
  @media (max-width: 600px) {
    .trio {
      grid-template-columns: 1fr 1fr;
    }
    .op {
      display: none;
    }
  }
</style>
