<script lang="ts">
  // Calibration de la courbe de réponse (CRF) par la méthode de Debevec & Malik, sur des expositions simulées.
  // Une scène HDR est photographiée par un « téléphone » à CRF cachée, à différents temps de pose ;
  // on tire des positions, on résout gsolve pour chaque canal, et on compare la CRF retrouvée à la vraie.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import Toile from '../ui/Toile.svelte';
  import { radianceInterieur } from '@/lib/sim/scenes';
  import { crfTelephone, gsolve, gVraie } from '@/lib/sim/hdr';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  let nPoses = $state(7);
  let nEch = $state(120);
  let lambda = $state(40);
  let bruit = $state(0.01);
  let tirage = $state(1);
  let radiance: Img | undefined;
  let poses: Img[] = $state([]);
  let points: [number, number][] = $state([]);
  let resultat: { g: Float64Array[]; vrai: Float64Array[] } | undefined = $state();
  let calcul = $state(false);
  const L = 160, H = 100;
  const temps = $derived(Array.from({ length: nPoses }, (_, j) => (1 / 64) * Math.pow(2, (j * 8) / Math.max(1, nPoses - 1))));
  const fmt = (t: number) => (t >= 1 ? `${t.toFixed(1)} s` : `1/${Math.round(1 / t)} s`);

  function photographier() {
    if (!radiance) return;
    const a = creerAlea(tirage * 5);
    poses = temps.map((t) => {
      const im = creerImg(L, H, 3);
      for (let i = 0; i < L * H; i++)
        for (let c = 0; c < 3; c++) im.d[3 * i + c] = crfTelephone(radiance!.d[3 * i + c] * t * Math.exp(bruit * gauss(a)), c) / 255;
      return im;
    });
    // positions d'échantillonnage (on évite les bords) ; la scène doit couvrir des luminosités variées
    points = Array.from({ length: Math.round(nEch) }, () => [4 + Math.floor(a() * (L - 8)), 4 + Math.floor(a() * (H - 8))]);
  }
  function resoudre() {
    if (!poses.length) return;
    calcul = true;
    requestAnimationFrame(() => {
      const B = temps.map(Math.log);
      const g = [0, 1, 2].map((c) => {
        const Z = points.map(([x, y]) => poses.map((p) => Math.round(p.d[(y * L + x) * 3 + c] * 255)));
        return gsolve({ Z, B }, lambda).g;
      });
      resultat = { g, vrai: [0, 1, 2].map((c) => gVraie(c)) };
      calcul = false;
    });
  }
  onMount(() => {
    radiance = radianceInterieur(L, H);
    photographier();
    resoudre();
  });
  let attente: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void nPoses, nEch, bruit, tirage;
    photographier();
    clearTimeout(attente);
    attente = setTimeout(resoudre, 120);
  });
  $effect(() => {
    void lambda;
    clearTimeout(attente);
    attente = setTimeout(resoudre, 120);
  });

  // Tracé : x = g(z)/ln 2 (diaphragmes relatifs, 0 ↔ z = 128), y = z
  const X = (stops: number) => 50 + ((stops + 9) / 15) * 300;
  const Y = (z: number) => 220 - (z / 255) * 200;
  const couleurs = ['#e0453a', '#2fa35a', '#3a63d8'];
  const courbe = (g: Float64Array) => {
    const pts: string[] = [];
    for (let z = 2; z <= 253; z++) {
      const s = g[z] / Math.LN2;
      if (s > -9 && s < 6) pts.push(`${pts.length ? 'L' : 'M'}${X(s).toFixed(1)},${Y(z).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const reference = $derived(poses[Math.floor(poses.length / 2)]);
</script>

<Panneau note="Scène HDR simulée, CRF « téléphone » cachée (gamma + épaule, légèrement différente par canal). gsolve résout ~400 inconnues par canal (g(0…255) et ln E de chaque position) par moindres carrés.">
  {#snippet figure()}
    <div class="haut">
      <div class="poses">
        {#each poses as p, j}
          <figure><Toile image={p} affichage="lineaire" seul lisse /><figcaption>{fmt(temps[j])}</figcaption></figure>
        {/each}
      </div>
    </div>
    <div class="bas">
      <div class="ref">
        <div class="pos">
          <Toile image={reference} affichage="lineaire" lisse />
          <svg viewBox={`0 0 ${L} ${H}`} aria-hidden="true">
            {#each points as [x, y]}<circle cx={x + 0.5} cy={y + 0.5} r="1.3" class="ech" />{/each}
          </svg>
        </div>
        <p class="leg">{points.length} positions échantillonnées (pose médiane)</p>
      </div>
      <svg class="crf" viewBox="0 0 360 250" role="img" aria-label="Courbes de réponse retrouvées et vraies">
        {#each [-8, -6, -4, -2, 0, 2, 4, 6] as s}<line x1={X(s)} x2={X(s)} y1="20" y2="220" class="grille" /><text x={X(s)} y="236" class="g m">{s}</text>{/each}
        {#each [0, 64, 128, 192, 255] as z}<line x1="50" x2="350" y1={Y(z)} y2={Y(z)} class="grille" /><text x="44" y={Y(z) + 4} class="g d">{z}</text>{/each}
        <text x="350" y="249" class="g d">log₂ exposition relative (diaphragmes, 0 ↔ z = 128)</text>
        <text x="6" y="14" class="g">valeur du pixel z</text>
        {#if resultat}
          {#each [0, 1, 2] as c}
            <path d={courbe(resultat.vrai[c])} stroke={couleurs[c]} class="vrai" />
            <path d={courbe(resultat.g[c])} stroke={couleurs[c]} class="estime" />
          {/each}
        {/if}
        {#if calcul}<text x="200" y="130" class="g m">calcul…</text>{/if}
      </svg>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre de temps de pose" bind:value={nPoses} min={2} max={12} step={1} />
    <Curseur label="Positions échantillonnées" bind:value={nEch} min={10} max={300} step={5} />
    <Curseur label="Lissage λ" bind:value={lambda} min={0} max={300} step={1} />
    <Curseur label="Bruit / instabilité de la scène" bind:value={bruit} min={0} max={0.1} step={0.005} format={(v) => (v * 100).toFixed(1) + ' %'} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => tirage++}>Nouveau tirage</Bouton>
  {/snippet}
</Panneau>

<style>
  .poses { display: grid; grid-template-columns: repeat(auto-fit, minmax(4.4rem, 1fr)); gap: 0.4rem; padding: 1rem 1.1rem 0.2rem; }
  .poses figure { margin: 0; }
  .poses figcaption { font-size: 0.68rem; color: var(--encre-3); text-align: center; font-variant-numeric: tabular-nums; }
  .poses :global(canvas) { width: 100%; height: auto; display: block; border-radius: 4px; }
  .bas { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 1rem; padding: 0.6rem 1.1rem 0.3rem; align-items: center; }
  @media (max-width: 620px) { .bas { grid-template-columns: 1fr; } }
  .pos { position: relative; }
  .pos svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .ech { fill: none; stroke: #3cffc0; stroke-width: 0.6; }
  .leg { margin: 0.3rem 0 0; font-size: 0.78rem; color: var(--encre-3); text-align: center; }
  .crf { width: 100%; height: auto; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 10px; fill: var(--encre-3); }
  .g.m { text-anchor: middle; }
  .g.d { text-anchor: end; }
  .vrai { fill: none; stroke-width: 1.4; stroke-dasharray: 4 3; opacity: 0.8; }
  .estime { fill: none; stroke-width: 2.4; }
</style>
