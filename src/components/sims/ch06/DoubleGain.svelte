<script lang="ts">
  // HDR par double gain : une seule intégration, deux lectures. Le gain fort lit les ombres avec peu de bruit
  // mais sature tôt ; le gain faible lit les hautes lumières. On fusionne.
  import Panneau from '../ui/Panneau.svelte';
  const X = (e: number) => 40 + (Math.log10(e) / 4.2) * 560; // 1 → 16 000 e⁻
  const Y = (v: number) => 200 - (v / 4095) * 170;
  const pts = Array.from({ length: 121 }, (_, i) => 10 ** ((i / 120) * 4.2));
  const fort = (e: number) => Math.min(4095, 64 + e * 4);
  const faible = (e: number) => Math.min(4095, 64 + e * 0.25);
  const chemin = (f: (e: number) => number) => pts.map((e, i) => `${i ? 'L' : 'M'}${X(e).toFixed(1)},${Y(f(e)).toFixed(1)}`).join(' ');
</script>

<Panneau note="Gains illustratifs : 4 DN/e⁻ et 0,25 DN/e⁻, ADC 12 bits. La fusion prend le gain fort tant qu’il n’est pas saturé, puis le gain faible (remis à l’échelle).">
  {#snippet figure()}
    <svg viewBox="0 0 640 230" role="img" aria-label="Réponses à gain fort et à gain faible">
      {#each [1, 10, 100, 1000, 10000] as e}<text x={X(e)} y="218" class="g m">{e.toLocaleString('fr-FR')}</text>{/each}
      <text x="600" y="230" class="g d">électrons collectés (log)</text>
      <line x1="40" x2="600" y1={Y(4095)} y2={Y(4095)} class="sat" />
      <text x="44" y={Y(4095) - 5} class="g">saturation de l’ADC (4 095 DN)</text>
      <path d={chemin(fort)} class="fort" />
      <path d={chemin(faible)} class="faible" />
      <text x={X(30)} y={Y(fort(30)) - 8} class="g fortT">gain fort : ombres détaillées</text>
      <text x={X(3000)} y={Y(faible(3000)) + 18} class="g faibleT">gain faible : hautes lumières</text>
      <line x1={X(1008)} x2={X(1008)} y1="30" y2="200" class="bascule" />
    </svg>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0.4rem; font-family: var(--f-texte); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.m { text-anchor: middle; }
  .g.d { text-anchor: end; }
  .sat { stroke: var(--ambre); stroke-dasharray: 5 4; }
  .fort { fill: none; stroke: var(--accent); stroke-width: 2.5; }
  .faible { fill: none; stroke: var(--encre); stroke-width: 2.5; }
  .fortT { fill: var(--accent); font-weight: 600; }
  .faibleT { fill: var(--encre); font-weight: 600; }
  .bascule { stroke: var(--encre-3); stroke-dasharray: 2 3; }
</style>
