<script lang="ts">
  // Champ de vision : FoV = 2 arctan(H / 2f). Vue de dessus du cône + image rectilinéaire obtenue.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { panorama, PANORAMA_FOV } from '@/lib/sim/scenes';
  import type { Img } from '@/lib/sim/image';
  import { encoderSrgb } from '@/lib/sim/couleur';

  let f = $state(24); // mm
  const H = 36; // largeur du capteur plein format (mm) → FoV horizontal
  const fov = $derived(2 * Math.atan(H / (2 * f)));
  const fovDeg = $derived((fov * 180) / Math.PI);
  let pano: Img | undefined;
  let canvas: HTMLCanvasElement;

  function rendre() {
    if (!pano || !canvas) return;
    const W = 480;
    const Hc = 270;
    canvas.width = W;
    canvas.height = Hc;
    const ctx = canvas.getContext('2d')!;
    const out = ctx.createImageData(W, Hc);
    const t = Math.tan(Math.min(fov, PANORAMA_FOV * 0.98) / 2);
    for (let x = 0; x < W; x++) {
      const ux = ((x + 0.5) / W) * 2 - 1;
      const phi = Math.atan(ux * t);
      const px = Math.round(pano.l / 2 + (phi / (PANORAMA_FOV / 2)) * (pano.l / 2));
      for (let y = 0; y < Hc; y++) {
        // projection rectilinéaire verticale : on agrandit autour de l'horizon
        const uy = ((y + 0.5) / Hc) * 2 - 1;
        const th = Math.atan(uy * t * (Hc / W)) / Math.cos(phi);
        // au-delà du panorama : on prolonge le ciel et le sol
        const py = Math.min(pano.h - 1, Math.max(0, Math.round(pano.h * 0.56 + (th / (PANORAMA_FOV / 2)) * (pano.l / 2))));
        const o = (y * W + x) * 4;
        if (px < 0 || px >= pano.l) {
          out.data[o] = out.data[o + 1] = out.data[o + 2] = 40;
        } else {
          const i = (py * pano.l + px) * 3;
          out.data[o] = encoderSrgb(pano.d[i]) * 255;
          out.data[o + 1] = encoderSrgb(pano.d[i + 1]) * 255;
          out.data[o + 2] = encoderSrgb(pano.d[i + 2]) * 255;
        }
        out.data[o + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }
  onMount(() => {
    pano = panorama();
    rendre();
  });
  $effect(() => {
    void fov;
    rendre();
  });

  const nom = $derived(fovDeg > 95 ? 'ultra grand-angle' : fovDeg > 62 ? 'grand-angle' : fovDeg > 40 ? 'normal' : fovDeg > 18 ? 'téléobjectif' : 'long téléobjectif');
  // vue de dessus
  const OX = 40, OY = 135, L = 220;
  const capteurX = $derived(OX - Math.min(70, f * 0.9));
</script>

<Panneau>
  {#snippet figure()}
    <div class="grille">
      <svg viewBox="0 0 280 270" role="img" aria-label={`Cône de vision de ${fovDeg.toFixed(1)} degrés`}>
        <path d={`M${OX},${OY} L${OX + L * Math.cos(fov / 2)},${OY - L * Math.sin(fov / 2)} A${L},${L} 0 0 1 ${OX + L * Math.cos(fov / 2)},${OY + L * Math.sin(fov / 2)} Z`} class="cone" />
        <line x1={OX} y1={OY} x2={OX + L * Math.cos(fov / 2)} y2={OY - L * Math.sin(fov / 2)} class="bord" />
        <line x1={OX} y1={OY} x2={OX + L * Math.cos(fov / 2)} y2={OY + L * Math.sin(fov / 2)} class="bord" />
        <line x1={capteurX} x2={capteurX} y1={OY - 18} y2={OY + 18} class="capteur" />
        <line x1={capteurX} x2={OX} y1={OY - 18} y2={OY} class="bord fin" />
        <line x1={capteurX} x2={OX} y1={OY + 18} y2={OY} class="bord fin" />
        <circle cx={OX} cy={OY} r="3" class="centre" />
        <text x={OX + 70} y={OY + 4} class="angle">{fovDeg.toFixed(1)}°</text>
        <text x={(capteurX + OX) / 2} y={OY + 34} class="leg">f</text>
      </svg>
      <div class="vue">
        <canvas bind:this={canvas}></canvas>
        <p class="type">{nom} · équivalent {f.toFixed(0)} mm</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Focale f (capteur 36 × 24 mm)" bind:value={f} min={10} max={300} log step={1} unite="mm" format={(v) => v.toFixed(0)} />
  {/snippet}
</Panneau>

<style>
  .grille {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.6fr);
    gap: 1rem;
    align-items: center;
    padding: 1rem 1.1rem 0.6rem;
  }
  @media (max-width: 560px) {
    .grille {
      grid-template-columns: 1fr;
    }
  }
  svg {
    width: 100%;
    height: auto;
  }
  .cone {
    fill: color-mix(in oklab, var(--accent) 14%, transparent);
  }
  .bord {
    stroke: var(--accent);
    stroke-width: 1.5;
  }
  .bord.fin {
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .capteur {
    stroke: var(--encre);
    stroke-width: 4;
  }
  .centre {
    fill: var(--encre);
  }
  .angle {
    font-family: var(--f-titre);
    font-size: 22px;
    fill: var(--accent);
  }
  .leg {
    font-size: 12px;
    fill: var(--encre-3);
    text-anchor: middle;
  }
  canvas {
    width: 100%;
    height: auto;
    border-radius: 6px;
    display: block;
  }
  .type {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
    color: var(--encre-3);
    text-align: center;
  }
</style>
