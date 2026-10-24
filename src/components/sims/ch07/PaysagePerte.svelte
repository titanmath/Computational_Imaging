<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Bouton from '../ui/Bouton.svelte';
  let fonction = $state<'convexe' | 'vallee' | 'multiple'>('multiple');
  let eta = $state(0.25);
  let x0 = $state(2.4);
  let y0 = $state(-2.2);
  let depart = $state(0);
  function hasard() {
    x0 = Math.round((Math.random() * 5.4 - 2.7) * 10) / 10;
    y0 = Math.round((Math.random() * 5.4 - 2.7) * 10) / 10;
    depart++;
  }
</script>

<Scene3D
  titre="Paysage de perte en 3D : une bille suit la descente de gradient"
  charger={() => import('@/lib/gl/scenes/paysagePerte')}
  params={{ fonction, eta, x0, y0, depart }}
  ratio={16 / 10}
  ratioMobile={1.1}
  indice="Glisser pour tourner"
  note="Couleurs claires = perte faible. Dans la vallée étroite, un pas trop grand fait osciller d’un bord à l’autre ; sur le paysage à plusieurs creux, le point de départ décide du minimum atteint."
>
  {#snippet controles()}
    <Bascule label="Paysage" bind:value={fonction} options={[{ valeur: 'convexe', texte: 'Convexe' }, { valeur: 'vallee', texte: 'Vallée étroite' }, { valeur: 'multiple', texte: 'Plusieurs minima' }]} />
    <Curseur label="Pas η" bind:value={eta} min={0.02} max={0.7} step={0.01} />
    <div><Bouton onclick={hasard}>Départ au hasard</Bouton></div>
  {/snippet}
</Scene3D>
