<script lang="ts">
  // Différentiation automatique en mode inverse sur L = ½ (2x − 3)² (exemple des slides : gain 2, mesure 3).
  // Propagation avant (valeurs), puis arrière (dérivées) par la règle de la chaîne.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';

  let x = $state(2);
  let phase = $state<'avant' | 'arriere'>('avant');
  const u = $derived(2 * x);
  const r = $derived(u - 3);
  const L = $derived(0.5 * r * r);
  // dérivées : dL/dr = r ; dr/du = 1 ; du/dx = 2
  const dLdr = $derived(r);
  const dLdu = $derived(dLdr * 1);
  const dLdx = $derived(dLdu * 2);
  const noeuds = $derived([
    { x: 60, t: 'x', v: x, d: dLdx, op: '' },
    { x: 230, t: 'u = 2x', v: u, d: dLdu, op: '× 2' },
    { x: 400, t: 'r = u − 3', v: r, d: dLdr, op: '− 3' },
    { x: 570, t: 'L = ½ r²', v: L, d: 1, op: '½ (·)²' },
  ]);
</script>

<Panneau note="Les bibliothèques PyTorch, TensorFlow et JAX construisent ce graphe automatiquement et appliquent la rétropropagation pour obtenir le gradient de n’importe quelle composition d’opérations.">
  {#snippet figure()}
    <svg viewBox="0 0 640 210" role="img" aria-label={`Graphe de calcul : L = ${L.toFixed(2)}, dL/dx = ${dLdx.toFixed(2)}`}>
      <defs>
        <marker id="fl-ad" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="currentColor" /></marker>
      </defs>
      {#each noeuds as n, i}
        {#if i < noeuds.length - 1}
          <line x1={n.x + 52} x2={noeuds[i + 1].x - 52} y1="80" y2="80" class="fl av" class:on={phase === 'avant'} marker-end="url(#fl-ad)" />
          <text x={(n.x + noeuds[i + 1].x) / 2} y="70" class="op">{noeuds[i + 1].op}</text>
          <line x1={noeuds[i + 1].x - 52} x2={n.x + 52} y1="130" y2="130" class="fl ar" class:on={phase === 'arriere'} marker-end="url(#fl-ad)" />
          <text x={(n.x + noeuds[i + 1].x) / 2} y="150" class="op ar-t" class:on={phase === 'arriere'}>× {i === 0 ? 2 : i === 1 ? 1 : 'r'}</text>
        {/if}
        <g>
          <rect x={n.x - 50} y="55" width="100" height="100" rx="12" class="boite" />
          <text x={n.x} y="80" class="nom">{n.t}</text>
          <text x={n.x} y="108" class="val">{n.v.toFixed(2)}</text>
          <text x={n.x} y="140" class="der" class:on={phase === 'arriere'}>∂L/∂· = {n.d.toFixed(2)}</text>
        </g>
      {/each}
      <text x="320" y="30" class="titre">{phase === 'avant' ? 'Propagation avant : on calcule les valeurs' : 'Propagation arrière : ∂L/∂x = ∂L/∂r · ∂r/∂u · ∂u/∂x'}</text>
      <text x="320" y="195" class="titre petit">{phase === 'arriere' ? `= ${dLdr.toFixed(2)} × 1 × 2 = ${dLdx.toFixed(2)}` : ''}</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Valeur candidate x" bind:value={x} min={-1} max={4} step={0.1} />
    <Bascule label="Passe" bind:value={phase} options={[{ valeur: 'avant', texte: 'Avant' }, { valeur: 'arriere', texte: 'Arrière' }]} />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.4rem; font-family: var(--f-texte); color: var(--encre-3); }
  .boite { fill: var(--papier-2); stroke: var(--filet-fort); }
  .nom { text-anchor: middle; font-size: 13px; fill: var(--encre-2); }
  .val { text-anchor: middle; font-family: var(--f-titre); font-size: 22px; fill: var(--encre); }
  .der { text-anchor: middle; font-size: 12px; fill: var(--encre-3); opacity: 0.35; transition: opacity 0.3s; }
  .der.on { opacity: 1; fill: var(--accent); font-weight: 600; }
  .fl { stroke: var(--filet-fort); stroke-width: 1.5; opacity: 0.4; transition: opacity 0.3s, stroke 0.3s; }
  .fl.on { opacity: 1; stroke: var(--encre-2); }
  .fl.ar.on { stroke: var(--accent); color: var(--accent); }
  .op { text-anchor: middle; font-size: 12px; fill: var(--encre-3); }
  .ar-t { opacity: 0.3; }
  .ar-t.on { opacity: 1; fill: var(--accent); }
  .titre { text-anchor: middle; font-family: var(--f-titre); font-size: 15px; fill: var(--encre-2); }
  .titre.petit { font-size: 14px; fill: var(--accent); }
</style>
