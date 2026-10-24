<script lang="ts">
  // Gradients d'une image (différences avant D_h x, D_v x) et coût par pixel des trois a priori :
  // 1[g_p ≠ 0] (L0), g_p = ‖∇x(p)‖₂ (L1, TV isotrope), g_p² (L2²). Image quantifiée sur 8 bits comme une photo.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { gradients } from '@/lib/sim/priors';
  import { dessinerCarte, divergente } from '@/lib/sim/colormaps';
  import { bruiter, H, imageGrise, L, versImg } from '@/lib/sim/imageTest';

  let bruit = $state(0);
  let vue = $state<'dh' | 'dv' | 'l0' | 'l1' | 'l2'>('dh');
  let carte: HTMLCanvasElement;
  const x = $derived(bruiter(imageGrise(), bruit, 4).map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255) / 255));
  const g = $derived(gradients(x, L, H));
  const gp = $derived(Float64Array.from(g.dx, (v, k) => Math.hypot(v, g.dy[k])));
  const stats = $derived.by(() => {
    let nz = 0, s1 = 0, s2 = 0;
    for (const v of gp) {
      if (v > 1e-9) nz++;
      s1 += v;
      s2 += v * v;
    }
    return { nz: (100 * nz) / gp.length, s1, s2 };
  });
  const gris = (t: number): [number, number, number] => [255 * t, 255 * t, 255 * t];
  const CONFIG = {
    dh: { titre: 'Différence horizontale Dₕx = x_droite − x_p', bornes: '≤ −0,2 · 0 · ≥ 0,2' },
    dv: { titre: 'Différence verticale Dᵥx = x_dessous − x_p', bornes: '≤ −0,2 · 0 · ≥ 0,2' },
    l0: { titre: 'Coût L0 : 1[g_p ≠ 0]', bornes: 'noir 0 · blanc 1' },
    l1: { titre: 'Coût L1 : g_p = ‖∇x(p)‖₂', bornes: '0 · ≥ 0,2' },
    l2: { titre: 'Coût L2² : g_p²', bornes: '0 · ≥ 0,04' },
  };
  $effect(() => {
    if (!carte) return;
    if (vue === 'dh') dessinerCarte(carte, g.dx, L, H, divergente, (v) => 0.5 + v / 0.4);
    else if (vue === 'dv') dessinerCarte(carte, g.dy, L, H, divergente, (v) => 0.5 + v / 0.4);
    else if (vue === 'l0') dessinerCarte(carte, gp, L, H, gris, (v) => (v > 1e-9 ? 1 : 0));
    else if (vue === 'l1') dessinerCarte(carte, gp, L, H, gris, (v) => v / 0.2);
    else dessinerCarte(carte, gp, L, H, gris, (v) => (v * v) / 0.04);
  });
</script>

<Panneau note={`${stats.nz.toFixed(2).replace('.', ',')} % des pixels ont un gradient non nul. ‖g‖₁ = ${stats.s1.toFixed(0)}, ‖g‖₂² = ${stats.s2.toFixed(1)}. Une image de synthèse a de vrais aplats ; ajoute un peu de bruit de capteur : presque tous les gradients deviennent non nuls, comme sur une photo (99,65 % dans l’exemple du cours).`}>
  {#snippet figure()}
    <div class="g">
      <Toile image={versImg(x)} affichage="lineaire" etiquette="Image x (8 bits)" />
      <figure>
        <canvas bind:this={carte} style="aspect-ratio:2/1"></canvas>
        <figcaption>{CONFIG[vue].titre} <span class="b">{CONFIG[vue].bornes}</span></figcaption>
      </figure>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Carte" bind:value={vue} options={[{ valeur: 'dh', texte: 'Dₕx' }, { valeur: 'dv', texte: 'Dᵥx' }, { valeur: 'l0', texte: 'L0' }, { valeur: 'l1', texte: 'L1' }, { valeur: 'l2', texte: 'L2²' }]} />
    <Curseur label="Bruit de capteur σ" bind:value={bruit} min={0} max={0.05} step={0.001} format={(v) => v.toFixed(3)} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  figure { margin: 0; min-width: 0; }
  canvas { width: 100%; height: auto; display: block; border-radius: 6px; image-rendering: pixelated; }
  figcaption { margin-top: 0.4rem; font-size: 0.82rem; color: var(--encre-3); text-align: center; }
  .b { display: block; font-size: 0.74rem; opacity: 0.8; }
</style>
