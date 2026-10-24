<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bouton from '../ui/Bouton.svelte';
  let rejouer = $state(0);
</script>

<Scene3D
  titre="Vue en coupe d’un système d’imagerie : un arbre, une lentille, un capteur, une puce de calcul et l’image finale"
  charger={() => import('@/lib/gl/scenes/coupeCamera')}
  params={{ rejouer }}
  ratio={2}
  ratioMobile={1.2}
  indice="Glisser pour tourner autour"
>
  {#snippet controles()}
    <div><Bouton principal onclick={() => rejouer++}>↻ Rejouer le trajet</Bouton></div>
  {/snippet}
</Scene3D>
