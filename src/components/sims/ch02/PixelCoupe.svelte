<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Bouton from '../ui/Bouton.svelte';
  let flux = $state(30);
  let microlentilles = $state(true);
  let exposition = $state(0);
</script>

<Scene3D
  titre="Coupe de 3 × 3 pixels d’un capteur : microlentilles, filtres de Bayer, photodiodes et puits d’électrons"
  charger={() => import('@/lib/gl/scenes/pixel')}
  params={{ flux, microlentilles, exposition }}
  ratio={16 / 10}
  ratioMobile={1.1}
  indice="Glisser pour tourner"
>
  {#snippet controles()}
    <Curseur label="Flux lumineux" bind:value={flux} min={4} max={150} log step={1} unite="photons/s" format={(v) => v.toFixed(0)} />
    <Bascule label="Microlentilles" bind:value={microlentilles} options={[{ valeur: true, texte: 'Avec' }, { valeur: false, texte: 'Sans' }]} />
    <div><Bouton principal onclick={() => exposition++}>↺ Nouvelle exposition</Bouton></div>
  {/snippet}
</Scene3D>
