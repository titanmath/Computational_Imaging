<script lang="ts">
  // Flat-field : I(x) = D(x) + S(x)·P(x). On estime S à partir de champs uniformes (moins le noir), puis on corrige.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { creerImg, versGris, type Img } from '@/lib/sim/image';
  import { creerAlea, gauss, poisson } from '@/lib/sim/rng';
  import { profilVignetage } from '@/lib/sim/isp';

  const L = 160, H = 120;
  let nFlats = $state(16);
  let vue = $state<'avant' | 'apres'>('avant');
  let S: Float32Array, D: Float32Array, P: Img;
  let carteS: Img | undefined = $state();
  let image: Img | undefined = $state();

  onMount(() => {
    const a = creerAlea(21);
    const v = profilVignetage(L, H, 0.55);
    S = new Float32Array(L * H);
    D = new Float32Array(L * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < L; x++) {
        const i = y * L + x;
        // vignetage × non-uniformité pixel (PRNU) × poussières sur le capteur
        let s = v[i] * (1 + 0.02 * gauss(a));
        for (const [cx, cy, r] of [[40, 30, 7], [118, 84, 10], [96, 22, 5]]) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < r) s *= 0.78 + 0.22 * (d / r) ** 2;
        }
        S[i] = s;
        D[i] = 64 + 0.8 * gauss(a);
      }
    P = versGris(scenePaysage(L, H));
    calculer();
  });
  function calculer() {
    if (!S) return;
    const a = creerAlea(nFlats + 3);
    const K = 3000; // électrons au niveau du flat
    // estimation de S : moyenne de (flat − D), normalisée par la valeur au centre
    const somme = new Float32Array(L * H);
    for (let k = 0; k < nFlats; k++)
      for (let i = 0; i < L * H; i++) somme[i] += (D[i] + 0.5 * poisson(a, S[i] * K) + 2 * gauss(a) - D[i]) / nFlats;
    const c = somme[(H >> 1) * L + (L >> 1)];
    const Sest = somme.map((v) => v / c);
    const cs = creerImg(L, H, 1);
    for (let i = 0; i < L * H; i++) cs.d[i] = Sest[i];
    carteS = cs;
    // capture d'une scène puis correction
    const im = creerImg(L, H, 1);
    for (let i = 0; i < L * H; i++) {
      const brut = D[i] + 0.5 * poisson(a, S[i] * P.d[i] * K) + 2 * gauss(a);
      const sansNoir = (brut - D[i]) / (0.5 * K);
      im.d[i] = vue === 'apres' ? sansNoir / Sest[i] : sansNoir;
    }
    image = im;
  }
  $effect(() => {
    void nFlats, vue;
    calculer();
  });
</script>

<Panneau note="Simulation : vignetage, non-uniformité de réponse pixel à pixel (2 %) et trois poussières sur le capteur. Avec peu de flats, le bruit de l’estimation se retrouve dans l’image corrigée.">
  {#snippet figure()}
    <div class="g">
      <Toile image={carteS} etiquette={`Réponse estimée S (${nFlats} flat${nFlats > 1 ? 's' : ''} − noir, normalisée)`} lisse />
      <Toile image={image} etiquette={vue === 'avant' ? 'Capture (noir soustrait)' : 'Après correction : (I − D) / S'} lisse />
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre de champs plats moyennés" bind:value={nFlats} min={1} max={64} step={1} />
    <Bascule label="Image" bind:value={vue} options={[{ valeur: 'avant', texte: 'Avant' }, { valeur: 'apres', texte: 'Corrigée' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 520px) { .g { grid-template-columns: 1fr; } }
</style>
