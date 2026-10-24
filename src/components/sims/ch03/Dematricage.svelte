<script lang="ts">
  // Dématriçage bilinéaire : vraie couleur, mosaïque mesurée et reconstruction, sur des détails fins.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Toile from '../ui/Toile.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { canalBayer, dematricer } from '@/lib/sim/isp';
  import { creerImg, type Img } from '@/lib/sim/image';

  let zone = $state<'mire' | 'maison' | 'arbre'>('mire');
  const ZONES = { mire: [196, 82], maison: [52, 96], arbre: [120, 70] } as const;
  let vrai: Img | undefined = $state();
  let cfa: Img | undefined = $state();
  let rec: Img | undefined = $state();
  let src: Img | undefined;
  let mosaique: Img | undefined;
  let demat: Img | undefined;
  const Z = 32, ZH = 24;

  function recadrer(im: Img, x0: number, y0: number): Img {
    const out = creerImg(Z, ZH, 3);
    for (let y = 0; y < ZH; y++) for (let x = 0; x < Z; x++) for (let k = 0; k < 3; k++) out.d[(y * Z + x) * 3 + k] = im.d[((y0 + y) * im.l + x0 + x) * im.c + (im.c === 3 ? k : 0)];
    return out;
  }
  function maj() {
    if (!src || !mosaique || !demat) return;
    const [x0, y0] = ZONES[zone];
    vrai = recadrer(src, x0, y0);
    const m = recadrer(mosaique, x0, y0);
    const colore = creerImg(Z, ZH, 3);
    for (let y = 0; y < ZH; y++) for (let x = 0; x < Z; x++) {
      const c = canalBayer(x0 + x, y0 + y);
      colore.d[(y * Z + x) * 3 + c] = m.d[(y * Z + x) * 3];
    }
    cfa = colore;
    rec = recadrer(demat, x0, y0);
  }
  onMount(() => {
    src = scenePaysage(240, 180);
    mosaique = creerImg(240, 180, 1);
    for (let y = 0; y < 180; y++) for (let x = 0; x < 240; x++) mosaique.d[y * 240 + x] = src.d[(y * 240 + x) * 3 + canalBayer(x, y)];
    demat = dematricer(mosaique);
    maj();
  });
  $effect(() => {
    void zone;
    maj();
  });
</script>

<Panneau note="Agrandissements × 8 au plus proche voisin, sans bruit ni balance des blancs, pour isoler l’effet du dématriçage.">
  {#snippet figure()}
    <div class="trois">
      <Toile image={vrai} etiquette="Couleurs vraies" />
      <Toile image={cfa} etiquette="Ce que mesure le capteur (CFA)" />
      <Toile image={rec} etiquette="Dématriçage bilinéaire" />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Zone" bind:value={zone} options={[{ valeur: 'mire', texte: 'Mire fine' }, { valeur: 'maison', texte: 'Fenêtre' }, { valeur: 'arbre', texte: 'Feuillage' }]} />
  {/snippet}
</Panneau>

<style>
  .trois { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 560px) { .trois { grid-template-columns: 1fr 1fr; } }
</style>
