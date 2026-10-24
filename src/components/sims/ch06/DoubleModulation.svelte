<script lang="ts">
  // Écran HDR à double modulation (Seetzen et al. 2004) : L_out(x) = B(x)·T(x).
  // B : rétroéclairage LED basse résolution ; T ∈ [0, 1] : transmission de l'écran LCD (pleine résolution).
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { radianceInterieur } from '@/lib/sim/scenes';
  import { flouGauss } from '@/lib/sim/conv';
  import { creerImg, versGris, type Img } from '@/lib/sim/image';

  let leds = $state(12); // LED sur la largeur
  let cible: Img | undefined;
  let B: Img | undefined = $state();
  let T: Img | undefined = $state();
  let sortie: Img | undefined = $state();
  const L = 240, H = 150, LMAX = 40;
  function calculer() {
    if (!cible) return;
    const n = Math.round(leds), m = Math.max(1, Math.round((n * H) / L));
    const b = creerImg(L, H, 1);
    // chaque LED prend le max de sa zone (pour pouvoir atteindre les pics), puis diffusion optique (flou)
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        let mx = 0;
        for (let y = Math.floor((j * H) / m); y < Math.floor(((j + 1) * H) / m); y++)
          for (let x = Math.floor((i * L) / n); x < Math.floor(((i + 1) * L) / n); x++) mx = Math.max(mx, cible.d[y * L + x]);
        for (let y = Math.floor((j * H) / m); y < Math.floor(((j + 1) * H) / m); y++)
          for (let x = Math.floor((i * L) / n); x < Math.floor(((i + 1) * L) / n); x++) b.d[y * L + x] = Math.min(LMAX, mx);
      }
    const bd = flouGauss(b, (L / n) * 0.45);
    const t = creerImg(L, H, 1), s = creerImg(L, H, 1);
    for (let i = 0; i < L * H; i++) {
      t.d[i] = Math.min(1, Math.max(0.002, cible.d[i] / Math.max(1e-6, bd.d[i]))); // le LCD ne peut pas dépasser 1
      s.d[i] = bd.d[i] * t.d[i];
    }
    const aff = (im: Img) => ({ ...im, d: im.d.map((v) => v / (1 + v)) });
    B = aff(bd);
    T = t;
    sortie = aff(s);
  }
  onMount(() => {
    cible = versGris(radianceInterieur(L, H));
    calculer();
  });
  $effect(() => {
    void leds;
    calculer();
  });
</script>

<Panneau note="Affichage avec un tone mapping L/(1+L) pour montrer les trois grandeurs. Le LCD a un contraste limité (≈ 500:1) ; le rétroéclairage modulé multiplie la dynamique. Avec peu de LED, des halos apparaissent autour des zones très lumineuses.">
  {#snippet figure()}
    <div class="g">
      <Toile image={B} etiquette="Rétroéclairage B (LED, flou)" lisse />
      <Toile image={T} etiquette="Transmission LCD T" affichage="lineaire" lisse />
      <Toile image={sortie} etiquette="Lumière émise B · T" lisse />
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre de LED sur la largeur" bind:value={leds} min={2} max={48} step={1} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
</style>
