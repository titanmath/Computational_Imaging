<script lang="ts">
  // PSF par tracé de rayons Monte-Carlo : on échantillonne la pupille, on « bine » les impacts.
  // Plus il y a de rayons, plus l'histogramme approche la PSF exacte (bruit d'échantillonnage ∝ 1/√N).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { dessinerCarte } from '@/lib/sim/colormaps';
  import { creerAlea } from '@/lib/sim/rng';

  let nRayons = $state(2500);
  let graine = $state(1);
  let canvas: HTMLCanvasElement;
  let erreur = $state(0);
  // f = 50 mm, D = 12,5 mm, Δz = +80 µm → disque de rayon 10 µm ; cases de 1 µm, fenêtre ±20 µm
  const R = 10;
  const T = 41;
  const reference = (() => {
    const h = new Float64Array(T * T);
    const ss = 8;
    for (let j = 0; j < T; j++)
      for (let i = 0; i < T; i++) {
        let c = 0;
        for (let a = 0; a < ss; a++)
          for (let b = 0; b < ss; b++) {
            const x = i - 20 - 0.5 + (a + 0.5) / ss;
            const y = j - 20 - 0.5 + (b + 0.5) / ss;
            if (x * x + y * y <= R * R) c++;
          }
        h[j * T + i] = c;
      }
    const s = h.reduce((a, b) => a + b, 0);
    return h.map((v) => v / s);
  })();

  $effect(() => {
    if (!canvas) return;
    const N = Math.round(nRayons);
    const alea = creerAlea(graine * 7919 + N);
    const h = new Float64Array(T * T);
    for (let k = 0; k < N; k++) {
      // point uniforme dans la pupille → impact proportionnel sur le capteur défocalisé
      const r = Math.sqrt(alea()) * R;
      const th = alea() * Math.PI * 2;
      const i = Math.floor(r * Math.cos(th) + 20.5);
      const j = Math.floor(r * Math.sin(th) + 20.5);
      if (i >= 0 && j >= 0 && i < T && j < T) h[j * T + i]++;
    }
    for (let i = 0; i < h.length; i++) h[i] /= N;
    erreur = h.reduce((s, v, i) => s + Math.abs(v - reference[i]), 0);
    const max = Math.max(...reference) * 1.6;
    dessinerCarte(canvas, h, T, T, undefined, (v) => (v <= 0 ? 0 : Math.max(0, 1 + Math.log10(v / max) / 2.5)));
  });
</script>

<Panneau sombre note="f = 50 mm, D = 12,5 mm, capteur décalé de +80 µm : la PSF géométrique exacte est un disque uniforme de 10 µm de rayon. Cases de 1 µm. Erreur = Σ|h − h∞|.">
  {#snippet figure()}
    <div class="g">
      <canvas bind:this={canvas}></canvas>
      <div class="chiffres">
        <p class="n">{Math.round(nRayons).toLocaleString('fr-FR')} rayons</p>
        <p class="e">erreur Σ|h − h∞| = <strong>{erreur.toFixed(3)}</strong></p>
        <p class="r">Le bruit d’échantillonnage diminue comme 1/√N : 25 fois plus de rayons → erreur ≈ 5 fois plus faible.</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre de rayons tracés" bind:value={nRayons} min={100} max={62500} log step={1} format={(v) => Math.round(v).toLocaleString('fr-FR')} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => graine++}>Nouveau tirage</Bouton>
  {/snippet}
</Panneau>

<style>
  .g {
    display: grid;
    grid-template-columns: minmax(0, 14rem) 1fr;
    gap: 1.5rem;
    align-items: center;
    padding: 1.1rem;
  }
  @media (max-width: 520px) {
    .g {
      grid-template-columns: 1fr;
    }
  }
  canvas {
    width: 100%;
    aspect-ratio: 1;
    image-rendering: pixelated;
    border-radius: 6px;
  }
  .chiffres p {
    margin: 0 0 0.5rem;
  }
  .n {
    font-family: var(--f-titre);
    font-size: 1.6rem;
    color: var(--table-encre);
  }
  .e {
    font-variant-numeric: tabular-nums;
    color: var(--table-encre);
  }
  .r {
    font-size: 0.88rem;
    color: var(--table-encre-2);
  }
</style>
