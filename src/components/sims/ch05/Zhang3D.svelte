<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bouton from '../ui/Bouton.svelte';
  let relancer = $state(0);
</script>

<Scene3D
  titre="Calibration géométrique : un damier sous cinq poses, et les résidus de reprojection sur le plan image"
  charger={() => import('@/lib/gl/scenes/zhang')}
  params={{ relancer }}
  ratio={16 / 9}
  ratioMobile={1.2}
  indice="Glisser pour tourner (regarde le plan image)"
>
  {#snippet controles()}
    <div><Bouton principal onclick={() => relancer++}>↻ Relancer l’optimisation</Bouton></div>
  {/snippet}
</Scene3D>
