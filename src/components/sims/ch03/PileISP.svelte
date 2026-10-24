<script lang="ts">
  // La même chaîne en 3D : les étapes sont des plaques alignées ; clique une étape pour l'avancer.
  import { onMount } from 'svelte';
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { pipeline, RAW_DEFAUT, canalBayer, type EtapesISP } from '@/lib/sim/isp';
  import { creerImg, versImageData } from '@/lib/sim/image';

  const NOMS = ['RAW', 'Noir', 'Défauts', 'Vignetage', 'Dématriçage', 'Débruitage', 'Balance', 'Couleur', 'sRGB', 'JPEG'];
  const CLES: (keyof EtapesISP)[] = ['raw', 'noir', 'defauts', 'vignetage', 'demat', 'debruite', 'balance', 'couleur', 'srgb', 'jpeg'];
  let images: ImageData[] = $state([]);
  let etape = $state(1);

  onMount(() => {
    const e = pipeline(scenePaysage(160, 120));
    images = CLES.map((k) => {
      const im = e[k];
      if (im.c === 3) return versImageData(im, { affichage: k === 'srgb' || k === 'jpeg' ? 'lineaire' : 'srgb' });
      const out = creerImg(im.l, im.h, 3);
      const s = 1 / (RAW_DEFAUT.gain * RAW_DEFAUT.electronsBlanc);
      for (let y = 0; y < im.h; y++)
        for (let x = 0; x < im.l; x++) {
          const v = im.d[y * im.l + x] * s;
          const c = canalBayer(x, y);
          for (let q = 0; q < 3; q++) out.d[(y * im.l + x) * 3 + q] = q === c ? v : v * 0.12;
        }
      return versImageData(out);
    });
  });
</script>

<Scene3D
  titre="Les dix étapes de la chaîne ISP présentées comme des plaques alignées"
  charger={() => import('@/lib/gl/scenes/pileISP')}
  params={{ images, active: etape - 1, noms: NOMS }}
  ratio={2}
  ratioMobile={1.3}
  indice="Glisser pour tourner"
>
  {#snippet controles()}
    <Curseur label="Étape mise en avant" bind:value={etape} min={1} max={10} step={1} format={(v) => `${v}. ${NOMS[v - 1]}`} />
  {/snippet}
</Scene3D>
