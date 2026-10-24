<script lang="ts">
  // Filtre de Bayer : chaque photosite ne mesure qu'une couleur. Vue d'ensemble + loupe (clic pour la déplacer).
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { creerImg, type Img } from '@/lib/sim/image';

  type Motif = 'RGGB' | 'CYGM' | 'RGBE';
  let vue = $state<'couleur' | 'cfa' | 'brut'>('cfa');
  let motif = $state<Motif>('RGGB');
  let scene: Img | undefined = $state();
  let cx = $state(178), cy = $state(110);
  const Z = 24;

  // Réponses (approchées) des filtres en RGB linéaire
  const FILTRES: Record<string, [number, number, number]> = {
    R: [1, 0, 0], G: [0, 1, 0], B: [0, 0, 1],
    C: [0, 1, 1], Y: [1, 1, 0], M: [1, 0, 1], E: [0, 0.75, 0.75],
  };
  const MOTIFS: Record<Motif, string[][]> = {
    RGGB: [['R', 'G'], ['G', 'B']],
    CYGM: [['C', 'Y'], ['G', 'M']],
    RGBE: [['R', 'G'], ['B', 'E']],
  };
  const filtreEn = (x: number, y: number) => MOTIFS[motif][y % 2][x % 2];

  function rendre(src: Img): Img {
    const out = creerImg(src.l, src.h, 3);
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.l; x++) {
        const i = (y * src.l + x) * 3;
        const f = FILTRES[filtreEn(x, y)];
        const mesure = (src.d[i] * f[0] + src.d[i + 1] * f[1] + src.d[i + 2] * f[2]) / (f[0] + f[1] + f[2]);
        for (let k = 0; k < 3; k++)
          out.d[i + k] = vue === 'couleur' ? src.d[i + k] : vue === 'brut' ? mesure : mesure * (f[k] > 0 ? 1 : 0.08);
      }
    return out;
  }
  const image = $derived(scene ? rendre(scene) : undefined);
  const loupe = $derived.by(() => {
    if (!image) return undefined;
    const out = creerImg(Z, Z * 0.75, 3);
    const x0 = Math.max(0, Math.min(image.l - Z, cx - Z / 2));
    const y0 = Math.max(0, Math.min(image.h - Z * 0.75, cy - (Z * 0.75) / 2));
    for (let y = 0; y < out.h; y++)
      for (let x = 0; x < out.l; x++)
        for (let k = 0; k < 3; k++) out.d[(y * out.l + x) * 3 + k] = image.d[((y0 + y) * image.l + x0 + x) * 3 + k];
    return out;
  });
  onMount(() => (scene = scenePaysage(240, 180)));
  function viser(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    cx = Math.round(((e.clientX - r.left) / r.width) * 240);
    cy = Math.round(((e.clientY - r.top) / r.height) * 180);
  }
</script>

<Panneau>
  {#snippet figure()}
    <div class="g2">
      <div>
        <div class="ensemble" role="button" tabindex="0" onclick={viser} onkeydown={() => {}} aria-label="Cliquer pour placer la loupe">
          <Toile image={image} />
          <span class="cadre" style={`left:${((Math.max(0, Math.min(240 - Z, cx - Z / 2))) / 240) * 100}%;top:${((Math.max(0, Math.min(180 - Z * 0.75, cy - (Z * 0.75) / 2))) / 180) * 100}%;width:${(Z / 240) * 100}%;height:${((Z * 0.75) / 180) * 100}%`}></span>
        </div>
        <p class="leg">Image entière (clic : déplacer la loupe)</p>
      </div>
      <Toile image={loupe} etiquette={`Loupe : ${Z} × ${Z * 0.75} photosites`} />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Ce qu’on regarde" bind:value={vue} options={[{ valeur: 'couleur', texte: 'Scène (couleur)' }, { valeur: 'cfa', texte: 'RAW coloré par filtre' }, { valeur: 'brut', texte: 'RAW (1 valeur / site)' }]} />
    <Bascule label="Motif du filtre" bind:value={motif} options={[{ valeur: 'RGGB', texte: 'Bayer RGGB' }, { valeur: 'CYGM', texte: 'CYGM' }, { valeur: 'RGBE', texte: 'RGBE' }]} />
  {/snippet}
</Panneau>

<style>
  .g2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; padding: 1rem 1.1rem 0.5rem; }
  @media (max-width: 560px) { .g2 { grid-template-columns: 1fr; } }
  .ensemble { position: relative; cursor: crosshair; }
  .leg { margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--encre-3); text-align: center; }
  .cadre { position: absolute; border: 2px solid var(--accent); border-radius: 2px; pointer-events: none; box-shadow: 0 0 0 999px rgb(0 0 0 / 0.0); }
</style>
