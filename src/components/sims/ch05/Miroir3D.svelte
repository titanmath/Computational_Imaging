<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bascule from '../ui/Bascule.svelte';
  let aligne = $state(false);
</script>

<Scene3D
  titre="Télescope à miroir segmenté : 18 segments renvoient la lumière d’une étoile vers le détecteur"
  charger={() => import('@/lib/gl/scenes/miroirSegmente')}
  params={{ aligne }}
  ratio={16 / 10}
  ratioMobile={1.1}
  indice="Glisser pour tourner"
  note="Modèle direct ŷ = F_étoile(P; θ) : P = une étoile de référence, θ = orientations des segments, y = images mesurées. On ajuste les actionneurs jusqu’à superposer les images (NASA/STScI, alignement de Webb, 2022)."
>
  {#snippet controles()}
    <Bascule label="Actionneurs" bind:value={aligne} options={[{ valeur: false, texte: 'Avant alignement' }, { valeur: true, texte: 'Aligner les segments' }]} />
  {/snippet}
</Scene3D>
