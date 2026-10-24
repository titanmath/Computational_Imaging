<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  let distance = $state(6);
  let accommodation = $state(0);
  let type = $state<'emmetrope' | 'myope' | 'hypermetrope'>('emmetrope');
  let corriger = $state(false);
</script>

<Scene3D
  titre="Œil schématique : rayons d’un point lumineux à travers la cornée et le cristallin jusqu’à la rétine"
  charger={() => import('@/lib/gl/scenes/oeil')}
  params={{ distance, accommodation, type, corriger }}
  ratio={16 / 9}
  ratioMobile={1.2}
  indice="Glisser pour tourner"
  note={`Pour voir net un objet à ${distance < 1 ? (distance * 100).toFixed(0) + ' cm' : distance.toFixed(1) + ' m'}, un œil normal doit accommoder d’environ ${(1 / distance).toFixed(1)} dioptries (1/distance en mètres).`}
>
  {#snippet controles()}
    <Curseur label="Distance de l’objet" bind:value={distance} min={0.12} max={20} log step={0.01} unite="m" format={(v) => (v < 1 ? v.toFixed(2) : v.toFixed(1))} />
    <Curseur label="Accommodation du cristallin" bind:value={accommodation} min={0} max={10} step={0.1} unite="D" />
    <Bascule label="Œil" bind:value={type} options={[{ valeur: 'emmetrope', texte: 'Normal' }, { valeur: 'myope', texte: 'Myope' }, { valeur: 'hypermetrope', texte: 'Hypermétrope' }]} />
    <Bascule label="Lunette" bind:value={corriger} options={[{ valeur: false, texte: 'Sans' }, { valeur: true, texte: 'Avec correction' }]} />
  {/snippet}
</Scene3D>
