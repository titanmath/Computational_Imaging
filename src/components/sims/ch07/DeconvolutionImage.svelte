<script lang="ts">
  // Déconvolution 2D : filtre inverse, Wiener (α) et régularisation TV (λ, descente de gradient Adam animée).
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { noyauDisque, noyauGauss, noyauBouge } from '@/lib/sim/conv';
  import { convoluerFFT, deconvolutionTV, filtreInverse, noyauVersImage, tf2, wiener, type Spectre2D } from '@/lib/sim/inverse';
  import { creerImg, psnr, versGris, type Img } from '@/lib/sim/image';
  import { encoderSrgb } from '@/lib/sim/couleur';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  interface Props {
    methodeInitiale?: 'inverse' | 'wiener' | 'tv';
  }
  let { methodeInitiale = 'wiener' }: Props = $props();
  const L = 256, H = 128;
  let flou = $state<'gauss' | 'disque' | 'bouge'>('disque');
  let bruit = $state(0.01);
  let methode = $state<'inverse' | 'wiener' | 'tv'>(methodeInitiale);
  let alpha = $state(0.01);
  let lambda = $state(0.006);
  let ref: Float64Array;
  let K: Spectre2D;
  let J: Float64Array;
  let vueMesure: Img | undefined = $state();
  let vueRec: Img | undefined = $state();
  let scores = $state({ mesure: 0, rec: 0, iter: 0 });
  let raf = 0;

  const versImg = (d: ArrayLike<number>) => {
    const im = creerImg(L, H, 1);
    for (let i = 0; i < im.d.length; i++) im.d[i] = Math.min(1, Math.max(0, d[i]));
    return im;
  };
  const p = (d: ArrayLike<number>) => psnr(versImg(d), versImg(ref));

  function preparer() {
    if (!ref) return;
    const n = flou === 'gauss' ? noyauGauss(2) : flou === 'disque' ? noyauDisque(3.2) : noyauBouge(11, 0.35);
    K = tf2(noyauVersImage(n.k, n.r, L, H), L, H);
    const a = creerAlea(4);
    J = convoluerFFT(ref, K).map((v) => v + bruit * gauss(a));
    vueMesure = versImg(J);
    scores.mesure = p(J);
    reconstruire();
  }
  function reconstruire() {
    cancelAnimationFrame(raf);
    if (!J) return;
    if (methode === 'inverse') {
      const r = filtreInverse(J, K, 1e-9);
      vueRec = versImg(r);
      scores = { ...scores, rec: p(r), iter: 0 };
    } else if (methode === 'wiener') {
      const r = wiener(J, K, alpha);
      vueRec = versImg(r);
      scores = { ...scores, rec: p(r), iter: 0 };
    } else {
      const tv = deconvolutionTV(J, K, lambda, { pasAppr: 0.012 });
      const boucle = () => {
        for (let k = 0; k < 3; k++) tv.pas();
        const it = scores.iter + 3;
        vueRec = versImg(tv.x);
        scores = { ...scores, rec: p(tv.x), iter: it };
        if (it < 180) raf = requestAnimationFrame(boucle);
      };
      scores = { ...scores, iter: 0 };
      raf = requestAnimationFrame(boucle);
    }
  }
  onMount(() => {
    const s = versGris(scenePaysage(256, 192));
    ref = new Float64Array(L * H);
    // on travaille en sRGB encodé [0,1] (comme une photo), recadré sur 256 × 128
    for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) ref[y * L + x] = encoderSrgb(s.d[(y + 40) * 256 + x]);
    preparer();
    return () => cancelAnimationFrame(raf);
  });
  let attente: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void flou, bruit;
    clearTimeout(attente);
    attente = setTimeout(preparer, 60);
  });
  $effect(() => {
    void methode, alpha, lambda;
    clearTimeout(attente);
    attente = setTimeout(reconstruire, 60);
  });
</script>

<Panneau note="Convolution circulaire (FFT), image en niveaux de gris 256 × 128. Le PSNR compare chaque image à l’image nette de référence.">
  {#snippet figure()}
    <div class="g">
      <Toile image={vueMesure} affichage="lineaire" etiquette={`Mesure floue et bruitée · PSNR ${scores.mesure.toFixed(1)} dB`} lisse />
      <Toile image={vueRec} affichage="lineaire" etiquette={`${methode === 'inverse' ? 'Filtre inverse' : methode === 'wiener' ? 'Wiener' : `TV (Adam, itération ${scores.iter})`} · PSNR ${scores.rec.toFixed(1)} dB`} lisse />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Flou" bind:value={flou} options={[{ valeur: 'gauss', texte: 'Gaussien' }, { valeur: 'disque', texte: 'Défocus' }, { valeur: 'bouge', texte: 'Bougé' }]} />
    <Curseur label="Bruit σ" bind:value={bruit} min={0} max={0.05} step={0.001} format={(v) => v.toFixed(3)} />
    <Bascule label="Reconstruction" bind:value={methode} options={[{ valeur: 'inverse', texte: 'Inverse' }, { valeur: 'wiener', texte: 'Wiener' }, { valeur: 'tv', texte: 'TV' }]} />
    {#if methode === 'wiener'}<Curseur label="Amortissement α" bind:value={alpha} min={1e-5} max={0.5} log format={(v) => v.toExponential(1)} />{/if}
    {#if methode === 'tv'}<Curseur label="Poids du prior λ" bind:value={lambda} min={0.0005} max={0.05} log format={(v) => v.toFixed(4)} />{/if}
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
</style>
