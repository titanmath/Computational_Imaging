<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bascule from '../ui/Bascule.svelte';
  let vue = $state<'tout' | 'cone'>('tout');
</script>

<Scene3D
  titre="L’espace XYZ : cône des couleurs spectrales et gamut sRGB"
  charger={() => import('@/lib/gl/scenes/solideCouleurs')}
  params={{ vue }}
  ratio={16 / 10}
  ratioMobile={1.1}
  indice="Glisser pour tourner"
  note="Le cône contient toutes les couleurs physiquement réalisables (mélanges positifs de lumières spectrales). Le parallélépipède coloré est ce qu’un écran sRGB peut afficher : il n’en occupe qu’une partie. Couper le cône par le plan X + Y + Z = 1 donne le diagramme de chromaticité."
>
  {#snippet controles()}
    <Bascule label="Afficher" bind:value={vue} options={[{ valeur: 'tout', texte: 'Cône + gamut sRGB' }, { valeur: 'cone', texte: 'Cône spectral seul' }]} />
  {/snippet}
</Scene3D>
