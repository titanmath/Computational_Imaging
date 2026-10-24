<script lang="ts">
  import Scene3D from '../ui/Scene3D.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';
  let beta = $state(0.035);
  let vue = $state<0 | 1 | 2>(0);
  let rayon = $state(4);
  let omega = $state(0.95);
</script>

<Scene3D
  titre="Une rue dans la brume, path-tracée : image, canal sombre et débrumage"
  charger={() => import('@/lib/gl/scenes/rueBrume')}
  params={{ beta, vue, rayon, omega }}
  ratio={16 / 9}
  ratioMobile={1.2}
  note="La brume est simulée physiquement : chaque rayon est atténué selon la distance parcourue et reçoit en échange la lumière diffusée par l’air (A). Sur la vue « canal sombre », les bâtiments proches restent noirs (couleurs saturées), le fond s’éclaircit avec la distance : le canal sombre mesure la brume, donc la profondeur."
>
  {#snippet controles()}
    <Curseur label="Densité de brume β" bind:value={beta} min={0} max={0.15} step={0.002} unite="m⁻¹" format={(v) => v.toFixed(3)} />
    <Bascule label="Vue" bind:value={vue} options={[{ valeur: 0, texte: 'Image I' }, { valeur: 1, texte: 'Canal sombre' }, { valeur: 2, texte: 'Débrumée Ĵ' }]} />
    {#if vue > 0}
      <Curseur label="Rayon de la fenêtre" bind:value={rayon} min={0} max={6} step={1} unite="px" />
      {#if vue === 2}<Curseur label="ω" bind:value={omega} min={0.5} max={1} step={0.01} format={(v) => v.toFixed(2)} />{/if}
    {/if}
  {/snippet}
</Scene3D>
