<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { diametreOptimal, flouDiffraction, flouGeometrique } from '@/lib/optique/lentille';

  interface Props {
    focale?: number; // m
  }
  let { focale = 0.26 }: Props = $props();
  let diametre = $state(1);
  let compenser = $state(false);
  const d = $derived(diametre / 1000);
  const bg = $derived(flouGeometrique(d, focale, 10) * 1000);
  const bd = $derived(flouDiffraction(d, focale) * 1000);
  const dopt = $derived(diametreOptimal(focale, 10) * 1000);
</script>

<Scene3D
  titre="Vue path-tracée à travers une caméra sténopé : le diamètre du trou règle la netteté et la luminosité"
  charger={() => import('@/lib/gl/scenes/stenope')}
  params={{ diametre, focale, compenser }}
  ratio={19 / 15}
  ratioMobile={19 / 15}
  note={`Prédiction pour f = ${(focale * 100).toFixed(0)} cm, objet à 10 m : flou géométrique ≈ ${bg.toFixed(2)} mm, flou de diffraction ≈ ${bd.toFixed(2)} mm (non simulé dans l’image), diamètre optimal ≈ ${dopt.toFixed(2)} mm.`}
>
  {#snippet controles()}
    <Curseur label="Diamètre du trou d" bind:value={diametre} min={0.1} max={6} log step={0.01} unite="mm" format={(v) => v.toFixed(2)} />
    <Bascule
      label="Exposition"
      bind:value={compenser}
      options={[
        { valeur: false, texte: 'Temps fixe' },
        { valeur: true, texte: 'Gain compensé (ISO ↑)' },
      ]}
    />
  {/snippet}
</Scene3D>
