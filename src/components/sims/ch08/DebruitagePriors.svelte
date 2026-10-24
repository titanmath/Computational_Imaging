<script lang="ts">
  // Débruitage 2D : min ½‖x − b‖² + λΨ(x) avec Ψ = rien, ‖g‖₂² (forme fermée), TV isotrope ou anisotrope
  // (primal-dual animé), ‖g‖₀ (lissage L0 de Xu et al., β croissant animé). Valeurs de λ des slides par défaut.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import Toile from '../ui/Toile.svelte';
  import { l0Lissage, l2Ferme2D, tvDebruitage } from '@/lib/sim/priors';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { bruiter, H, imageGrise, L, psnr, versImg } from '@/lib/sim/imageTest';

  type Prior = 'aucun' | 'l2' | 'tv' | 'tva' | 'l0';
  interface Props {
    priorInitial?: Prior;
    lambdaInitial?: number;
    /** Boutons « faible / moyen / fort » (λ = 0,015 / 0,07 / 0,22, TV isotrope) */
    forces?: boolean;
    /** Priors proposés */
    choix?: Prior[];
  }
  let { priorInitial = 'tv', lambdaInitial, forces = false, choix = ['aucun', 'l2', 'tv', 'l0'] }: Props = $props();
  const DEFAUT: Record<Prior, number> = { aucun: 0, l2: 0.65, tv: 0.07, tva: 0.07, l0: 0.02 };
  const NOMS: Record<Prior, string> = { aucun: 'Aucun (λ = 0)', l2: 'L2² des gradients', tv: 'TV isotrope', tva: 'TV anisotrope', l0: 'L0 des gradients' };
  let prior = $state<Prior>(priorInitial);
  let lambda = $state(lambdaInitial ?? DEFAUT[priorInitial]);
  let bruit = $state(0.1);
  let droite = $state<'propre' | 'retire'>('retire');
  const x = imageGrise();
  let b = $state(bruiter(x, 0.1, 21));
  let rec: Float64Array = $state(Float64Array.from(b));
  let iteration = $state(0);
  let raf = 0;
  const vueB = $derived(versImg(b));
  const vueRec = $derived(versImg(rec));
  const vueDroite = $derived.by((): Img => {
    if (droite === 'propre') return versImg(x);
    const im = creerImg(L, H, 1);
    for (let i = 0; i < L * H; i++) im.d[i] = 0.5 + 2 * (b[i] - rec[i]);
    return im;
  });

  function lancer() {
    cancelAnimationFrame(raf);
    iteration = 0;
    if (prior === 'aucun' || lambda <= 0) {
      rec = Float64Array.from(b);
      return;
    }
    if (prior === 'l2') {
      rec = l2Ferme2D(b, L, H, lambda);
      return;
    }
    if (prior === 'l0') {
      const z = l0Lissage(b, L, H, lambda);
      const boucle = () => {
        z.pas();
        iteration++;
        rec = Float64Array.from(z.x);
        if (!z.fini) raf = requestAnimationFrame(boucle);
      };
      raf = requestAnimationFrame(boucle);
      return;
    }
    const tv = tvDebruitage(b, L, H, lambda, prior === 'tv');
    const boucle = () => {
      for (let k = 0; k < 4; k++) tv.pas();
      iteration += 4;
      rec = Float64Array.from(tv.x);
      if (iteration < 240) raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
  }
  function choisir(p: Prior) {
    lambda = DEFAUT[p];
  }
  onMount(() => () => cancelAnimationFrame(raf));
  let attente: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    b = bruiter(x, bruit, 21);
  });
  $effect(() => {
    void b, prior, lambda;
    clearTimeout(attente);
    attente = setTimeout(lancer, 50);
  });
  const etape = $derived(prior === 'tv' || prior === 'tva' ? ` · itération ${iteration}` : prior === 'l0' ? ` · étape β n° ${iteration}` : '');
</script>

{#snippet boutonsForces()}
  <Bouton onclick={() => { prior = 'tv'; lambda = 0.015; }}>Faible 0,015</Bouton>
  <Bouton onclick={() => { prior = 'tv'; lambda = 0.07; }}>Moyen 0,07</Bouton>
  <Bouton onclick={() => { prior = 'tv'; lambda = 0.22; }}>Fort 0,22</Bouton>
{/snippet}

<Panneau lecture={forces ? boutonsForces : undefined} note={`Image 256 × 128 en niveaux de gris, bruit gaussien σ = ${bruit.toFixed(2)}. Panneau de droite : ce que l’a priori a retiré (b − x̂, contraste ×2). Il doit ressembler à du bruit pur ; si des contours ou des textures y apparaissent, λ est trop fort.`}>
  {#snippet figure()}
    <div class="g">
      <Toile image={vueB} affichage="lineaire" etiquette={`Mesure b · PSNR ${psnr(b, x).toFixed(1)} dB`} lisse />
      <Toile image={vueRec} affichage="lineaire" etiquette={`${NOMS[prior]}, λ = ${lambda.toFixed(3)}${etape} · PSNR ${psnr(rec, x).toFixed(1)} dB`} lisse />
      <Toile image={vueDroite} affichage="lineaire" etiquette={droite === 'propre' ? 'Référence propre x (pour comparer)' : 'Retiré : b − x̂'} lisse />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="A priori Ψ" bind:value={prior} onchange={choisir} options={choix.map((c) => ({ valeur: c, texte: NOMS[c] }))} />
    {#if prior !== 'aucun'}
      <Curseur label="Force λ" bind:value={lambda} min={0.001} max={prior === 'l2' ? 10 : 1} log format={(v) => v.toFixed(3)} />
    {/if}
    <Curseur label="Bruit σ" bind:value={bruit} min={0.01} max={0.25} step={0.01} format={(v) => v.toFixed(2)} />
    <Bascule label="Panneau de droite" bind:value={droite} options={[{ valeur: 'retire', texte: 'Retiré' }, { valeur: 'propre', texte: 'Référence' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 720px) { .g { grid-template-columns: 1fr; } }
</style>
