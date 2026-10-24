<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  let exposition = $state(0);
  let mode = $state<0 | 1 | 2>(0);
</script>

<Scene3D
  titre="Pièce intérieure path-tracée avec une fenêtre ensoleillée : une scène à très grande dynamique"
  charger={() => import('@/lib/gl/scenes/pieceHDR')}
  params={{ exposition, mode }}
  ratio={16 / 10}
  ratioMobile={1.1}
  note="L’image est calculée en radiance flottante (sans limite haute). En mode « capteur », tout ce qui dépasse 1 est écrêté, comme un pixel saturé ; les tone mappings compressent la dynamique pour l’affichage."
>
  {#snippet controles()}
    <Curseur label="Exposition virtuelle" bind:value={exposition} min={-8} max={6} step={0.5} unite="IL" format={(v) => (v > 0 ? '+' : '') + v.toFixed(1)} />
    <Bascule label="Affichage" bind:value={mode} options={[{ valeur: 0, texte: 'Capteur (écrêtage)' }, { valeur: 2, texte: 'Reinhard' }, { valeur: 1, texte: 'ACES' }]} />
  {/snippet}
</Scene3D>
