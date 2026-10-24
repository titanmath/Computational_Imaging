<script lang="ts">
  // L(t) = L₀ [1 + m sin(2π f t)] : fréquence et profondeur de modulation. Tracé uniquement (pas de clignotement).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  let f = $state(5);
  let m = $state(0.6);
  const L0 = 50;
  const X = (t: number) => 50 + (t / 0.5) * 540;
  const Y = (L: number) => 200 - (L / 100) * 170;
  const courbe = $derived(Array.from({ length: 601 }, (_, i) => (i / 600) * 0.5).map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(L0 * (1 + m * Math.sin(2 * Math.PI * f * t))).toFixed(1)}`).join(' '));
</script>

<Panneau note="Pour éviter tout risque photosensible, la modulation est seulement tracée, pas affichée en clignotement.">
  {#snippet figure()}
    <svg viewBox="0 0 640 230" role="img" aria-label={`Modulation à ${f} Hz, profondeur ${m}`}>
      {#each [0, 50, 100] as v}<line x1="50" x2="590" y1={Y(v)} y2={Y(v)} class="grille" /><text x="44" y={Y(v) + 4} class="g d">{v}</text>{/each}
      {#each [0, 0.1, 0.2, 0.3, 0.4, 0.5] as t}<text x={X(t)} y="218" class="g m">{t}</text>{/each}
      <text x="8" y="14" class="g">luminance (cd/m²)</text>
      <text x="590" y="230" class="g d">temps (s)</text>
      <path d={courbe} class="c" />
      <line x1="50" x2="590" y1={Y(L0)} y2={Y(L0)} class="moy" />
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Fréquence f" bind:value={f} min={1} max={40} step={1} unite="Hz" />
    <Curseur label="Profondeur de modulation m" bind:value={m} min={0} max={1} step={0.05} />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .c { fill: none; stroke: var(--accent); stroke-width: 2; }
  .moy { stroke: var(--encre-3); stroke-dasharray: 4 4; }
</style>
