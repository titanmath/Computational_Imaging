<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';
  type Prior = 'aucun' | 'l2' | 'tv' | 'l0';
  const DEFAUT: Record<Prior, number> = { aucun: 0, l2: 0.65, tv: 0.07, l0: 0.02 };
  let prior = $state<Prior>('tv');
  let lambda = $state(0.07);
  let bruit = $state(0.1);
</script>

<Scene3D
  titre="L’image vue comme un relief : altitude = intensité du pixel"
  charger={() => import('@/lib/gl/scenes/reliefImage')}
  params={{ prior, lambda, bruit }}
  ratio={16 / 9}
  ratioMobile={1.1}
  indice="Glisser pour tourner, molette pour zoomer"
  note="Le terrain part de la mesure bruitée, puis l’optimisation le transforme sous tes yeux. Avec la TV, les pentes douces se changent en terrasses (l’« effet escalier ») et les falaises, c’est-à-dire les bords, restent nettes. Avec L2², tout s’arrondit, falaises comprises."
>
  {#snippet controles()}
    <Bascule label="A priori" bind:value={prior} onchange={(v) => (lambda = DEFAUT[v])} options={[{ valeur: 'aucun', texte: 'Aucun' }, { valeur: 'l2', texte: 'L2²' }, { valeur: 'tv', texte: 'TV' }, { valeur: 'l0', texte: 'L0' }]} />
    {#if prior !== 'aucun'}<Curseur label="Force λ" bind:value={lambda} min={0.002} max={prior === 'l2' ? 10 : 0.5} log format={(v) => v.toFixed(3)} />{/if}
    <Curseur label="Bruit σ" bind:value={bruit} min={0} max={0.2} step={0.01} format={(v) => v.toFixed(2)} />
  {/snippet}
</Scene3D>
