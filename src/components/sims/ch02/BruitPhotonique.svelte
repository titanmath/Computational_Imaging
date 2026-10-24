<script lang="ts">
  // Bruit photonique : le nombre de photons détectés suit une loi de Poisson, σ = √μ.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import Toile from '../ui/Toile.svelte';
  import { creerAlea, poisson } from '@/lib/sim/rng';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { creerImg, versGris, type Img } from '@/lib/sim/image';

  let mu = $state(16);
  let tirage = $state(1);
  let scene: Img | undefined;
  let image: Img | undefined = $state();

  const mesures = $derived.by(() => {
    const a = creerAlea(tirage * 97 + mu);
    return Array.from({ length: 1000 }, () => poisson(a, mu));
  });
  const XMAX = 100;
  const hist = $derived.by(() => {
    const h = new Array(XMAX + 1).fill(0);
    for (const m of mesures) if (m <= XMAX) h[m]++;
    return h.map((v) => v / mesures.length);
  });
  const pmf = $derived.by(() => {
    const p: number[] = [];
    let v = Math.exp(-mu);
    for (let k = 0; k <= XMAX; k++) {
      p.push(v);
      v *= mu / (k + 1);
    }
    return p;
  });
  const moy = $derived(mesures.reduce((a, b) => a + b, 0) / mesures.length);
  const et = $derived(Math.sqrt(mesures.reduce((a, b) => a + (b - moy) ** 2, 0) / mesures.length));
  const X = (k: number) => 40 + (k / XMAX) * 350;
  const Y = (p: number) => 190 - (p / 0.21) * 170;

  function rendreImage() {
    if (!scene) return;
    const a = creerAlea(tirage);
    const out = creerImg(scene.l, scene.h, 1);
    // μ = nombre moyen de photons pour un pixel blanc
    for (let i = 0; i < out.d.length; i++) out.d[i] = poisson(a, scene.d[i] * mu) / mu;
    image = out;
  }
  onMount(() => {
    scene = versGris(scenePaysage(160, 120));
    rendreImage();
  });
  $effect(() => {
    void mu, tirage;
    rendreImage();
  });
</script>

<Panneau>
  {#snippet figure()}
    <div class="g">
      <svg viewBox="0 0 400 220" role="img" aria-label={`Histogramme de 1000 mesures, moyenne ${moy.toFixed(1)}, écart-type ${et.toFixed(2)}`}>
        <line x1="40" x2="390" y1="190" y2="190" class="axe" />
        {#each [0, 20, 40, 60, 80, 100] as k}<text x={X(k)} y="206" class="g m">{k}</text>{/each}
        <text x="390" y="218" class="g d">électrons détectés par exposition</text>
        {#each hist as h, k}
          {#if h > 0}<rect x={X(k) - 1.4} y={Y(h)} width="2.8" height={190 - Y(h)} class="barre" />{/if}
        {/each}
        <path d={pmf.map((p, k) => `${k ? 'L' : 'M'}${X(k)},${Y(p)}`).join(' ')} class="theorie" />
        <line x1={X(mu - Math.sqrt(mu))} x2={X(mu + Math.sqrt(mu))} y1="30" y2="30" class="sigma" />
        <text x={X(mu)} y="24" class="g m s">± σ = ± {Math.sqrt(mu).toFixed(1)}</text>
      </svg>
      <div>
        <Toile image={image} etiquette={`Image limitée par les photons (μ = ${mu} au blanc)`} />
        <p class="chiffres">Mesuré : moyenne {moy.toFixed(1)}, écart-type {et.toFixed(2)} · bruit relatif σ/μ = {(100 / Math.sqrt(mu)).toFixed(0)} %</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Nombre moyen d’électrons μ" bind:value={mu} options={[{ valeur: 1, texte: '1' }, { valeur: 4, texte: '4' }, { valeur: 16, texte: '16' }, { valeur: 64, texte: '64' }, { valeur: 100, texte: '100' }]} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => tirage++}>Nouvelles mesures</Bouton>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 600px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .axe { stroke: var(--filet-fort); }
  .g { font-size: 10.5px; fill: var(--encre-3); }
  .g.m { text-anchor: middle; }
  .g.d { text-anchor: end; }
  .s { fill: var(--accent); font-weight: 600; }
  .barre { fill: color-mix(in oklab, var(--accent) 55%, transparent); }
  .theorie { fill: none; stroke: var(--encre); stroke-width: 1.5; }
  .sigma { stroke: var(--accent); stroke-width: 2; }
  .chiffres { margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--encre-2); font-variant-numeric: tabular-nums; text-align: center; }
</style>
