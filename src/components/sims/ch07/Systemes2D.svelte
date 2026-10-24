<script lang="ts">
  // Systèmes sur- et sous-déterminés à deux inconnues : chaque équation est une droite du plan (x₁, x₂).
  // Surdéterminé : les moindres carrés trouvent un compromis. Sous-déterminé : une infinité de solutions ;
  // un a priori (régularisation) en choisit une.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';

  let cas = $state<'sur' | 'sous'>('sur');
  let lambda = $state(0.3);
  const SUR = [
    { a: [1, 1], b: 3, t: 'x₁ + x₂ = 3' },
    { a: [2, -1], b: 0, t: '2x₁ − x₂ = 0' },
    { a: [1, -1], b: 1, t: 'x₁ − x₂ = 1' },
  ];
  const SOUS = [{ a: [1, 1], b: 3, t: 'x₁ + x₂ = 3' }];
  const prior = [0.4, 0.5]; // ce qu'on « attend » (a priori)
  const eqs = $derived(cas === 'sur' ? SUR : SOUS);
  // min ‖Ax − b‖² + λ‖x − x₀‖²  →  (AᵀA + λI) x = Aᵀb + λ x₀
  const sol = $derived.by(() => {
    const l = cas === 'sur' ? 0 : lambda;
    let a = l, b = 0, c = l, g1 = l * prior[0], g2 = l * prior[1];
    for (const e of eqs) {
      a += e.a[0] * e.a[0];
      b += e.a[0] * e.a[1];
      c += e.a[1] * e.a[1];
      g1 += e.a[0] * e.b;
      g2 += e.a[1] * e.b;
    }
    const det = a * c - b * b;
    return [(c * g1 - b * g2) / det, (a * g2 - b * g1) / det];
  });
  const S = 52, OX = 140, OY = 220;
  const X = (v: number) => OX + v * S;
  const Y = (v: number) => OY - v * S;
  const droite = (e: { a: number[]; b: number }) => {
    // points pour x₁ ∈ [−2, 5]
    const [p, q] = e.a;
    if (Math.abs(q) < 1e-9) return [X(e.b / p), Y(-2), X(e.b / p), Y(5)];
    return [X(-2), Y((e.b - p * -2) / q), X(5), Y((e.b - p * 5) / q)];
  };
  const couleurs = ['#e0453a', '#2f7bf0', '#2fa35a'];
</script>

<Panneau note={cas === 'sur' ? 'Trois contraintes bruitées, deux inconnues : aucune solution exacte. La solution des moindres carrés minimise la somme des carrés des écarts.' : 'Une équation, deux inconnues : tous les points de la droite conviennent. Le terme λ‖x − x₀‖² choisit le point de la droite le plus proche de l’a priori x₀ (λ → 0 : on reste sur la droite).'}>
  {#snippet figure()}
    <svg viewBox="0 0 480 300" role="img" aria-label="Droites des équations et solution">
      {#each [-2, -1, 0, 1, 2, 3, 4] as v}
        <line x1={X(v)} x2={X(v)} y1={Y(-1.5)} y2={Y(4)} class="grille" />
        <line x1={X(-2)} x2={X(5)} y1={Y(v)} y2={Y(v)} class="grille" />
      {/each}
      <line x1={X(-2)} x2={X(5)} y1={Y(0)} y2={Y(0)} class="axe" />
      <line x1={X(0)} x2={X(0)} y1={Y(-1.5)} y2={Y(4)} class="axe" />
      <text x={X(5) - 4} y={Y(0) - 6} class="g d">x₁</text>
      <text x={X(0) + 6} y={Y(4) + 12} class="g">x₂</text>
      {#each eqs as e, i}
        {@const d = droite(e)}
        <line x1={d[0]} y1={d[1]} x2={d[2]} y2={d[3]} stroke={couleurs[i]} class="eq" />
        <text x={X(3.3)} y={Y(3.7) + i * 16} fill={couleurs[i]} class="g">{e.t}</text>
      {/each}
      {#if cas === 'sous'}
        <circle cx={X(prior[0])} cy={Y(prior[1])} r="5" class="prior" />
        <text x={X(prior[0]) + 8} y={Y(prior[1]) + 4} class="g">a priori x₀</text>
      {/if}
      <circle cx={X(sol[0])} cy={Y(sol[1])} r="7" class="sol" />
      <text x={X(sol[0]) + 10} y={Y(sol[1]) - 8} class="g s">x* = ({sol[0].toFixed(2)} ; {sol[1].toFixed(2)})</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Système" bind:value={cas} options={[{ valeur: 'sur', texte: 'Surdéterminé (M > N)' }, { valeur: 'sous', texte: 'Sous-déterminé (M < N)' }]} />
    {#if cas === 'sous'}<Curseur label="Poids de l’a priori λ" bind:value={lambda} min={0.001} max={5} log format={(v) => v.toFixed(3)} />{/if}
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; max-width: 40rem; margin-inline: auto; height: auto; display: block; padding: 0.6rem; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .axe { stroke: var(--encre-3); }
  .eq { stroke-width: 2.2; }
  .sol { fill: var(--accent); stroke: var(--papier); stroke-width: 2; }
  .prior { fill: none; stroke: var(--encre); stroke-width: 2; stroke-dasharray: 3 2; }
  .g { font-size: 12px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .s { fill: var(--accent); font-weight: 600; }
</style>
