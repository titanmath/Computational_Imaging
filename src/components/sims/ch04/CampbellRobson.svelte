<script lang="ts">
  // Mire de Campbell-Robson : fréquence spatiale croissante vers la droite, contraste décroissant vers le haut.
  // Clique là où les barres cessent d'être visibles : tu traces ta propre courbe de sensibilité au contraste.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { encoderSrgb } from '@/lib/sim/couleur';

  const W = 640, H = 320;
  const F0 = 0.6, F1 = 60; // cycles sur la largeur (aux extrémités, par unité de largeur ×10)
  const CMIN = 0.002;
  let canvas: HTMLCanvasElement;
  let points = $state<{ x: number; y: number }[]>([]);

  const contraste = (y: number) => Math.pow(10, Math.log10(CMIN) * (1 - y / H)); // haut : CMIN, bas : 1
  const frequence = (x: number) => F0 * Math.pow(F1 / F0, x / W);

  onMount(() => {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const im = ctx.createImageData(W, H);
    const r = Math.log(F1 / F0) / W;
    for (let x = 0; x < W; x++) {
      // phase = 2π ∫ f(x) dx  (f en cycles par 10 px)
      const phase = (2 * Math.PI * F0 * (Math.exp(r * x) - 1)) / r / 10;
      const s = Math.sin(phase);
      for (let y = 0; y < H; y++) {
        const L = 0.5 * (1 + contraste(y) * s);
        const v = Math.round(encoderSrgb(L) * 255);
        const o = (y * W + x) * 4;
        im.data[o] = im.data[o + 1] = im.data[o + 2] = v;
        im.data[o + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
  });
  function marquer(e: MouseEvent) {
    const b = canvas.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * W;
    const y = ((e.clientY - b.top) / b.height) * H;
    points = [...points.filter((p) => Math.abs(p.x - x) > 18), { x, y }].sort((a, c) => a.x - c.x);
  }
  // courbe de sensibilité : 1 / contraste seuil en fonction de la fréquence
  const GX = (x: number) => 40 + (x / W) * 280;
  const GY = (s: number) => 150 - (Math.log10(s) / Math.log10(1 / CMIN)) * 130;
</script>

<Panneau note="La position exacte dépend de ta distance à l’écran (elle change les cycles par degré) et de ton écran. Les vraies mesures se font par expériences de seuil contrôlées.">
  {#snippet figure()}
    <div class="g">
      <div class="mire" role="button" tabindex="0" onclick={marquer} onkeydown={() => {}} aria-label="Cliquer là où les barres disparaissent">
        <canvas bind:this={canvas}></canvas>
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {#if points.length > 1}<polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} class="trace" />{/if}
          {#each points as p}<circle cx={p.x} cy={p.y} r="5" class="pt" />{/each}
        </svg>
        <p class="axes"><span>contraste ↑ faible</span><span>fréquence spatiale →</span></p>
      </div>
      <svg class="csf" viewBox="0 0 330 175" role="img" aria-label="Ta courbe de sensibilité au contraste">
        <text x="40" y="12" class="t">Ta sensibilité au contraste (1 / C seuil)</text>
        <line x1="40" x2="320" y1="150" y2="150" class="axe" />
        <line x1="40" x2="40" y1="18" y2="150" class="axe" />
        <text x="320" y="168" class="t d">fréquence (échelle log)</text>
        {#if points.length}
          <polyline points={points.map((p) => `${GX(p.x)},${GY(1 / contraste(p.y))}`).join(' ')} class="trace" />
          {#each points as p}<circle cx={GX(p.x)} cy={GY(1 / contraste(p.y))} r="3.5" class="pt" />{/each}
        {:else}
          <text x="180" y="90" class="t m">clique sur la mire, de gauche à droite</text>
        {/if}
      </svg>
    </div>
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => (points = [])}>Effacer</Bouton>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 640px) { .g { grid-template-columns: 1fr; } }
  .mire { position: relative; cursor: crosshair; }
  canvas, .mire svg { width: 100%; height: auto; display: block; border-radius: 6px; }
  .mire svg { position: absolute; inset: 0; }
  .axes { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--encre-3); margin: 0.3rem 0 0; }
  .trace { fill: none; stroke: var(--accent); stroke-width: 2.5; }
  .pt { fill: var(--accent); stroke: #fff; stroke-width: 1.5; }
  .csf { width: 100%; height: auto; font-family: var(--f-texte); }
  .axe { stroke: var(--filet-fort); }
  .t { font-size: 10.5px; fill: var(--encre-3); }
  .t.d { text-anchor: end; }
  .t.m { text-anchor: middle; }
</style>
