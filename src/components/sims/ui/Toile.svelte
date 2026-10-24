<script lang="ts">
  // Affiche une image flottante (lib/sim) dans un canvas agrandi sans lissage.
  import { dessiner, type Img } from '@/lib/sim/image';
  interface Props {
    image: Img | undefined;
    gain?: number;
    affichage?: 'srgb' | 'lineaire';
    signe?: boolean;
    etiquette?: string;
    lisse?: boolean;
    /** canvas seul, sans <figure> (ex. à l'intérieur d'un bouton) */
    seul?: boolean;
  }
  let { image, gain = 1, affichage = 'srgb', signe = false, etiquette, lisse = false, seul = false }: Props = $props();
  let canvas = $state<HTMLCanvasElement>();
  $effect(() => {
    if (canvas && image) dessiner(canvas, image, { gain, affichage, signe });
  });
</script>

{#if seul}
  <canvas bind:this={canvas} class:lisse style={image ? `aspect-ratio:${image.l}/${image.h}` : ''}></canvas>
{:else}
  <figure class="toile">
    <canvas bind:this={canvas} class:lisse style={image ? `aspect-ratio:${image.l}/${image.h}` : ''}></canvas>
    {#if etiquette}<figcaption>{etiquette}</figcaption>{/if}
  </figure>
{/if}

<style>
  .toile {
    margin: 0;
    min-width: 0;
  }
  canvas {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 6px;
    image-rendering: pixelated;
    background: var(--papier-3);
  }
  canvas.lisse {
    image-rendering: auto;
  }
  figcaption {
    margin-top: 0.4rem;
    font-size: 0.82rem;
    color: var(--c-encre-2, var(--encre-3));
    text-align: center;
  }
</style>
