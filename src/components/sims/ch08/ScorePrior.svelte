<script lang="ts">
  // Quatre images candidates, notées par l'objectif ½‖c − b‖² + λΨ(c). λ = 0 : la mesure b gagne ;
  // λ moyen : l'image propre gagne ; λ énorme : l'image uniforme gagne (Ψ = 0). L'a priori seul ne suffit pas.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { valeurPrior } from '@/lib/sim/priors';
  import { creerAlea } from '@/lib/sim/rng';
  import { bruiter, H, imageGrise, L, versImg } from '@/lib/sim/imageTest';

  let lambda = $state(0.001);
  let type = $state<'l1' | 'l2' | 'l0'>('l1');
  const x = imageGrise();
  const b = bruiter(x, 0.1, 11);
  const moyenne = b.reduce((s, v) => s + v, 0) / b.length;
  const a = creerAlea(5);
  const candidats = [
    { nom: 'Mesure b', d: b },
    { nom: 'Image propre x', d: x },
    { nom: 'Image uniforme', d: new Float64Array(L * H).fill(moyenne) },
    { nom: 'Bruit aléatoire', d: Float64Array.from({ length: L * H }, () => a()) },
  ].map((c) => {
    let donnees = 0;
    for (let i = 0; i < c.d.length; i++) donnees += 0.5 * (c.d[i] - b[i]) ** 2;
    return { ...c, img: versImg(c.d), donnees, psi: { l1: valeurPrior(c.d, L, H, 'l1'), l2: valeurPrior(c.d, L, H, 'l2'), l0: valeurPrior(c.d, L, H, 'l0', 1e-3) } };
  });
  const totaux = $derived(candidats.map((c) => ({ donnees: c.donnees, prior: lambda * c.psi[type] })));
  const gagnant = $derived(totaux.reduce((g, t, i) => (t.donnees + t.prior < totaux[g].donnees + totaux[g].prior ? i : g), 0));
  const echelle = $derived(Math.max(...totaux.map((t) => t.donnees + t.prior)));
  const fmt = (v: number) => (v >= 1000 ? (v / 1000).toFixed(1) + ' k' : v >= 10 ? v.toFixed(0) : v.toFixed(2));
  const NOMS = { l1: '‖g(x)‖₁ (TV)', l2: '‖g(x)‖₂²', l0: '‖g(x)‖₀' };
</script>

<Panneau note={`Ψ = ${NOMS[type]}, calculé sur 256 × 128 pixels ; b = x + bruit gaussien (σ = 0,1). Barres : attache aux données ½‖c − b‖² (gris) + λΨ(c) (couleur). L’étoile marque le minimum de l’objectif.`}>
  {#snippet figure()}
    <div class="grille">
      {#each candidats as c, i}
        <div class="cand" class:gagne={i === gagnant}>
          <Toile image={c.img} affichage="lineaire" seul lisse />
          <p class="nom">{i === gagnant ? '★ ' : ''}{c.nom}</p>
          <div class="barre" aria-hidden="true">
            <span class="d" style={`width:${(totaux[i].donnees / echelle) * 100}%`}></span>
            <span class="p" style={`width:${(totaux[i].prior / echelle) * 100}%`}></span>
          </div>
          <p class="val">{fmt(totaux[i].donnees)} + {fmt(totaux[i].prior)} = <strong>{fmt(totaux[i].donnees + totaux[i].prior)}</strong></p>
        </div>
      {/each}
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Force de l’a priori λ" bind:value={lambda} min={0.0001} max={20} log format={(v) => (v < 0.01 ? v.toExponential(1) : v.toFixed(3))} />
    <Bascule label="A priori Ψ" bind:value={type} options={[{ valeur: 'l1', texte: 'TV (L1)' }, { valeur: 'l2', texte: 'L2²' }, { valeur: 'l0', texte: 'L0' }]} />
  {/snippet}
</Panneau>

<style>
  .grille { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 640px) { .grille { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .cand { border-radius: 10px; padding: 0.4rem; border: 1px solid transparent; transition: border-color 0.25s var(--ease), background 0.25s var(--ease); }
  .cand.gagne { border-color: var(--accent); background: color-mix(in oklch, var(--accent) 8%, transparent); }
  .cand :global(canvas) { width: 100%; height: auto; display: block; border-radius: 5px; }
  .nom { margin: 0.4rem 0 0.3rem; font-size: 0.85rem; font-weight: 600; }
  .gagne .nom { color: var(--accent); }
  .barre { display: flex; height: 0.5rem; border-radius: 99px; overflow: hidden; background: var(--papier-3); }
  .barre .d { background: var(--encre-3); transition: width 0.25s var(--ease); }
  .barre .p { background: var(--accent); transition: width 0.25s var(--ease); }
  .val { margin: 0.3rem 0 0; font-size: 0.74rem; color: var(--encre-3); font-variant-numeric: tabular-nums; }
  .val strong { color: var(--encre); }
</style>
