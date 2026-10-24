<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  let virtuel = $state(0.5);
  let ecran = $state(2);
  const conflit = $derived(Math.abs(1 / virtuel - 1 / ecran));
</script>

<Scene3D
  titre="Deux yeux regardant un objet virtuel affiché par un écran stéréoscopique"
  charger={() => import('@/lib/gl/scenes/vergence')}
  params={{ virtuel, ecran }}
  ratio={16 / 9}
  ratioMobile={1.2}
  indice="Glisser pour tourner"
  note={conflit > 0.5 ? `Conflit de ${conflit.toFixed(2)} dioptries : au-delà d’environ 0,5 D, il devient inconfortable (fatigue, vision double).` : `Conflit faible (${conflit.toFixed(2)} D) : l’objet virtuel est proche du plan de l’écran.`}
>
  {#snippet controles()}
    <Curseur label="Profondeur de l’objet virtuel" bind:value={virtuel} min={0.25} max={4} log step={0.01} unite="m" format={(v) => v.toFixed(2)} />
    <Curseur label="Distance optique de l’écran" bind:value={ecran} min={0.5} max={4} log step={0.01} unite="m" format={(v) => v.toFixed(2)} />
  {/snippet}
</Scene3D>
