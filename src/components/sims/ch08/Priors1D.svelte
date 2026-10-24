<script lang="ts">
  // Trois a priori de gradient sur un signal 1D bruité (créneau, rampe, sinusoïde) :
  // L2² (forme fermée), L1 / TV (dual projeté), L0 (exact, programmation dynamique).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { l0Potts1D, l2Ferme1D, tv1D } from '@/lib/sim/priors';
  import { signalMorceaux } from '@/lib/sim/scenes';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  const n = 160;
  const x = Float64Array.from(signalMorceaux(n));
  let bruit = $state(0.06);
  let tirage = $state(3);
  let l2 = $state(1);
  let l1 = $state(0.1);
  let l0 = $state(0.02);
  let vue = $state<'l2' | 'l1' | 'l0' | 'tout'>('tout');
  const b = $derived.by(() => {
    const a = creerAlea(tirage);
    return Float64Array.from(x, (v) => v + bruit * gauss(a));
  });
  const r2 = $derived(l2Ferme1D(b, l2));
  const r1 = $derived(tv1D(b, l1, 2500));
  const r0 = $derived(l0Potts1D(b, l0));
  const rmse = (s: ArrayLike<number>) => Math.sqrt(Array.from(s).reduce((t, v, i) => t + (v - x[i]) ** 2, 0) / n);
  const sauts = (s: ArrayLike<number>) => {
    let k = 0;
    for (let i = 1; i < n; i++) if (Math.abs(s[i] - s[i - 1]) > 1e-6) k++;
    return k;
  };
  const X = (i: number) => 34 + (i / (n - 1)) * 576;
  const Y = (v: number) => 210 - v * 180;
  const ch = (s: ArrayLike<number>) => Array.from(s, (v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const COUL = { l2: '#3a78b5', l1: 'var(--accent)', l0: '#c38a1d' };
  const montrer = (k: 'l2' | 'l1' | 'l0') => vue === 'tout' || vue === k;
</script>

<Panneau note={`Erreur RMS par rapport au signal propre : mesure ${rmse(b).toFixed(3)} · L2² ${rmse(r2).toFixed(3)} · L1 ${rmse(r1).toFixed(3)} · L0 ${rmse(r0).toFixed(3)} (${sauts(r0)} sauts). L2² lisse tout, bords compris ; L1 garde les bords mais aplatit les pentes en marches ; L0 donne des marches franches, peu nombreuses.`}>
  {#snippet figure()}
    <svg viewBox="0 0 640 240" role="img" aria-label="Signal bruité, signal propre et reconstructions">
      {#each [0, 0.5, 1] as v}<line x1="34" x2="610" y1={Y(v)} y2={Y(v)} class="grille" /><text x="28" y={Y(v) + 4} class="g d">{v}</text>{/each}
      <path d={ch(b)} class="bruite" />
      <path d={ch(x)} class="propre" />
      {#if montrer('l2')}<path d={ch(r2)} style={`stroke:${COUL.l2}`} class="r" />{/if}
      {#if montrer('l1')}<path d={ch(r1)} style={`stroke:${COUL.l1}`} class="r" />{/if}
      {#if montrer('l0')}<path d={ch(r0)} style={`stroke:${COUL.l0}`} class="r" />{/if}
      <g class="leg">
        <text x="40" y="232" class="g">— bruité</text>
        <text x="110" y="232" class="g p">— propre</text>
        <text x="186" y="232" class="g" style={`fill:${COUL.l2}`}>— L2²</text>
        <text x="236" y="232" class="g" style={`fill:${COUL.l1}`}>— L1</text>
        <text x="280" y="232" class="g" style={`fill:${COUL.l0}`}>— L0</text>
        <text x="610" y="232" class="g d">position du pixel →</text>
      </g>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Afficher" bind:value={vue} options={[{ valeur: 'l2', texte: 'L2²' }, { valeur: 'l1', texte: 'L1' }, { valeur: 'l0', texte: 'L0' }, { valeur: 'tout', texte: 'Superposition' }]} />
    <Curseur label="Bruit σ" bind:value={bruit} min={0} max={0.15} step={0.005} format={(v) => v.toFixed(3)} />
    <Curseur label="λ₂ (L2²)" bind:value={l2} min={0.05} max={50} log format={(v) => v.toFixed(2)} />
    <Curseur label="λ₁ (L1)" bind:value={l1} min={0.005} max={0.5} log format={(v) => v.toFixed(3)} />
    <Curseur label="λ₀ (L0)" bind:value={l0} min={0.001} max={0.3} log format={(v) => v.toFixed(3)} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => tirage++}>Nouveau bruit</Bouton>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.7rem 0.8rem 0.2rem; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .bruite { fill: none; stroke: var(--encre-3); stroke-width: 1; opacity: 0.55; }
  .propre { fill: none; stroke: var(--encre); stroke-width: 1.6; }
  .r { fill: none; stroke-width: 2.2; }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.p { fill: var(--encre); }
</style>
