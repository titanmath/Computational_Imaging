<script lang="ts">
  // La chaîne ISP étape par étape, sur un RAW de Bayer simulé (12 bits, bruit, vignetage, pixels chauds,
  // éclairage tungstène). Une pellicule permet de sauter à n'importe quelle étape ; la loupe montre les pixels.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { pipeline, RAW_DEFAUT, canalBayer, type EtapesISP } from '@/lib/sim/isp';
  import { creerImg, type Img } from '@/lib/sim/image';

  const ETAPES: { cle: keyof EtapesISP; t: string; d: string }[] = [
    { cle: 'raw', t: 'RAW', d: 'Une valeur par photosite (mosaïque de Bayer), en DN sur 12 bits. Le niveau noir (64 DN) est inclus, les pixels chauds valent 4 095, les coins sont assombris (vignetage) et l’éclairage tungstène rend le bleu faible.' },
    { cle: 'noir', t: 'Niveau noir', d: 'On soustrait la ligne de base électronique : sans lumière, la valeur devient ≈ 0. De petites valeurs négatives (bruit) sont normales en virgule flottante.' },
    { cle: 'defauts', t: 'Pixels défectueux', d: 'Les sites aberrants (pixels chauds) sont repérés puis remplacés par la moyenne de leurs voisins de même couleur. C’est une opération purement locale.' },
    { cle: 'vignetage', t: 'Vignetage', d: 'On multiplie par le gain 1/v(x, y) mesuré sur un champ uniforme : les coins retrouvent leur luminosité, mais leur bruit est amplifié d’autant.' },
    { cle: 'demat', t: 'Dématriçage', d: 'On estime les deux couleurs manquantes de chaque pixel par interpolation bilinéaire des voisins de la bonne couleur. L’image est encore en « RGB caméra », bruitée et teintée.' },
    { cle: 'debruite', t: 'Débruitage', d: 'Un filtre médian 3 × 3 réduit le bruit… et un peu de texture fine.' },
    { cle: 'balance', t: 'Balance des blancs', d: 'Des gains par canal neutralisent l’illuminant : une surface grise redevient grise. Les valeurs sont encore en RGB caméra.' },
    { cle: 'couleur', t: 'Matrice couleur', d: 'Une matrice 3 × 3 calibrée convertit le RGB caméra en sRGB linéaire (les filtres de la caméra « mélangent » les couleurs).' },
    { cle: 'srgb', t: 'Encodage sRGB', d: 'La courbe sRGB (≈ gamma 1/2,4) transforme les valeurs linéaires en codes d’affichage. Désormais, les valeurs ne sont plus proportionnelles à la lumière.' },
    { cle: 'jpeg', t: 'JPEG', d: 'Compression avec pertes (DCT 8 × 8 + quantification, qualité 60) : le fichier est beaucoup plus petit, au prix d’artefacts en blocs.' },
  ];
  let i = $state(0);
  let loupe = $state(false);
  let etapes: EtapesISP | undefined = $state();
  let vignettes: Img[] = $state([]);

  function apercu(cle: keyof EtapesISP, e: EtapesISP): Img {
    const im = e[cle];
    if (im.c === 3) {
      // avant l'encodage sRGB : image linéaire → on l'affiche encodée pour l'œil ; après : codes déjà encodés
      return im;
    }
    // RAW et étapes mosaïque : on affiche chaque site avec la couleur de son filtre (ou en gris)
    const out = creerImg(im.l, im.h, 3);
    const echelle = cle === 'raw' ? 1 / (RAW_DEFAUT.gain * RAW_DEFAUT.electronsBlanc + RAW_DEFAUT.noir) : 1 / (RAW_DEFAUT.gain * RAW_DEFAUT.electronsBlanc);
    for (let y = 0; y < im.h; y++)
      for (let x = 0; x < im.l; x++) {
        const v = im.d[y * im.l + x] * echelle;
        const c = canalBayer(x, y);
        for (let k = 0; k < 3; k++) out.d[(y * im.l + x) * 3 + k] = k === c ? v : v * 0.12;
      }
    return out;
  }
  const affichage = (cle: keyof EtapesISP) => (cle === 'srgb' || cle === 'jpeg' ? 'lineaire' : 'srgb') as 'srgb' | 'lineaire';

  function zoom(im: Img): Img {
    const Z = 40, H = 30, x0 = 152, y0 = 86;
    const out = creerImg(Z, H, 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < Z; x++) for (let k = 0; k < 3; k++) out.d[(y * Z + x) * 3 + k] = im.d[((y0 + y) * im.l + x0 + x) * 3 + k];
    return out;
  }

  onMount(() => {
    requestAnimationFrame(() => {
      const e = pipeline(scenePaysage(240, 180));
      etapes = e;
      vignettes = ETAPES.map((s) => apercu(s.cle, e));
    });
  });
  const courante = $derived(vignettes[i] ? (loupe ? zoom(vignettes[i]) : vignettes[i]) : undefined);
</script>

<Panneau>
  {#snippet figure()}
    <div class="principal">
      <div class="vue">
        <Toile image={courante} affichage={affichage(ETAPES[i].cle)} />
      </div>
      <div class="texte">
        <p class="num">Étape {i + 1} / {ETAPES.length}</p>
        <h4>{ETAPES[i].t}</h4>
        <p>{ETAPES[i].d}</p>
      </div>
    </div>
    <ol class="pellicule" aria-label="Étapes de la chaîne">
      {#each ETAPES as s, k}
        <li>
          <button type="button" class:actif={k === i} onclick={() => (i = k)} aria-label={`Étape ${k + 1} : ${s.t}`}>
            <Toile image={vignettes[k]} affichage={affichage(s.cle)} lisse seul />
            <span>{k + 1}. {s.t}</span>
          </button>
        </li>
      {/each}
    </ol>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Vue" bind:value={loupe} options={[{ valeur: false, texte: 'Image entière' }, { valeur: true, texte: 'Loupe × 6 (pixels)' }]} />
  {/snippet}
</Panneau>

<style>
  .principal { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 1.2rem; padding: 1rem 1.1rem 0.5rem; align-items: center; }
  @media (max-width: 620px) { .principal { grid-template-columns: 1fr; } }
  .num { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
  h4 { margin: 0.2rem 0 0.4rem; font-family: var(--f-titre); font-weight: 500; font-size: 1.35rem; }
  .texte p { font-size: 0.95rem; color: var(--encre-2); margin: 0; line-height: 1.5; }
  .pellicule { list-style: none; margin: 0; padding: 0.6rem 1.1rem 0.9rem; display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 0.45rem; overflow-x: auto; }
  @media (max-width: 620px) { .pellicule { grid-template-columns: repeat(10, 5.2rem); } }
  .pellicule button { width: 100%; border: 1px solid var(--filet); background: var(--papier); border-radius: 8px; padding: 3px 3px 4px; cursor: pointer; display: flex; flex-direction: column; gap: 3px; transition: border-color 0.2s, transform 0.2s; }
  .pellicule button:hover { border-color: var(--accent); transform: translateY(-2px); }
  .pellicule button.actif { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent); }
  .pellicule span { font-size: 0.68rem; color: var(--encre-2); line-height: 1.2; text-align: left; }
</style>
