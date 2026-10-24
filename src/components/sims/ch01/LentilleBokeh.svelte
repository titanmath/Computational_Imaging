<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  let nombreF = $state(2);
  let miseAuPoint = $state(1.6);
</script>

<Scene3D
  titre="Vue path-tracée à travers une lentille mince de 50 mm : profondeur de champ et bokeh"
  charger={() => import('@/lib/gl/scenes/rueBokeh')}
  params={{ nombreF, miseAuPoint }}
  ratio={16 / 9}
>
  {#snippet controles()}
    <Curseur label="Nombre d’ouverture N = f/D" bind:value={nombreF} min={1.4} max={22} log step={0.1} format={(v) => 'f/' + v.toFixed(1)} />
    <Curseur label="Mise au point Z₀" bind:value={miseAuPoint} min={0.8} max={12} log step={0.05} unite="m" format={(v) => v.toFixed(2)} />
  {/snippet}
</Scene3D>
