<script lang="ts">
  // Distorsion radiale : x_d = x (1 + k₁r² + k₂r⁴). Damier idéal → damier distordu, et le point B des slides.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';

  let k1 = $state(-0.2);
  let k2 = $state(0);
  let vue = $state<'distordu' | 'ideal'>('distordu');
  const W = 1600, H = 1200, cx = 800, cy = 600, fpx = 1000;
  const S = 0.3; // px écran / px capteur

  function distordre(u: number, v: number): [number, number] {
    const x = (u - cx) / fpx, y = (v - cy) / fpx;
    const r2 = x * x + y * y;
    const g = 1 + k1 * r2 + k2 * r2 * r2;
    return [fpx * x * g + cx, fpx * y * g + cy];
  }
  const cases = $derived.by(() => {
    const out: { d: string; noir: boolean }[] = [];
    const pas = 100;
    for (let j = 0; j < H / pas; j++)
      for (let i = 0; i < W / pas; i++) {
        const bord: [number, number][] = [];
        const n = 6;
        for (let k = 0; k < n; k++) bord.push([i * pas + (k / n) * pas, j * pas]);
        for (let k = 0; k < n; k++) bord.push([(i + 1) * pas, j * pas + (k / n) * pas]);
        for (let k = 0; k < n; k++) bord.push([(i + 1) * pas - (k / n) * pas, (j + 1) * pas]);
        for (let k = 0; k < n; k++) bord.push([i * pas, (j + 1) * pas - (k / n) * pas]);
        const pts = bord.map(([u, v]) => (vue === 'distordu' ? distordre(u, v) : [u, v]));
        out.push({ d: 'M' + pts.map(([a, b]) => `${(a * S).toFixed(1)},${(b * S).toFixed(1)}`).join('L') + 'Z', noir: (i + j) % 2 === 0 });
      }
    return out;
  });
  const B: [number, number] = [1400, 1000];
  const Bd = $derived(distordre(...B));
  const type = $derived(k1 < -0.01 ? 'en barillet : les bords se bombent vers l’extérieur' : k1 > 0.01 ? 'en coussinet : les bords se pincent vers l’intérieur' : 'aucune');
</script>

<Panneau note="Modèle : x = (u − cₓ)/fₓ, r² = x² + y², g = 1 + k₁r² + k₂r⁴, u_d = fₓ·x·g + cₓ. Capteur 1600 × 1200 px, c = (800, 600), fₓ = fᵧ = 1000 px.">
  {#snippet figure()}
    <div class="cadre">
      <svg viewBox={`-30 -30 ${W * S + 60} ${H * S + 60}`} role="img" aria-label={`Damier avec distorsion ${type}`}>
        <rect x="0" y="0" width={W * S} height={H * S} class="capteur" />
        {#each cases as c}
          <path d={c.d} class:noir={c.noir} class="case" />
        {/each}
        <circle cx={cx * S} cy={cy * S} r="4" class="pp" />
        <circle cx={B[0] * S} cy={B[1] * S} r="5" class="b" />
        {#if vue === 'distordu'}
          <line x1={B[0] * S} y1={B[1] * S} x2={Bd[0] * S} y2={Bd[1] * S} class="fleche" />
          <circle cx={Bd[0] * S} cy={Bd[1] * S} r="5" class="bd" />
        {/if}
      </svg>
      <div class="lecture">
        <p><span>B (idéal)</span><strong>(1400, 1000) px</strong></p>
        <p><span>B′ (distordu)</span><strong>({Bd[0].toFixed(1)}, {Bd[1].toFixed(1)}) px</strong></p>
        <p><span>Distorsion</span><strong>{type}</strong></p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="k₁" bind:value={k1} min={-0.45} max={0.45} step={0.01} />
    <Curseur label="k₂" bind:value={k2} min={-0.2} max={0.2} step={0.01} />
    <Bascule label="Affichage" bind:value={vue} options={[{ valeur: 'distordu', texte: 'Capturé (distordu)' }, { valeur: 'ideal', texte: 'Après correction' }]} />
  {/snippet}
</Panneau>

<style>
  .cadre {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
    padding: 1rem 1.1rem 0.5rem;
  }
  @media (max-width: 600px) {
    .cadre {
      grid-template-columns: 1fr;
    }
  }
  svg {
    width: 100%;
    height: auto;
  }
  .capteur {
    fill: none;
    stroke: var(--encre-3);
    stroke-dasharray: 4 4;
  }
  .case {
    fill: var(--papier-2);
    stroke: none;
  }
  .case.noir {
    fill: var(--encre);
  }
  .pp {
    fill: var(--ambre);
  }
  .b {
    fill: none;
    stroke: #e0359b;
    stroke-width: 2.5;
  }
  .bd {
    fill: #e0359b;
  }
  .fleche {
    stroke: #e0359b;
    stroke-width: 2;
  }
  .lecture {
    display: grid;
    gap: 0.35rem;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
  .lecture p {
    margin: 0;
    display: flex;
    flex-direction: column;
  }
  .lecture span {
    color: var(--encre-3);
    font-size: 0.8rem;
  }
</style>
