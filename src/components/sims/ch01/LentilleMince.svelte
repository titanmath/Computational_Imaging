<script lang="ts">
  // Lentille mince : 1/Z + 1/S = 1/f. On déplace l'objet (Z) et le capteur (S) ; un faisceau de rayons
  // traverse l'ouverture D, converge vers l'image nette S_Z et frappe le capteur en une tache de diamètre c.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { distanceImage, distanceObjetNette } from '@/lib/optique/lentille';

  let f = $state(50); // mm
  let Z = $state(300); // mm
  let S = $state(60); // mm
  let D = $state(28); // mm

  const E = 0.95; // px / mm
  const LX = 430;
  const AY = 175;
  const X = (mm: number) => LX + mm * E;
  const Yp = (mm: number) => AY - mm * E;
  const hObjet = 40; // mm

  const SZ = $derived(Z > f ? distanceImage(f, Z) : Infinity);
  const hImage = $derived(isFinite(SZ) ? (-hObjet * SZ) / Z : 0);
  const Znet = $derived(distanceObjetNette(f, S));
  // Faisceau : rayons partant du sommet de l'objet vers différents points de la pupille
  const rayons = $derived(
    Array.from({ length: 9 }, (_, i) => {
      const yL = -D / 2 + (D * i) / 8;
      // rayon : (−Z, h) → (0, yL) → image (SZ, hImage) → au-delà jusqu'au capteur
      const pente = isFinite(SZ) ? (hImage - yL) / SZ : (yL - hObjet) / Z;
      const yC = yL + pente * S;
      const xFin = Math.max(S, isFinite(SZ) ? SZ : S) + 25;
      return { yL, yC, yFin: yL + pente * xFin, xFin };
    }),
  );
  const tache = $derived(isFinite(SZ) ? (D * Math.abs(S - SZ)) / SZ : D);
  const net = $derived(tache < 0.6);

  let svg: SVGSVGElement;
  let glisse: 'objet' | 'capteur' | null = null;
  function deplacer(e: PointerEvent) {
    if (!glisse) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 720;
    const mm = (px - LX) / E;
    if (glisse === 'objet') Z = Math.round(Math.min(440, Math.max(f + 8, -mm)));
    else S = Math.round(Math.min(280, Math.max(f - 5, mm)) * 2) / 2;
  }
  const prendre = (q: 'objet' | 'capteur') => (e: PointerEvent) => {
    glisse = q;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
</script>

<Panneau>
  {#snippet figure()}
    <svg
      bind:this={svg}
      viewBox="0 0 720 350"
      role="img"
      aria-label={`Objet à ${Z} mm, capteur à ${S} mm, focale ${f} mm : l'objet net est à ${Znet.toFixed(0)} mm`}
      onpointermove={deplacer}
      onpointerup={() => (glisse = null)}
      onpointerleave={() => (glisse = null)}
    >
      <line x1="10" x2="710" y1={AY} y2={AY} class="axe" />
      <!-- foyers -->
      {#each [-f, f] as fx}
        <circle cx={X(fx)} cy={AY} r="3" class="foyer" />
      {/each}
      <text x={X(f)} y={AY + 18} class="petit">F′</text>
      <text x={X(-f)} y={AY + 18} class="petit">F</text>
      <!-- image nette (où convergent les rayons) -->
      {#if isFinite(SZ) && SZ < 330}
        <line x1={X(SZ)} x2={X(SZ)} y1={AY} y2={Yp(hImage)} class="image" />
        <text x={X(SZ)} y={Yp(hImage) + (hImage < 0 ? 16 : -8)} class="petit">image nette</text>
      {/if}
      <!-- rayons -->
      {#each rayons as r}
        <polyline class="ray" points={`${X(-Z)},${Yp(hObjet)} ${X(0)},${Yp(r.yL)} ${X(r.xFin)},${Yp(r.yFin)}`} />
      {/each}
      <!-- lentille -->
      <path class="lentille" d={`M${X(0)} ${Yp(D / 2 + 4)} Q ${X(0) + 14} ${AY} ${X(0)} ${Yp(-D / 2 - 4)} Q ${X(0) - 14} ${AY} ${X(0)} ${Yp(D / 2 + 4)} Z`} />
      <line x1={X(0)} x2={X(0)} y1={Yp(D / 2 + 30)} y2={Yp(D / 2 + 4)} class="diaph" />
      <line x1={X(0)} x2={X(0)} y1={Yp(-D / 2 - 4)} y2={Yp(-D / 2 - 30)} class="diaph" />
      <!-- objet (déplaçable) -->
      <g class="poignee" role="slider" tabindex="0" aria-label="Distance de l’objet" aria-valuenow={Z}
        onpointerdown={prendre('objet')}
        onkeydown={(e) => { if (e.key === 'ArrowLeft') Z = Math.min(440, Z + 5); if (e.key === 'ArrowRight') Z = Math.max(f + 8, Z - 5); }}>
        <rect x={X(-Z) - 14} y={Yp(hObjet) - 10} width="28" height={hObjet * E + 20} class="zone" />
        <line x1={X(-Z)} x2={X(-Z)} y1={AY} y2={Yp(hObjet)} class="objet" />
        <path d={`M${X(-Z) - 6} ${Yp(hObjet) + 9} L${X(-Z)} ${Yp(hObjet)} L${X(-Z) + 6} ${Yp(hObjet) + 9}`} class="objet" />
      </g>
      <text x={X(-Z)} y={AY + 34} class="petit">objet · Z = {Z} mm</text>
      <!-- capteur (déplaçable) -->
      <g class="poignee" role="slider" tabindex="0" aria-label="Position du capteur" aria-valuenow={S}
        onpointerdown={prendre('capteur')}
        onkeydown={(e) => { if (e.key === 'ArrowLeft') S = Math.max(f - 5, S - 0.5); if (e.key === 'ArrowRight') S = Math.min(280, S + 0.5); }}>
        <rect x={X(S) - 12} y={Yp(60)} width="24" height={120 * E} class="zone" />
        <line x1={X(S)} x2={X(S)} y1={Yp(55)} y2={Yp(-55)} class="capteur" class:net />
      </g>
      <text x={X(S)} y={Yp(-55) + 18} class="petit">capteur · S = {S.toFixed(1)} mm</text>
      <!-- tache sur le capteur -->
      <line x1={X(S) + 8} x2={X(S) + 8} y1={Yp(Math.max(...rayons.map((r) => r.yC)))} y2={Yp(Math.min(...rayons.map((r) => r.yC)))} class="tache" />
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Focale f" bind:value={f} min={25} max={90} step={1} unite="mm" />
    <Curseur label="Diamètre d’ouverture D" bind:value={D} min={4} max={60} step={1} unite="mm" />
    <div class="lecture">
      <p><span>Image nette de l’objet</span><strong>S<sub>Z</sub> = {isFinite(SZ) ? SZ.toFixed(1) : '∞'} mm</strong></p>
      <p><span>Objet net pour ce capteur</span><strong>Z = {Znet > 0 && isFinite(Znet) ? Znet.toFixed(0) : '∞'} mm</strong></p>
      <p><span>Tache de flou sur le capteur</span><strong class:ok={net}>c = {tache.toFixed(2)} mm{net ? ' · net' : ''}</strong></p>
    </div>
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
  .foyer {
    fill: var(--encre-2);
  }
  .ray {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.3;
    stroke-opacity: 0.8;
  }
  .lentille {
    fill: color-mix(in oklab, #8fb7ef 35%, transparent);
    stroke: #5f8fd6;
    stroke-width: 1.4;
  }
  .diaph {
    stroke: var(--encre);
    stroke-width: 4;
  }
  .objet {
    stroke: #e0359b;
    stroke-width: 3;
    fill: none;
    stroke-linecap: round;
  }
  .image {
    stroke: #e0359b;
    stroke-width: 2;
    stroke-dasharray: 3 3;
  }
  .capteur {
    stroke: var(--encre);
    stroke-width: 5;
    transition: stroke 0.2s;
  }
  .capteur.net {
    stroke: #2f9a5a;
  }
  .tache {
    stroke: var(--ambre);
    stroke-width: 4;
    stroke-linecap: round;
  }
  .zone {
    fill: transparent;
  }
  .poignee {
    cursor: ew-resize;
    outline: none;
  }
  .poignee:focus-visible .zone,
  .poignee:hover .zone {
    fill: color-mix(in oklab, var(--accent) 10%, transparent);
  }
  .petit {
    font-size: 12px;
    fill: var(--encre-2);
    text-anchor: middle;
    font-family: var(--f-texte);
    font-variant-numeric: tabular-nums;
  }
  .lecture {
    display: grid;
    gap: 0.2rem;
    font-size: 0.88rem;
    font-variant-numeric: tabular-nums;
  }
  .lecture p {
    margin: 0;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  .lecture span {
    color: var(--encre-2);
  }
  .ok {
    color: #2f9a5a;
  }
</style>
