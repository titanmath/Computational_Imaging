<script lang="ts">
  // Diagramme de chromaticité CIE 1931 (x, y) calculé à partir des fonctions colorimétriques :
  // locus spectral, droite des pourpres, triangle sRGB et blanc D65.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { cmf, encoderSrgb, hexSpectral, xyzVersRgbLin } from '@/lib/sim/couleur';

  let lambda = $state(520);
  let canvas: HTMLCanvasElement;
  const W = 340, H = 380;
  const X = (x: number) => 36 + x * 380;
  const Y = (y: number) => 350 - y * 380;
  const chroma = (l: number) => {
    const [a, b, c] = cmf(l);
    const s = a + b + c;
    return [a / s, b / s] as [number, number];
  };
  const locus = Array.from({ length: 321 }, (_, i) => chroma(380 + i)).filter((_, i) => i < 320);
  const cheminLocus = locus.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ') + ' Z';
  const sRGB = [
    [0.64, 0.33],
    [0.3, 0.6],
    [0.15, 0.06],
  ];
  const pt = $derived(chroma(lambda));

  function dedans(x: number, y: number) {
    // test du point dans le polygone du locus (rayon horizontal)
    let c = false;
    for (let i = 0, j = locus.length - 1; i < locus.length; j = i++) {
      const [xi, yi] = locus[i], [xj, yj] = locus[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  onMount(() => {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const im = ctx.createImageData(W, H);
    for (let py = 0; py < H; py++)
      for (let px = 0; px < W; px++) {
        const x = (px - 36) / 380, y = (350 - py) / 380;
        if (y <= 0.001 || !dedans(x, y)) continue;
        const Yv = 1;
        const rgb = xyzVersRgbLin([(x / y) * Yv, Yv, ((1 - x - y) / y) * Yv]).map((v) => Math.max(0, v));
        const m = Math.max(...rgb);
        const o = (py * W + px) * 4;
        im.data[o] = encoderSrgb(rgb[0] / m) * 255;
        im.data[o + 1] = encoderSrgb(rgb[1] / m) * 255;
        im.data[o + 2] = encoderSrgb(rgb[2] / m) * 255;
        im.data[o + 3] = 235;
      }
    ctx.putImageData(im, 0, 0);
  });
</script>

<Panneau note="Les couleurs hors du triangle sRGB sont seulement approchées (un écran ne peut pas les afficher). Le diagramme n’est pas perceptuellement uniforme : une même distance n’y représente pas la même différence perçue partout.">
  {#snippet figure()}
    <div class="g">
      <div class="diagramme">
        <canvas bind:this={canvas}></canvas>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Diagramme de chromaticité CIE 1931">
          {#each [0.2, 0.4, 0.6, 0.8] as v}
            <line x1={X(v)} x2={X(v)} y1={Y(0)} y2={Y(0.9)} class="grille" />
            <line x1={X(0)} x2={X(0.8)} y1={Y(v)} y2={Y(v)} class="grille" />
            <text x={X(v)} y={Y(0) + 14} class="g m">{v}</text>
            <text x={X(0) - 5} y={Y(v) + 4} class="g d">{v}</text>
          {/each}
          <text x={X(0.8)} y={Y(0) + 28} class="g d">x</text>
          <text x={X(0) - 18} y={Y(0.86)} class="g">y</text>
          <path d={cheminLocus} class="locus" />
          <polygon points={sRGB.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')} class="tri" />
          <circle cx={X(0.3127)} cy={Y(0.329)} r="4" class="d65" />
          <text x={X(0.3127) + 7} y={Y(0.329) + 4} class="g lbl">D65</text>
          {#each [460, 480, 500, 520, 540, 560, 580, 600, 620] as l}
            {@const [x, y] = chroma(l)}
            <circle cx={X(x)} cy={Y(y)} r="2" fill="var(--encre)" />
            <text x={X(x) + (l < 500 ? -6 : 6)} y={Y(y) + (l < 520 ? 4 : -4)} class="g" text-anchor={l < 500 ? 'end' : 'start'}>{l}</text>
          {/each}
          <circle cx={X(pt[0])} cy={Y(pt[1])} r="7" fill={hexSpectral(lambda)} stroke="var(--papier)" stroke-width="2.5" />
        </svg>
      </div>
      <div class="texte">
        <p><b>λ = {lambda} nm</b> → (x, y) = ({pt[0].toFixed(3)} ; {pt[1].toFixed(3)})</p>
        <p>Le <b>bord courbe</b> regroupe les couleurs spectrales pures ; la <b>droite du bas</b> joint le rouge et le violet (les pourpres, absents de l’arc-en-ciel).</p>
        <p>Le <b>triangle</b> est le gamut sRGB : ses sommets sont les primaires de l’écran ; tout mélange positif reste à l’intérieur.</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Couleur spectrale" bind:value={lambda} min={400} max={680} step={2} unite="nm" />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 0.8rem 1.1rem 0.3rem; }
  @media (max-width: 600px) { .g { grid-template-columns: 1fr; } }
  .diagramme { position: relative; }
  canvas, svg { width: 100%; height: auto; display: block; }
  svg { position: absolute; inset: 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); stroke-width: 0.6; }
  .g { font-size: 10px; fill: var(--encre-3); }
  .g.m { text-anchor: middle; }
  .g.d { text-anchor: end; }
  .lbl { fill: var(--encre); font-weight: 600; }
  .locus { fill: none; stroke: var(--encre); stroke-width: 1.4; }
  .tri { fill: none; stroke: var(--encre); stroke-width: 1.2; stroke-dasharray: 4 3; }
  .d65 { fill: #fff; stroke: #000; }
  .texte p { margin: 0 0 0.6rem; font-size: 0.92rem; color: var(--encre-2); }
</style>
