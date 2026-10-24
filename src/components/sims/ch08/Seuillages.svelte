<script lang="ts">
  // Débruiter UN coefficient : x̂ = argmin ½(x − b)² + λψ(x). L2² rétrécit tout (jamais zéro), L1 retranche λ
  // et met à zéro sous λ (seuillage doux), L0 garde ou annule (seuillage dur, seuil √(2λ)).
  // À droite : des « gradients » bruités (beaucoup de petits, quelques grands = bords) passés dans l'opérateur.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { seuillage } from '@/lib/sim/priors';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  let lambda = $state(0.12);
  let op = $state<'l2' | 'l1' | 'l0'>('l1');
  const COUL = { l2: '#3a78b5', l1: 'var(--accent)', l0: '#c38a1d' };
  const X = (b: number) => 30 + ((b + 1) / 2) * 260;
  const Y = (v: number) => 140 - v * 120;
  const courbe = (f: (b: number) => number) => {
    let d = '';
    let prec: number | undefined;
    for (let k = 0; k <= 400; k++) {
      const b = -1 + k / 200;
      const v = f(b);
      // saut (seuillage dur) : on lève le crayon
      d += `${prec === undefined || Math.abs(v - prec) > 0.05 ? 'M' : 'L'}${X(b).toFixed(1)},${Y(v).toFixed(1)}`;
      prec = v;
    }
    return d;
  };
  const a = creerAlea(8);
  const coeffs = Array.from({ length: 36 }, (_, i) => ([6, 15, 27].includes(i) ? (i === 15 ? -0.62 : 0.55 + 0.2 * a()) : 0) + 0.07 * gauss(a));
  const sortie = $derived(coeffs.map((c) => seuillage[op](c, lambda)));
  const nuls = $derived(sortie.filter((v) => v === 0).length);
  const BX = (i: number) => 336 + i * 7.4;
  const BY = (v: number) => 140 - v * 120;
</script>

<Panneau note={`Avec λ = ${lambda.toFixed(3)} : L1 annule les coefficients sous ${lambda.toFixed(3)} ; L0 annule ceux sous √(2λ) = ${Math.sqrt(2 * lambda).toFixed(3)}. Ici ${nuls} coefficients sur ${coeffs.length} deviennent exactement nuls.`}>
  {#snippet figure()}
    <svg viewBox="0 0 620 270" role="img" aria-label="Opérateurs de seuillage et effet sur des coefficients bruités">
      <line x1={X(-1)} x2={X(1)} y1={Y(0)} y2={Y(0)} class="axe" />
      <line x1={X(0)} x2={X(0)} y1={Y(-1)} y2={Y(1)} class="axe" />
      <path d={`M${X(-1)},${Y(-1)} L${X(1)},${Y(1)}`} class="id" />
      <text x={X(1)} y={Y(0) + 14} class="g d">observation b</text>
      <text x={X(0) + 5} y={Y(1) + 10} class="g">x̂</text>
      {#each ['l2', 'l1', 'l0'] as const as k}
        <path d={courbe((b) => seuillage[k](b, lambda))} style={`stroke:${COUL[k]}`} class="c" class:faible={k !== op} />
      {/each}
      <text x={X(-0.95)} y={Y(0.92)} class="g" style={`fill:${COUL.l2}`}>L2² : b / (1 + 2λ)</text>
      <text x={X(-0.95)} y={Y(0.78)} class="g" style={`fill:${COUL.l1}`}>L1 : seuillage doux</text>
      <text x={X(-0.95)} y={Y(0.64)} class="g" style={`fill:${COUL.l0}`}>L0 : seuillage dur</text>
      <!-- coefficients -->
      <line x1={BX(0) - 4} x2={BX(35) + 4} y1={BY(0)} y2={BY(0)} class="axe" />
      {#each coeffs as c, i}
        <rect x={BX(i) - 2.6} width="2.4" y={Math.min(BY(c), BY(0))} height={Math.abs(BY(c) - BY(0))} class="entree" />
        <rect x={BX(i) + 0.2} width="2.6" y={Math.min(BY(sortie[i]), BY(0))} height={Math.max(0.01, Math.abs(BY(sortie[i]) - BY(0)))} style={`fill:${COUL[op]}`} />
        {#if sortie[i] === 0}<circle cx={BX(i)} cy={BY(0)} r="1.6" class="zero" />{/if}
      {/each}
      <text x={BX(0)} y="262" class="g">gris : coefficients bruités · couleur : après seuillage</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="λ" bind:value={lambda} min={0.002} max={0.4} log format={(v) => v.toFixed(3)} />
    <Bascule label="Opérateur appliqué aux coefficients" bind:value={op} options={[{ valeur: 'l2', texte: 'L2²' }, { valeur: 'l1', texte: 'L1' }, { valeur: 'l0', texte: 'L0' }]} />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.8rem 0.2rem; font-family: var(--f-texte); }
  .axe { stroke: var(--encre-3); }
  .id { stroke: var(--filet-fort); stroke-dasharray: 3 3; }
  .c { fill: none; stroke-width: 2.4; transition: opacity 0.2s; }
  .c.faible { opacity: 0.35; stroke-width: 1.6; }
  .entree { fill: var(--encre-3); opacity: 0.55; }
  .zero { fill: var(--encre); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
</style>
