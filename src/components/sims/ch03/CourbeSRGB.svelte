<script lang="ts">
  // Fonction de transfert sRGB : C' = 12,92 C (C ≤ 0,0031308), 1,055 C^(1/2,4) − 0,055 sinon.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { encoderSrgb } from '@/lib/sim/couleur';

  let C = $state(0.18);
  const X = (v: number) => 50 + v * 260;
  const Y = (v: number) => 280 - v * 250;
  const courbe = Array.from({ length: 101 }, (_, i) => i / 100).map((c, i) => `${i ? 'L' : 'M'}${X(c)},${Y(encoderSrgb(c))}`).join(' ');
  const Cp = $derived(encoderSrgb(C));
  const code = $derived(Math.round(Cp * 255));
  const codeLin = $derived(Math.round(C * 255));
</script>

<Panneau>
  {#snippet figure()}
    <div class="g">
      <svg viewBox="0 0 330 310" role="img" aria-label={`C = ${C.toFixed(3)} donne C' = ${Cp.toFixed(4)}`}>
        <line x1="50" x2="310" y1="280" y2="280" class="axe" />
        <line x1="50" x2="50" y1="30" y2="280" class="axe" />
        <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} class="diag" />
        <path d={courbe} class="courbe" />
        <line x1={X(C)} x2={X(C)} y1="280" y2={Y(Cp)} class="rep" />
        <line x1="50" x2={X(C)} y1={Y(Cp)} y2={Y(Cp)} class="rep" />
        <circle cx={X(C)} cy={Y(Cp)} r="5" class="pt" />
        <text x={X(C)} y="298" class="g m">C = {C.toFixed(3)}</text>
        <text x="44" y={Y(Cp) + 4} class="g d">{Cp.toFixed(3)}</text>
        <text x="310" y="270" class="g d">valeur linéaire C</text>
        <text x="56" y="38" class="g">code C′</text>
      </svg>
      <div class="patchs">
        <div><span style={`background:rgb(${codeLin},${codeLin},${codeLin})`}></span><p>Valeur linéaire affichée telle quelle<br /><b>{codeLin}/255</b> (trop sombre)</p></div>
        <div><span style={`background:rgb(${code},${code},${code})`}></span><p>Valeur encodée sRGB<br /><b>{code}/255</b> (apparence correcte)</p></div>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Intensité linéaire C" bind:value={C} min={0} max={1} step={0.005} format={(v) => v.toFixed(3)} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 0.8rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .axe { stroke: var(--filet-fort); }
  .diag { stroke: var(--filet-fort); stroke-dasharray: 4 4; }
  .courbe { fill: none; stroke: var(--accent); stroke-width: 2.5; }
  .rep { stroke: var(--encre-3); stroke-dasharray: 3 3; }
  .pt { fill: var(--accent); stroke: var(--papier); stroke-width: 2; }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.m { text-anchor: middle; }
  .g.d { text-anchor: end; }
  .patchs { display: grid; gap: 0.8rem; }
  .patchs div { display: flex; gap: 0.8rem; align-items: center; }
  .patchs span { width: 4.5rem; height: 4.5rem; border-radius: 8px; flex: none; border: 1px solid var(--filet); }
  .patchs p { margin: 0; font-size: 0.88rem; color: var(--encre-2); }
</style>
