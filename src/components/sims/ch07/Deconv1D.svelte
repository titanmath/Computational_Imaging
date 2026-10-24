<script lang="ts">
  // Déconvolution d'un signal 1D (128 échantillons, flou gaussien σ = 1,1, comme dans les slides) :
  // le filtre inverse divise par |H|, minuscule aux hautes fréquences, et amplifie le bruit ; Wiener amortit.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { convoluer1D, deconvoluer1D, noyauGauss1D, spectre1D } from '@/lib/sim/inverse';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  const n = 128;
  let bruit = $state(0.005);
  let methode = $state<'inverse' | 'wiener'>('inverse');
  let alpha = $state(0.002);
  const ref = Float64Array.from({ length: n }, (_, i) => (i < 20 ? 0.2 : i < 45 ? 0.75 : i < 70 ? 0.3 + (i - 45) * 0.02 : i < 95 ? 0.45 + 0.15 * Math.sin(i / 3) : 0.2));
  const H = spectre1D(noyauGauss1D(1.1), n);
  const mesure = $derived.by(() => {
    const a = creerAlea(2);
    return convoluer1D(ref, H).map((v) => v + bruit * gauss(a));
  });
  const recon = $derived(deconvoluer1D(mesure, H, methode === 'inverse' ? 0 : alpha));
  const rmse = $derived(Math.sqrt(recon.reduce((s, v, i) => s + (v - ref[i]) ** 2, 0) / n));
  const X = (i: number) => 30 + (i / (n - 1)) * 580;
  const Y = (v: number) => 120 - Math.max(-1.2, Math.min(1.8, v)) * 70;
  const ch = (s: ArrayLike<number>) => Array.from(s, (v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const mod = Array.from({ length: n / 2 }, (_, k) => Math.hypot(H.re[k], H.im[k]));
</script>

<Panneau note={`Erreur RMS de la reconstruction : ${rmse.toFixed(3)}. Le petit graphe montre |H(f)| : il tombe presque à zéro aux hautes fréquences, et diviser par lui y multiplie le bruit.`}>
  {#snippet figure()}
    <div class="g">
      <svg viewBox="0 0 640 250" role="img" aria-label="Signal de référence, mesure floue et bruitée, reconstruction">
        <line x1="30" x2="610" y1={Y(0)} y2={Y(0)} class="axe" />
        <path d={ch(ref)} class="ref" />
        <path d={ch(mesure)} class="mes" />
        <path d={ch(recon)} class="rec" />
        <text x="36" y="18" class="g lr">— référence</text>
        <text x="136" y="18" class="g lm">— flou + bruit</text>
        <text x="246" y="18" class="g lc">— {methode === 'inverse' ? 'inverse direct' : 'Wiener'}</text>
      </svg>
      <svg viewBox="0 0 200 120" class="petit" role="img" aria-label="Module de la fonction de transfert">
        <path d={mod.map((m, k) => `${k ? 'L' : 'M'}${10 + k * 2.9},${100 - m * 85}`).join(' ')} class="h" />
        <line x1="10" x2="195" y1="100" y2="100" class="axe" />
        <text x="12" y="12" class="g">|H(f)|</text>
        <text x="195" y="114" class="g d">fréquence →</text>
      </svg>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Bruit ajouté σ" bind:value={bruit} min={0} max={0.05} step={0.001} format={(v) => v.toFixed(3)} />
    <Bascule label="Méthode" bind:value={methode} options={[{ valeur: 'inverse', texte: 'Inverse direct' }, { valeur: 'wiener', texte: 'Wiener' }]} />
    {#if methode === 'wiener'}<Curseur label="Amortissement α" bind:value={alpha} min={1e-6} max={0.2} log format={(v) => v.toExponential(1)} />{/if}
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1fr) 11rem; gap: 0.8rem; align-items: center; padding: 0.8rem 1rem 0.2rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .axe { stroke: var(--filet); }
  .ref { fill: none; stroke: var(--encre); stroke-width: 2; }
  .mes { fill: none; stroke: var(--encre-3); stroke-width: 1.2; }
  .rec { fill: none; stroke: var(--accent); stroke-width: 1.8; }
  .h { fill: none; stroke: var(--accent); stroke-width: 2; }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .lr { fill: var(--encre); }
  .lc { fill: var(--accent); }
</style>
