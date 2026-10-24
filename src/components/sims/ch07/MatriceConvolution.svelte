<script lang="ts">
  // La convolution 1D écrite comme un produit matrice × vecteur : chaque ligne de A contient le noyau,
  // décalé, et des zéros ailleurs. Survole une sortie pour voir sa ligne.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';

  const N = 12;
  let noyau = $state<'moyenne' | 'derivee' | 'gauss'>('moyenne');
  const K = $derived(noyau === 'moyenne' ? [1 / 3, 1 / 3, 1 / 3] : noyau === 'derivee' ? [-1, 1, 0] : [0.25, 0.5, 0.25]);
  const x = [0.1, 0.1, 0.2, 0.8, 0.9, 0.9, 0.85, 0.3, 0.2, 0.2, 0.6, 0.6];
  // A[i][j] = K[j − i + 1] (bords : on tronque)
  const A = $derived(Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (Math.abs(j - i) <= 1 ? K[j - i + 1] : 0))));
  const b = $derived(A.map((ligne) => ligne.reduce((s, a, j) => s + a * x[j], 0)));
  let ligne = $state(5);
  const C = 22;
  const couleur = (v: number) => (v === 0 ? 'var(--papier-2)' : v > 0 ? `color-mix(in oklab, var(--accent) ${Math.min(100, Math.abs(v) * 160)}%, var(--papier))` : `color-mix(in oklab, #2f7bf0 ${Math.min(100, Math.abs(v) * 90)}%, var(--papier))`);
</script>

<Panneau note="Pour une image de 512 × 512, A aurait 262 144 × 262 144 coefficients, presque tous nuls : on ne la forme jamais explicitement.">
  {#snippet figure()}
    <div class="g">
      <svg viewBox={`0 0 ${N * C + 200} ${N * C + 40}`} role="img" aria-label="Matrice de convolution, vecteur x et résultat b">
        <text x={N * C + 40} y="12" class="t m">b</text>
        <text x={N * C / 2} y="12" class="t m">A</text>
        <text x={N * C + 160} y="12" class="t m">x</text>
        {#each A as l, i}
          {#each l as a, j}
            <rect x={j * C} y={20 + i * C} width={C - 2} height={C - 2} rx="3" fill={couleur(a)} class:actif={i === ligne} />
          {/each}
          <rect
            x={N * C + 28}
            y={20 + i * C}
            width={24}
            height={C - 2}
            rx="3"
            fill={couleur(b[i])}
            class="sortie"
            class:actif={i === ligne}
            role="button"
            tabindex="0"
            aria-label={`Sortie ${i + 1} : ${b[i].toFixed(2)}`}
            onpointerenter={() => (ligne = i)}
            onfocus={() => (ligne = i)}
          />
        {/each}
        {#each x as v, j}
          <rect x={N * C + 148} y={20 + j * C} width="24" height={C - 2} rx="3" fill={couleur(v)} class:lu={Math.abs(j - ligne) <= 1} />
        {/each}
        <text x={N * C + 15} y={20 + (N * C) / 2} class="t m">=</text>
        <text x={N * C + 105} y={20 + (N * C) / 2} class="t m">×</text>
      </svg>
      <div class="explication">
        <p class="t2">Sortie {ligne + 1}</p>
        <p>b<sub>{ligne + 1}</sub> = {K.map((k, q) => (ligne + q - 1 >= 0 && ligne + q - 1 < N ? `${k.toFixed(2)} × ${x[ligne + q - 1].toFixed(2)}` : null)).filter(Boolean).join(' + ')} = <b>{b[ligne].toFixed(3)}</b></p>
        <p class="pt">La ligne {ligne + 1} de A place les poids du noyau sur les entrées voisines, et des zéros partout ailleurs.</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Noyau K" bind:value={noyau} options={[{ valeur: 'moyenne', texte: 'Moyenne (1/3, 1/3, 1/3)' }, { valeur: 'gauss', texte: 'Lissage (¼, ½, ¼)' }, { valeur: 'derivee', texte: 'Différence (−1, 1)' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 620px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  rect { transition: fill 0.25s, stroke 0.2s; }
  rect.actif { stroke: var(--encre); stroke-width: 1.5; }
  rect.lu { stroke: var(--accent); stroke-width: 2; }
  .sortie { cursor: pointer; }
  .t { font-size: 13px; fill: var(--encre-2); font-family: var(--f-titre); }
  .t.m { text-anchor: middle; }
  .t2 { margin: 0 0 0.3rem; font-family: var(--f-titre); font-size: 1.1rem; }
  .explication p { margin: 0 0 0.4rem; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
  .pt { color: var(--encre-3); }
</style>
