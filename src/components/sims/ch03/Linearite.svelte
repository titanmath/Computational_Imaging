<script lang="ts">
  // Doubler l'exposition double le signal linéaire… mais pas le code sRGB (ni la valeur JPEG d'un téléphone).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { encoderSrgb } from '@/lib/sim/couleur';

  let k = $state(4);
  const X = (e: number) => 50 + (e / 8) * 520;
  const Y = (v: number) => 210 - v * 180;
  const lin = (e: number) => Math.min(1, 0.1 * e);
  const pts = Array.from({ length: 81 }, (_, i) => i / 10);
  const cLin = pts.map((e, i) => `${i ? 'L' : 'M'}${X(e)},${Y(lin(e))}`).join(' ');
  const cSrgb = pts.map((e, i) => `${i ? 'L' : 'M'}${X(e)},${Y(encoderSrgb(lin(e)))}`).join(' ');
</script>

<Panneau note="Exemple analytique des slides : signal = 0,1 × multiplicateur d’exposition, sans saturation. La courbe sRGB est celle de l’ICC.">
  {#snippet figure()}
    <svg viewBox="0 0 640 240" role="img" aria-label="Signal linéaire et code sRGB en fonction de l’exposition">
      {#each [0, 0.2, 0.4, 0.6, 0.8] as v}<line x1="50" x2="570" y1={Y(v)} y2={Y(v)} class="grille" /><text x="44" y={Y(v) + 4} class="g d">{v}</text>{/each}
      {#each [0, 2, 4, 6, 8] as e}<text x={X(e)} y="228" class="g m">× {e}</text>{/each}
      <path d={cLin} class="lin" />
      <path d={cSrgb} class="srgb" />
      {#each [k, 2 * k] as e, i}
        {#if e <= 8}
          <line x1={X(e)} x2={X(e)} y1={Y(encoderSrgb(lin(e)))} y2="210" class="rep" />
          <circle cx={X(e)} cy={Y(lin(e))} r="5" class="p-lin" />
          <circle cx={X(e)} cy={Y(encoderSrgb(lin(e)))} r="5" class="p-srgb" />
        {/if}
      {/each}
      <text x="575" y={Y(0.8) + 4} class="g lbl-lin">linéaire</text>
      <text x="575" y={Y(encoderSrgb(0.8)) + 4} class="g lbl-srgb">code sRGB</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Exposition de référence" bind:value={k} min={0.5} max={4} step={0.25} format={(v) => '× ' + v} />
    <p class="info">
      Exposition × 2 : linéaire {lin(k).toFixed(2)} → {lin(2 * k).toFixed(2)} (<b>× {(lin(2 * k) / lin(k)).toFixed(2)}</b>) ;
      sRGB {encoderSrgb(lin(k)).toFixed(2)} → {encoderSrgb(lin(2 * k)).toFixed(2)} (<b>× {(encoderSrgb(lin(2 * k)) / encoderSrgb(lin(k))).toFixed(2)}</b>).
    </p>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .lin { fill: none; stroke: var(--encre); stroke-width: 2.2; }
  .srgb { fill: none; stroke: var(--accent); stroke-width: 2.2; }
  .rep { stroke: var(--encre-3); stroke-dasharray: 3 3; }
  .p-lin { fill: var(--encre); }
  .p-srgb { fill: var(--accent); }
  .lbl-lin { fill: var(--encre); }
  .lbl-srgb { fill: var(--accent); }
  .info { margin: 0; font-size: 0.9rem; color: var(--encre-2); align-self: center; font-variant-numeric: tabular-nums; }
</style>
