<script lang="ts">
  // PSF « rayons » (disque de défocus) vs PSF « ondes » (Fraunhofer + défocus) pour une lentille idéale.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { psfOnde, rayonAiry, rayonDefocus } from '@/lib/optique/diffraction';
  import { dessinerCarte } from '@/lib/sim/colormaps';

  let N = $state(5.6);
  let dz = $state(40); // µm
  const lambda = 550e-9;
  const FEN = 30e-6; // demi-fenêtre affichée (m)
  const T = 121;

  let cOnde: HTMLCanvasElement;
  let cRayon: HTMLCanvasElement;
  let profilOnde: number[] = $state([]);
  let profilRayon: number[] = $state([]);

  const rA = $derived(rayonAiry(N, lambda));
  const rD = $derived(rayonDefocus(N, dz * 1e-6));
  const lumiere = $derived((2 / N) ** 2);

  let attente = 0;
  $effect(() => {
    const n_ = N, dz_ = dz;
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(() => calculer(n_, dz_));
  });

  function calculer(Nf: number, dzum: number) {
    if (!cOnde || !cRayon) return;
    const R = 1.4 * Math.max(rayonDefocus(Nf, dzum * 1e-6), 4 * rayonAiry(Nf, lambda), FEN);
    const ech = Math.min(200, Math.max(32, Math.round((2 * R) / (lambda * Nf))));
    const p = psfOnde(Nf, dzum * 1e-6, lambda, 512, ech);
    const onde = new Float64Array(T * T);
    const rayon = new Float64Array(T * T);
    const rd = rayonDefocus(Nf, dzum * 1e-6);
    const c = p.n / 2;
    let maxO = 0;
    for (let j = 0; j < T; j++)
      for (let i = 0; i < T; i++) {
        const x = ((i - (T - 1) / 2) / ((T - 1) / 2)) * FEN;
        const y = ((j - (T - 1) / 2) / ((T - 1) / 2)) * FEN;
        // interpolation bilinéaire dans la PSF calculée
        const fx = c + x / p.dx, fy = c + y / p.dx;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        let v = 0;
        if (x0 >= 0 && y0 >= 0 && x0 < p.n - 1 && y0 < p.n - 1) {
          const ax = fx - x0, ay = fy - y0;
          v =
            p.h[y0 * p.n + x0] * (1 - ax) * (1 - ay) +
            p.h[y0 * p.n + x0 + 1] * ax * (1 - ay) +
            p.h[(y0 + 1) * p.n + x0] * (1 - ax) * ay +
            p.h[(y0 + 1) * p.n + x0 + 1] * ax * ay;
        }
        onde[j * T + i] = v;
        maxO = Math.max(maxO, v);
        const pix = (2 * FEN) / (T - 1);
        rayon[j * T + i] = Math.hypot(x, y) <= Math.max(rd, pix * 0.6) ? 1 : 0;
      }
    for (let i = 0; i < onde.length; i++) onde[i] /= maxO || 1;
    const log = (v: number) => Math.max(0, 1 + Math.log10(Math.max(v, 1e-3)) / 3); // 0.001 → 0, 1 → 1
    dessinerCarte(cOnde, onde, T, T, undefined, log);
    dessinerCarte(cRayon, rayon, T, T, undefined, log);
    const mid = (T - 1) / 2;
    profilOnde = Array.from({ length: T }, (_, i) => onde[mid * T + i]);
    profilRayon = Array.from({ length: T }, (_, i) => rayon[mid * T + i]);
  }
  const chemin = (p: number[]) => p.map((v, i) => `${i === 0 ? 'M' : 'L'}${20 + (i / (T - 1)) * 300},${130 - v * 110}`).join(' ');
  const regime = $derived(rD > 2.5 * rA ? 'le défocus domine' : rA > 2.5 * rD ? 'la diffraction domine' : 'défocus et diffraction se valent');
</script>

<Panneau sombre note={`λ = 550 nm, lentille idéale (sans aberration), modèle scalaire paraxial. Fenêtres ±30 µm, échelle logarithmique (0,001 → 1). Lumière reçue relative à f/2 : ${lumiere < 0.1 ? lumiere.toFixed(3) : lumiere.toFixed(2)}.`}>
  {#snippet figure()}
    <div class="grille">
      <figure><canvas bind:this={cRayon}></canvas><figcaption>Modèle rayons · disque r = {(rD * 1e6).toFixed(1)} µm</figcaption></figure>
      <figure><canvas bind:this={cOnde}></canvas><figcaption>Modèle ondes · Airy r₀ = {(rA * 1e6).toFixed(2)} µm</figcaption></figure>
      <figure class="profil">
        <svg viewBox="0 0 340 160" role="img" aria-label="Profils 1D des deux PSF">
          <line x1="20" x2="320" y1="130" y2="130" class="axe" />
          <line x1="170" x2="170" y1="16" y2="130" class="axe pt" />
          <path d={chemin(profilRayon)} class="c-rayon" />
          <path d={chemin(profilOnde)} class="c-onde" />
          <text x="20" y="148" class="g">−30 µm</text>
          <text x="320" y="148" class="g d">+30 µm</text>
          <text x="28" y="22" class="g lr">— rayons</text>
          <text x="28" y="38" class="g lo">— ondes</text>
        </svg>
        <figcaption>Coupe centrale (y = 0), linéaire · {regime}</figcaption>
      </figure>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Nombre d’ouverture N" bind:value={N} min={1.4} max={22} log step={0.1} format={(v) => 'f/' + v.toFixed(1)} />
    <Curseur label="Défocus du capteur Δz" bind:value={dz} min={-120} max={120} step={2} unite="µm" />
  {/snippet}
</Panneau>

<style>
  .grille {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr);
    gap: 1rem;
    padding: 1.1rem 1.1rem 0.6rem;
    align-items: start;
  }
  @media (max-width: 680px) {
    .grille {
      grid-template-columns: 1fr 1fr;
    }
    .profil {
      grid-column: 1 / -1;
    }
  }
  figure {
    margin: 0;
  }
  canvas {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    image-rendering: auto;
    display: block;
  }
  figcaption {
    margin-top: 0.4rem;
    font-size: 0.8rem;
    color: var(--table-encre-2);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  svg {
    width: 100%;
    height: auto;
    font-family: var(--f-texte);
  }
  .axe {
    stroke: var(--table-filet);
  }
  .axe.pt {
    stroke-dasharray: 3 3;
  }
  .c-rayon {
    fill: none;
    stroke: #8fa3c4;
    stroke-width: 1.6;
  }
  .c-onde {
    fill: none;
    stroke: #fca86a;
    stroke-width: 2;
  }
  .g {
    font-size: 11px;
    fill: var(--table-encre-2);
  }
  .g.d {
    text-anchor: end;
  }
  .lr {
    fill: #8fa3c4;
  }
  .lo {
    fill: #fca86a;
  }
</style>
