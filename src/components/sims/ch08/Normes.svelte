<script lang="ts">
  // Normes d'un petit vecteur (barres déplaçables, au doigt, à la souris ou au clavier) et pénalité par
  // composante |t|^p : p = 2 (carré), p = 1, p → 0 (comptage des non-nuls).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';

  let x = $state([0, -3, 4]);
  let p = $state(0.5);
  const n2 = $derived(Math.hypot(...x));
  const n1 = $derived(x.reduce((s, v) => s + Math.abs(v), 0));
  const n0 = $derived(x.filter((v) => v !== 0).length);
  const np = $derived(x.reduce((s, v) => s + (v === 0 ? 0 : Math.abs(v) ** p), 0));

  // barres : y ∈ [−5, 5]
  const BY = (v: number) => 130 - v * 22;
  let svg: SVGSVGElement;
  let actif = -1;
  function valeurDepuis(e: PointerEvent) {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    const v = Math.round(((130 - pt.y) / 22) * 2) / 2;
    return Math.max(-5, Math.min(5, v));
  }
  function bas(i: number, e: PointerEvent) {
    actif = i;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    x[i] = valeurDepuis(e);
  }
  function bouge(e: PointerEvent) {
    if (actif >= 0) x[actif] = valeurDepuis(e);
  }
  function touche(i: number, e: KeyboardEvent) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') x[i] = Math.min(5, x[i] + 0.5);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') x[i] = Math.max(-5, x[i] - 0.5);
    else if (e.key === '0') x[i] = 0;
    else return;
    e.preventDefault();
  }
  // courbes de pénalité par composante sur t ∈ [−1, 1]
  const CX = (t: number) => 300 + (t + 1) * 140;
  const CY = (v: number) => 220 - v * 170;
  const courbe = (f: (t: number) => number) =>
    Array.from({ length: 201 }, (_, k) => {
      const t = -1 + k / 100;
      return `${k ? 'L' : 'M'}${CX(t).toFixed(1)},${CY(f(t)).toFixed(1)}`;
    }).join(' ');
  const cp = $derived(courbe((t) => (t === 0 ? 0 : Math.abs(t) ** p)));
</script>

<Panneau note="Fais glisser les barres (ou flèches du clavier, 0 pour annuler une composante). À droite, la pénalité d’une seule composante : le carré écrase les petites valeurs presque gratuitement, la norme 1 les fait payer proportionnellement, et L0 fait payer 1 dès que la composante n’est pas exactement nulle.">
  {#snippet figure()}
    <svg bind:this={svg} viewBox="0 0 600 250" role="group" aria-label="Vecteur à trois composantes et pénalités">
      <!-- vecteur -->
      <line x1="30" x2="250" y1={BY(0)} y2={BY(0)} class="axe" />
      {#each [-4, -2, 2, 4] as v}<line x1="30" x2="250" y1={BY(v)} y2={BY(v)} class="grille" /><text x="24" y={BY(v) + 4} class="g d">{v}</text>{/each}
      {#each x as v, i}
        {@const cx = 70 + i * 70}
        <rect x={cx - 22} y={Math.min(BY(v), BY(0))} width="44" height={Math.max(1, Math.abs(BY(v) - BY(0)))} class="barre" class:nulle={v === 0} />
        <rect
          x={cx - 30} y="10" width="60" height="240" class="zone" tabindex="0" role="slider"
          aria-label={`Composante x${i + 1}`} aria-valuemin={-5} aria-valuemax={5} aria-valuenow={v}
          onpointerdown={(e) => bas(i, e)} onpointermove={bouge} onpointerup={() => (actif = -1)} onkeydown={(e) => touche(i, e)}
        />
        <text x={cx} y="246" class="g m">x{i + 1} = {v}</text>
      {/each}
      <!-- pénalités -->
      <line x1={CX(-1)} x2={CX(1)} y1={CY(0)} y2={CY(0)} class="axe" />
      <line x1={CX(0)} x2={CX(0)} y1={CY(0)} y2={CY(1.1)} class="axe" />
      <text x={CX(1)} y={CY(0) + 16} class="g d">valeur d’une composante t</text>
      <text x={CX(-1)} y={CY(1) - 8} class="g">pénalité</text>
      <path d={courbe((t) => t * t)} class="c2" />
      <path d={courbe((t) => Math.abs(t))} class="c1" />
      <path d={`M${CX(-1)},${CY(1)} L${CX(1)},${CY(1)}`} class="c0" />
      <circle cx={CX(0)} cy={CY(1)} r="4" class="trou" />
      <circle cx={CX(0)} cy={CY(0)} r="4" class="plein0" />
      <path d={cp} class="cp" />
      <text x={CX(0.62)} y={CY(0.26)} class="g l2">t²</text>
      <text x={CX(0.4)} y={CY(0.52)} class="g l1">|t|</text>
      <text x={CX(0.45)} y={CY(1) - 6} class="g l0">1[t ≠ 0]</text>
      <text x={CX(-0.97)} y={CY(1.08)} class="g lp">|t|<tspan dy="-5" font-size="9">p</tspan><tspan dy="5"> (p = {p.toFixed(2)})</tspan></text>
    </svg>
    <div class="valeurs">
      <span class="v l2">‖x‖₂ = {n2.toFixed(2)} <small>(‖x‖₂² = {(n2 * n2).toFixed(1)})</small></span>
      <span class="v l1">‖x‖₁ = {n1.toFixed(1)}</span>
      <span class="v l0">‖x‖₀ = {n0} <small>(un comptage, pas une norme)</small></span>
      <span class="v lp">Σ|xᵢ|^p = {np.toFixed(2)}</span>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Exposant p (courbe pointillée)" bind:value={p} min={0.05} max={2} step={0.05} format={(v) => v.toFixed(2)} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => (x = [0, -3, 4])}>x = (0, −3, 4)</Bouton>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.8rem 0; font-family: var(--f-texte); touch-action: none; }
  .axe { stroke: var(--encre-3); }
  .grille { stroke: var(--filet); }
  .barre { fill: var(--accent); transition: y 0.12s, height 0.12s; }
  .barre.nulle { fill: var(--encre-3); }
  .zone { fill: transparent; cursor: ns-resize; outline: none; }
  .zone:focus-visible { stroke: var(--accent); stroke-width: 1.5; stroke-dasharray: 4 3; }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .c2, .c1, .c0, .cp { fill: none; stroke-width: 2.2; }
  .c2 { stroke: #3a78b5; }
  .c1 { stroke: var(--accent); }
  .c0 { stroke: #c38a1d; }
  .cp { stroke: var(--encre); stroke-dasharray: 5 4; stroke-width: 1.6; }
  .trou { fill: var(--papier); stroke: #c38a1d; stroke-width: 2; }
  .plein0 { fill: #c38a1d; }
  .l2 { fill: #3a78b5; color: #3a78b5; }
  .l1 { fill: var(--accent); color: var(--accent); }
  .l0 { fill: #c38a1d; color: #c38a1d; }
  .lp { fill: var(--encre); color: var(--encre); }
  .valeurs { display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem; padding: 0.2rem 1.1rem 0.6rem; font-size: 0.92rem; font-variant-numeric: tabular-nums; }
  .v small { color: var(--encre-3); font-size: 0.78rem; }
</style>
