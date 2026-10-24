<script lang="ts">
  // Calibration directe du noir : I_k(x) = D(x) + ε_k(x). Moyenner N images noires réduit ε en 1/√N.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  const L = 96, H = 72;
  let N = $state(1);
  let carteD: Float32Array;
  let une: Img | undefined = $state();
  let moyenne: Img | undefined = $state();
  let ecart = $state(0);
  const SIGMA = 1.53; // bruit temporel (DN), slides
  const fenetre = (v: number) => (v - 58) / 12; // affichage 58–70 DN

  onMount(() => {
    const a = creerAlea(9);
    carteD = new Float32Array(L * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < L; x++) {
        // motif fixe : dégradé d'ampli (coin chaud), colonnes, quelques pixels chauds
        let d = 63 + 2.5 * Math.exp(-((x - 80) ** 2 + (y - 8) ** 2) / 400) + (x % 8 === 3 ? 0.8 : 0) + 0.6 * gauss(a);
        if (a() < 0.004) d += 6 + 4 * a();
        carteD[y * L + x] = d;
      }
    calculer();
  });
  function calculer() {
    if (!carteD) return;
    const a = creerAlea(N * 13 + 1);
    const s = new Float32Array(L * H);
    let premiere: Float32Array | undefined;
    for (let k = 0; k < N; k++) {
      const f = new Float32Array(L * H);
      for (let i = 0; i < L * H; i++) f[i] = Math.round(carteD[i] + SIGMA * gauss(a));
      if (!premiere) premiere = f;
      for (let i = 0; i < L * H; i++) s[i] += f[i] / N;
    }
    const im1 = creerImg(L, H, 1), imM = creerImg(L, H, 1);
    for (let i = 0; i < L * H; i++) {
      im1.d[i] = fenetre(premiere![i]);
      imM.d[i] = fenetre(s[i]);
    }
    une = im1;
    moyenne = imM;
    // écart résiduel entre la moyenne et la vraie carte
    let e = 0;
    for (let i = 0; i < L * H; i++) e += (s[i] - carteD[i]) ** 2;
    ecart = Math.sqrt(e / (L * H));
  }
  $effect(() => {
    void N;
    calculer();
  });
</script>

<Panneau note={`Simulation : bruit temporel σ = ${SIGMA} DN par image. Affichage rehaussé de 58 à 70 DN (sur une échelle de 0 à 4 095, tout paraîtrait noir).`}>
  {#snippet figure()}
    <div class="g">
      <Toile image={une} etiquette="Une image noire (rehaussée)" affichage="lineaire" />
      <Toile image={moyenne} etiquette={`Carte de noir D : moyenne de ${N} image${N > 1 ? 's' : ''}`} affichage="lineaire" />
      <div class="chiffres">
        <p>Erreur résiduelle sur D</p>
        <p class="v">{ecart.toFixed(2)} DN</p>
        <p class="t">≈ σ/√N = {(SIGMA / Math.sqrt(N)).toFixed(2)} DN</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre d’images noires moyennées N" bind:value={N} min={1} max={64} step={1} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.7fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr 1fr; } .chiffres { grid-column: 1 / -1; } }
  .chiffres p { margin: 0; }
  .chiffres .v { font-family: var(--f-titre); font-size: 2rem; color: var(--accent); }
  .chiffres .t { font-size: 0.85rem; color: var(--encre-3); }
</style>
