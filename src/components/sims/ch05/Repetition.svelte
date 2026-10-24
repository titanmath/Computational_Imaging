<script lang="ts">
  // Un même pixel mesuré des milliers de fois sous éclairage uniforme : moyenne et écart-type.
  // 2 000 e⁻ en moyenne, gain 0,5 DN/e⁻, bruit de lecture 3 e⁻, noir 64 DN (slides) → σ ≈ 0,5 √(2000 + 9) ≈ 22,4 DN.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { creerAlea, gauss, poisson } from '@/lib/sim/rng';

  let N = $state(2000);
  const mesures = $derived.by(() => {
    const a = creerAlea(5);
    return Array.from({ length: Math.round(N) }, () => Math.round(0.5 * (poisson(a, 2000) + 3 * gauss(a)) + 64));
  });
  const moy = $derived(mesures.reduce((s, v) => s + v, 0) / mesures.length);
  const et = $derived(Math.sqrt(mesures.reduce((s, v) => s + (v - moy) ** 2, 0) / mesures.length));
  const bins = $derived.by(() => {
    const h = new Array(40).fill(0);
    for (const v of mesures) {
      const k = Math.floor((v - 980) / 4);
      if (k >= 0 && k < 40) h[k]++;
    }
    const m = Math.max(...h, 1);
    return h.map((v) => v / m);
  });
</script>

<Panneau note="Modèle EMVA 1288 : la variance mesurée vaut g²(μₑ + σ_read²) + 1/12. Ici 0,25 × (2 000 + 9) ≈ 502 DN², donc σ ≈ 22,4 DN.">
  {#snippet figure()}
    <svg viewBox="0 0 640 220" role="img" aria-label={`Histogramme de ${N} mesures`}>
      {#each bins as b, k}<rect x={50 + k * 13.5} y={180 - b * 150} width="12" height={b * 150} class="barre" />{/each}
      <line x1="50" x2="590" y1="180" y2="180" class="axe" />
      {#each [980, 1020, 1060, 1100, 1140] as v}<text x={50 + ((v - 980) / 4) * 13.5} y="198" class="g">{v}</text>{/each}
      <text x="590" y="214" class="g d">valeur du pixel (DN)</text>
      <line x1={50 + ((moy - 980) / 4) * 13.5} x2={50 + ((moy - 980) / 4) * 13.5} y1="20" y2="180" class="moy" />
      <text x={56 + ((moy - 980) / 4) * 13.5} y="30" class="g l">moyenne {moy.toFixed(2)} DN · écart-type {et.toFixed(2)} DN</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre d’images" bind:value={N} min={20} max={20000} log step={1} format={(v) => Math.round(v).toLocaleString('fr-FR')} />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0; font-family: var(--f-texte); }
  .barre { fill: color-mix(in oklab, var(--accent) 60%, transparent); }
  .axe { stroke: var(--filet-fort); }
  .moy { stroke: var(--encre); stroke-dasharray: 4 3; }
  .g { font-size: 11px; fill: var(--encre-3); text-anchor: middle; }
  .g.d { text-anchor: end; }
  .g.l { text-anchor: start; fill: var(--encre); font-weight: 600; }
</style>
