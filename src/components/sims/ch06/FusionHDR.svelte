<script lang="ts">
  // Fusion HDR linéaire : q_j = clip(t_j E + n_j) ;  Ê = Σ_j w_j q_j / t_j  /  Σ_j w_j.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { radianceInterieur } from '@/lib/sim/scenes';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  type Vue = 'poses' | 'normalisees' | 'poids' | 'fusion';
  let vue = $state<Vue>('poses');
  let poids = $state<'chapeau' | 'uniforme'>('chapeau');
  const T = [1, 8, 64];
  const L = 192, H = 120;
  let E: Img | undefined;
  let images: { titre: string; im: Img; aff: 'srgb' | 'lineaire'; gain?: number }[] = $state([]);

  const w = (q: number) => (poids === 'uniforme' ? 1 : Math.max(0, 1 - Math.abs(2 * q - 1)) ** 1 * (q < 0.98 ? 1 : 0));
  function calculer() {
    if (!E) return;
    const a = creerAlea(3);
    const k = 0.012; // échelle : pose 1× pour que la fenêtre ensoleillée soit juste lisible
    const q = T.map((t) => {
      const im = creerImg(L, H, 3);
      for (let i = 0; i < im.d.length; i++) im.d[i] = Math.min(1, Math.max(0, E!.d[i] * k * t + 0.004 * gauss(a)));
      return im;
    });
    const norm = q.map((im, j) => ({ ...im, d: im.d.map((v) => v / T[j]) }));
    const ws = q.map((im) => {
      const o = creerImg(L, H, 1);
      for (let i = 0; i < L * H; i++) o.d[i] = w((im.d[3 * i] + im.d[3 * i + 1] + im.d[3 * i + 2]) / 3);
      return o;
    });
    const f = creerImg(L, H, 3);
    for (let i = 0; i < L * H; i++)
      for (let c = 0; c < 3; c++) {
        let num = 0, den = 0;
        for (let j = 0; j < 3; j++) {
          const wj = ws[j].d[i] + 1e-6;
          num += wj * norm[j].d[3 * i + c];
          den += wj;
        }
        // tone mapping de Reinhard pour l'affichage de la radiance fusionnée
        const v = (num / den) * 6;
        f.d[3 * i + c] = v / (1 + v);
      }
    if (vue === 'poses') images = q.map((im, j) => ({ titre: `Pose ${T[j]}×`, im, aff: 'srgb' }));
    else if (vue === 'normalisees') images = norm.map((im, j) => ({ titre: `q / t, pose ${T[j]}×`, im, aff: 'srgb', gain: 1 }));
    else if (vue === 'poids') images = ws.map((im, j) => ({ titre: `Poids w, pose ${T[j]}×`, im, aff: 'lineaire' }));
    else images = [{ titre: 'Radiance fusionnée (affichée avec un tone mapping de Reinhard)', im: f, aff: 'srgb' }];
  }
  onMount(() => {
    E = radianceInterieur(L, H);
    calculer();
  });
  $effect(() => {
    void vue, poids;
    calculer();
  });
</script>

<Panneau note="Simulation à partir d’une carte de radiance synthétique (≈ 16 IL de dynamique). Les poids « chapeau » font confiance aux valeurs moyennes et ignorent les pixels sombres (bruités) ou saturés.">
  {#snippet figure()}
    <div class="g" class:une={images.length === 1}>
      {#each images as x}<Toile image={x.im} etiquette={x.titre} affichage={x.aff} gain={x.gain ?? 1} lisse />{/each}
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Afficher" bind:value={vue} options={[{ valeur: 'poses', texte: '1. Poses' }, { valeur: 'normalisees', texte: '2. q / t' }, { valeur: 'poids', texte: '3. Poids' }, { valeur: 'fusion', texte: '4. Fusion' }]} />
    <Bascule label="Pondération" bind:value={poids} options={[{ valeur: 'chapeau', texte: 'Chapeau' }, { valeur: 'uniforme', texte: 'Uniforme' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.4rem; }
  .g.une { grid-template-columns: minmax(0, 32rem); justify-content: center; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
</style>
