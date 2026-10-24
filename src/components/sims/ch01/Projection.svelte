<script lang="ts">
  // Projection perspective d'un sténopé idéal (vue de côté). Le point de la scène se déplace
  // à la souris/au doigt ; on lit sa projection sur le capteur physique (z = −f) et sur le plan virtuel (z = +f).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';

  let f = $state(1.2); // distance sténopé → capteur (unités : dm)
  let Y = $state(1.6);
  let Z = $state(4.5);
  let plan = $state<'physique' | 'virtuel' | 'les deux'>('les deux');

  const E = 70; // pixels par unité
  const OX = 210;
  const OY = 175;
  const sx = (z: number) => OX + z * E;
  const sy = (y: number) => OY - y * E;

  const ys = $derived((-f * Y) / Z);
  const yv = $derived((f * Y) / Z);

  let svg: SVGSVGElement;
  let glisse = false;
  function deplacer(e: PointerEvent) {
    if (!glisse) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 720;
    const py = ((e.clientY - r.top) / r.height) * 340;
    Z = Math.min(6.8, Math.max(1.6, (px - OX) / E));
    Y = Math.min(2.2, Math.max(-2.2, (OY - py) / E));
  }
</script>

<Panneau>
  {#snippet figure()}
    <svg
      bind:this={svg}
      viewBox="0 0 720 340"
      role="img"
      aria-label={`Point de la scène à Y = ${Y.toFixed(2)}, Z = ${Z.toFixed(2)} ; image y = ${yv.toFixed(3)}`}
      onpointermove={deplacer}
      onpointerup={() => (glisse = false)}
      onpointerleave={() => (glisse = false)}
    >
      <!-- axe optique -->
      <line x1="20" x2="700" y1={OY} y2={OY} class="axe" />
      <text x="690" y={OY - 8} class="petit fin">+Z</text>
      <!-- capteur physique -->
      {#if plan !== 'virtuel'}
        <line x1={sx(-f)} x2={sx(-f)} y1={sy(1.3)} y2={sy(-1.3)} class="capteur" />
        <text x={sx(-f)} y={sy(-1.3) + 18} class="petit">capteur (z = −f)</text>
      {/if}
      <!-- plan virtuel -->
      {#if plan !== 'physique'}
        <line x1={sx(f)} x2={sx(f)} y1={sy(1.3)} y2={sy(-1.3)} class="virtuel" />
        <text x={sx(f)} y={sy(1.3) - 8} class="petit">plan virtuel (z = +f)</text>
      {/if}
      <!-- rayon -->
      <line x1={sx(Z)} y1={sy(Y)} x2={sx(-f)} y2={sy(ys)} class="rayon" />
      <!-- sténopé -->
      <rect x={OX - 3} y={sy(2.4)} width="6" height={2.4 * E - 4} class="paroi" />
      <rect x={OX - 3} y={OY + 4} width="6" height={2.4 * E - 4} class="paroi" />
      <circle cx={OX} cy={OY} r="3.5" class="centre" />
      <text x={OX + 8} y={OY + 18} class="petit">C</text>
      <!-- cotes -->
      <line x1={sx(0)} x2={sx(Z)} y1={OY + 40} y2={OY + 40} class="cote" />
      <text x={sx(Z / 2)} y={OY + 56} class="petit">Z = {Z.toFixed(2)}</text>
      <line x1={sx(Z) + 14} x2={sx(Z) + 14} y1={OY} y2={sy(Y)} class="cote" />
      <text x={sx(Z) + 20} y={sy(Y / 2) + 4} class="petit gauche">Y = {Y.toFixed(2)}</text>
      <!-- projections -->
      {#if plan !== 'virtuel'}
        <circle cx={sx(-f)} cy={sy(ys)} r="5" class="img-p" />
        <text x={sx(-f) - 10} y={sy(ys) + 4} class="petit droite">y<tspan dy="3" font-size="9">s</tspan><tspan dy="-3"> = {ys.toFixed(3)}</tspan></text>
      {/if}
      {#if plan !== 'physique'}
        <circle cx={sx(f)} cy={sy(yv)} r="5" class="img-v" />
        <text x={sx(f) + 10} y={sy(yv) - 8} class="petit gauche">y = {yv.toFixed(3)}</text>
      {/if}
      <!-- point de la scène (déplaçable) -->
      <g
        class="poignee"
        role="slider"
        tabindex="0"
        aria-label="Point de la scène (glisser)"
        aria-valuenow={Z}
        onpointerdown={(e) => {
          glisse = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onkeydown={(e) => {
          if (e.key === 'ArrowUp') Y = Math.min(2.2, Y + 0.1);
          if (e.key === 'ArrowDown') Y = Math.max(-2.2, Y - 0.1);
          if (e.key === 'ArrowRight') Z = Math.min(6.8, Z + 0.1);
          if (e.key === 'ArrowLeft') Z = Math.max(1.6, Z - 0.1);
        }}
      >
        <circle cx={sx(Z)} cy={sy(Y)} r="16" class="halo" />
        <circle cx={sx(Z)} cy={sy(Y)} r="7" class="point" />
      </g>
      <text x={sx(Z)} y={sy(Y) - 22} class="petit">P (glisse-moi)</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Distance f (sténopé → capteur)" bind:value={f} min={0.5} max={2} step={0.05} />
    <Bascule label="Plan image" bind:value={plan} options={[{ valeur: 'physique', texte: 'Capteur' }, { valeur: 'virtuel', texte: 'Plan virtuel' }, { valeur: 'les deux', texte: 'Les deux' }]} />
  {/snippet}
</Panneau>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
    touch-action: none;
    user-select: none;
  }
  .axe {
    stroke: var(--filet-fort);
    stroke-dasharray: 4 4;
  }
  .capteur {
    stroke: var(--encre);
    stroke-width: 4;
  }
  .virtuel {
    stroke: var(--encre-3);
    stroke-width: 2;
    stroke-dasharray: 6 4;
  }
  .paroi {
    fill: var(--encre-2);
  }
  .centre {
    fill: var(--papier);
    stroke: var(--encre);
    stroke-width: 1.5;
  }
  .rayon {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .cote {
    stroke: var(--encre-3);
    stroke-width: 1;
  }
  .img-p {
    fill: var(--accent);
  }
  .img-v {
    fill: var(--papier);
    stroke: var(--accent);
    stroke-width: 2;
  }
  .poignee {
    cursor: grab;
    outline: none;
  }
  .poignee:focus-visible .halo {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .halo {
    fill: color-mix(in oklab, var(--accent) 16%, transparent);
  }
  .point {
    fill: var(--accent);
    stroke: var(--papier);
    stroke-width: 2;
  }
  .petit {
    font-size: 12.5px;
    fill: var(--encre-2);
    text-anchor: middle;
    font-family: var(--f-texte);
    font-variant-numeric: tabular-nums;
  }
  .gauche {
    text-anchor: start;
  }
  .droite {
    text-anchor: end;
  }
  .fin {
    text-anchor: end;
  }
</style>
