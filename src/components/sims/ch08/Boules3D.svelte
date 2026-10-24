<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  let p = $state(1);
  let azimut = $state(35);
  let elevation = $state(32);
  let rejouer = $state(0);
</script>

<Scene3D
  titre="Boules L2, L1 et p = 0,5 : premier contact avec une contrainte linéaire"
  charger={() => import('@/lib/gl/scenes/boulesLp')}
  params={{ p, azimut, elevation, rejouer }}
  ratio={16 / 10}
  ratioMobile={1}
  indice="Glisser pour tourner"
  note="Le plan représente toutes les solutions d’une équation à trois inconnues. On gonfle la boule de la pénalité jusqu’à ce qu’elle touche le plan : le point de contact est la solution la moins pénalisée. Tourne le plan : la sphère touche toujours « de biais », l’octaèdre presque toujours par une pointe, donc sur un axe."
>
  {#snippet controles()}
    <Bascule label="Pénalité" bind:value={p} options={[{ valeur: 2, texte: 'L2 (sphère)' }, { valeur: 1, texte: 'L1 (octaèdre)' }, { valeur: 0.5, texte: 'p = 0,5 (étoile)' }]} />
    <Curseur label="Orientation du plan : azimut" bind:value={azimut} min={0} max={90} step={1} unite="°" />
    <Curseur label="Orientation du plan : élévation" bind:value={elevation} min={5} max={85} step={1} unite="°" />
    <Bouton onclick={() => rejouer++}>Rejouer le gonflement</Bouton>
  {/snippet}
</Scene3D>
