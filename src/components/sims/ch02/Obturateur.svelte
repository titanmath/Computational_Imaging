<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  let tours = $state(6);
  let balayage = $state(60);
  let mode = $state<'roulant' | 'global'>('roulant');
  const rotation = $derived(tours * balayage * 0.36); // degrés parcourus pendant un balayage
</script>

<Scene3D
  titre="Hélice en rotation filmée par un capteur à obturateur roulant : chaque ligne est lue à un instant différent"
  charger={() => import('@/lib/gl/scenes/obturateur')}
  params={{ tours, balayage, mode }}
  ratio={2.2}
  ratioMobile={1.5}
  note={mode === 'roulant' ? `Pendant la lecture d’une image, l’hélice tourne de ${rotation.toFixed(0)}° : les lignes du bas voient les pales plus tard que celles du haut.` : 'Obturateur global : toutes les lignes partagent le même intervalle d’exposition, l’hélice n’est pas déformée.'}
>
  {#snippet controles()}
    <Bascule label="Obturateur" bind:value={mode} options={[{ valeur: 'roulant', texte: 'Roulant' }, { valeur: 'global', texte: 'Global' }]} />
    <Curseur label="Vitesse de l’hélice" bind:value={tours} min={0} max={20} step={0.5} unite="tours/s" />
    <Curseur label="Durée de lecture du capteur" bind:value={balayage} min={5} max={150} step={1} unite="ms" />
  {/snippet}
</Scene3D>
