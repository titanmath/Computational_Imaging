<script lang="ts">
  // Filtre médian : on remplace chaque valeur par la médiane de son voisinage.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { median } from '@/lib/sim/isp';
  import { creerImg, psnr, type Img } from '@/lib/sim/image';
  import { creerAlea, poisson } from '@/lib/sim/rng';

  let taille = $state(3);
  let propre: Img | undefined;
  let bruite: Img | undefined = $state();
  let filtre: Img | undefined = $state();
  let score = $state({ avant: 0, apres: 0 });
  const voisinage = [165, 156, 222, 98, 250, 140, 201, 177, 63];
  const tri = [...voisinage].sort((a, b) => a - b);

  function crop(im: Img): Img {
    const out = creerImg(72, 54, 3);
    for (let y = 0; y < 54; y++) for (let x = 0; x < 72; x++) for (let k = 0; k < 3; k++) out.d[(y * 72 + x) * 3 + k] = im.d[((60 + y) * im.l + 20 + x) * 3 + k];
    return out;
  }
  onMount(() => {
    propre = scenePaysage(240, 180);
    const a = creerAlea(11);
    const b = creerImg(240, 180, 3);
    for (let i = 0; i < b.d.length; i++) b.d[i] = poisson(a, propre.d[i] * 60) / 60;
    bruite = b;
  });
  $effect(() => {
    if (!bruite || !propre) return;
    const f = median(bruite, taille);
    filtre = crop(f);
    score = { avant: psnr(bruite, propre), apres: psnr(f, propre) };
  });
</script>

<Panneau>
  {#snippet figure()}
    <div class="g">
      <div class="exemple" aria-label="Exemple : médiane de 9 valeurs">
        <div class="grille3">
          {#each voisinage as v, i}<span class:centre={i === 4}>{v}</span>{/each}
        </div>
        <p class="tri">tri : {#each tri as v, i}<b class:med={i === 4}>{v}</b>{i < 8 ? ' · ' : ''}{/each}</p>
        <p class="r">Le centre (250, valeur aberrante) est remplacé par la médiane des 9 valeurs : <strong>165</strong>.</p>
      </div>
      <Toile image={bruite ? crop(bruite) : undefined} etiquette={`Bruité · PSNR ${score.avant.toFixed(1)} dB`} />
      <Toile image={filtre} etiquette={`Médiane ${taille} × ${taille} · PSNR ${score.apres.toFixed(1)} dB`} />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Taille de la fenêtre θ" bind:value={taille} options={[{ valeur: 1, texte: '1 × 1 (aucun)' }, { valeur: 3, texte: '3 × 3' }, { valeur: 5, texte: '5 × 5' }, { valeur: 7, texte: '7 × 7' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 640px) { .g { grid-template-columns: 1fr 1fr; } .exemple { grid-column: 1 / -1; } }
  .grille3 { display: grid; grid-template-columns: repeat(3, 2.6rem); gap: 3px; }
  .grille3 span { display: grid; place-items: center; height: 2rem; background: var(--papier-2); border-radius: 4px; font-variant-numeric: tabular-nums; font-size: 0.85rem; }
  .grille3 span.centre { outline: 2px solid var(--accent); }
  .tri { font-size: 0.78rem; color: var(--encre-3); margin: 0.6rem 0 0.2rem; }
  .tri b { font-weight: 500; }
  .tri b.med { color: var(--accent); font-weight: 700; }
  .r { font-size: 0.85rem; margin: 0; color: var(--encre-2); }
</style>
