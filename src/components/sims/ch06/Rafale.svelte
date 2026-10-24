<script lang="ts">
  // Photographie en rafale (Hasinoff et al. 2016) : N poses courtes identiques, alignées puis fusionnées.
  // Bruit ÷ √N si tout est aligné et statique ; un objet qui bouge crée des fantômes, que la fusion robuste rejette.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, poisson } from '@/lib/sim/rng';

  let N = $state(8);
  let methode = $state<'une' | 'naive' | 'alignee' | 'robuste'>('robuste');
  const L = 200, H = 150;
  let scene: Img | undefined;
  let rendu: Img | undefined = $state();
  let mesure = $state(0);

  function image(k: number, dx: number, dy: number, a: () => number): Img {
    // photons faibles (pose courte) ; la caméra tremble de (dx, dy) ; une balle traverse le champ
    const im = creerImg(L, H, 3);
    const bx = 30 + k * 9, by = 118, r = 10;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < L; x++) {
        const sx = Math.min(L - 1, Math.max(0, x + dx)), sy = Math.min(H - 1, Math.max(0, y + dy));
        const dans = Math.hypot(sx - bx, sy - by) < r;
        for (let c = 0; c < 3; c++) {
          const v = dans ? [0.9, 0.3, 0.05][c] : scene!.d[(sy * L + sx) * 3 + c];
          im.d[(y * L + x) * 3 + c] = poisson(a, v * 12) / 12;
        }
      }
    return im;
  }
  function calculer() {
    if (!scene) return;
    const a = creerAlea(5);
    const n = methode === 'une' ? 1 : Math.round(N);
    const decal = Array.from({ length: n }, (_, k) => (k === 0 ? [0, 0] : [Math.round((a() - 0.5) * 6), Math.round((a() - 0.5) * 6)]));
    const im = decal.map(([dx, dy], k) => image(k, dx, dy, a));
    const ref = im[0];
    const out = creerImg(L, H, 3);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < L; x++)
        for (let c = 0; c < 3; c++) {
          let num = 0, den = 0;
          for (let k = 0; k < n; k++) {
            // alignement : on recale chaque image sur la référence (décalage supposé estimé)
            const [dx, dy] = methode === 'naive' ? [0, 0] : decal[k];
            const xx = Math.min(L - 1, Math.max(0, x - dx)), yy = Math.min(H - 1, Math.max(0, y - dy));
            const v = im[k].d[(yy * L + xx) * 3 + c];
            let w = 1;
            if (methode === 'robuste' && k > 0) {
              const d = v - ref.d[(y * L + x) * 3 + c];
              w = Math.exp(-(d * d) / (2 * 0.09 * 0.09));
            }
            num += w * v;
            den += w;
          }
          out.d[(y * L + x) * 3 + c] = num / den;
        }
    rendu = out;
    // bruit mesuré dans une zone uniforme du ciel (comparé à la scène vraie)
    let s = 0, m = 0;
    for (let y = 8; y < 30; y++)
      for (let x = 10; x < 60; x++) {
        const i = (y * L + x) * 3 + 1;
        s += (out.d[i] - scene.d[i]) ** 2;
        m++;
      }
    mesure = Math.sqrt(s / m);
  }
  onMount(() => {
    scene = scenePaysage(L, H);
    calculer();
  });
  let attente = 0;
  $effect(() => {
    void N, methode;
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(calculer);
  });
  const sigma1 = 0.17; // ≈ √(0,35 × 12)/12 dans le ciel
</script>

<Panneau note="Les tremblements de la caméra sont supposés estimés (alignement par tuiles, du grossier au fin, dans la vraie méthode). La balle se déplace entre les poses.">
  {#snippet figure()}
    <div class="g">
      <Toile image={rendu} lisse />
      <div class="ch">
        <p>Bruit mesuré dans le ciel</p>
        <p class="v">{mesure.toFixed(3)}</p>
        <p class="t">idéal σ₁/√N ≈ {(sigma1 / Math.sqrt(methode === 'une' ? 1 : N)).toFixed(3)}</p>
        <p class="t">1 → 2 → 4 → 8 poses : bruit × 1 ; 0,71 ; 0,50 ; 0,35</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre de poses N" bind:value={N} min={2} max={16} step={1} />
    <Bascule label="Fusion" bind:value={methode} options={[{ valeur: 'une', texte: 'Une seule pose' }, { valeur: 'naive', texte: 'Moyenne naïve' }, { valeur: 'alignee', texte: 'Moyenne alignée' }, { valeur: 'robuste', texte: 'Fusion robuste' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  .ch p { margin: 0 0 0.3rem; }
  .ch .v { font-family: var(--f-titre); font-size: 2rem; color: var(--accent); }
  .ch .t { font-size: 0.85rem; color: var(--encre-3); }
</style>
