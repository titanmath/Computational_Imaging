<script lang="ts">
  // Tâche 2 de l'A2 : une même PSF mesurée de deux façons. (1) Bord incliné : ROI 64 × 64, ESF suréchantillonnée
  // ×4 (dx ≈ 0,25 px), LSF = dESF/du normalisée, FWHM. (2) Source ponctuelle : tache 2D projetée parallèlement au bord.
  // On peut fausser la mesure comme en vrai : CRF non corrigée (JPEG), source trop grosse, source saturée, bruit.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { analyserBord, imageBord, imagePoint, projeterPoint, psfSysteme, type TypePSF } from '@/lib/sim/bordIncline';
  import { crfTelephone } from '@/lib/sim/hdr';
  import { creerImg } from '@/lib/sim/image';

  let type = $state<TypePSF>('stenope');
  let taillePSF = $state(1.4);
  let angle = $state(5);
  let bruit = $state(0.004);
  let source = $state(0.3);
  let surexpo = $state(1);
  let crf = $state<'lineaire' | 'jpeg'>('lineaire');
  const N = 64, NP = 48;
  const psf = $derived(psfSysteme(type, taillePSF));
  // chaîne de mesure : capteur (saturation à 1) → éventuellement CRF du téléphone (valeurs 8 bits / 255)
  const mesurer = (v: number) => {
    const s = Math.min(1, Math.max(0, v));
    return crf === 'jpeg' ? crfTelephone(s, 1) / 255 : s;
  };
  const bord = $derived(imageBord(N, N, angle, psf, { bruit, graine: 3 }).map(mesurer));
  const point = $derived(imagePoint(NP, NP, psf, source, { bruit, graine: 5, blanc: surexpo }).map(mesurer));
  const res = $derived(analyserBord(bord, N, N));
  const proj = $derived(projeterPoint(point, NP, NP, res.angleDeg));
  const vueBord = $derived.by(() => {
    const im = creerImg(N, N, 1);
    im.d.set(bord);
    return im;
  });
  const vuePoint = $derived.by(() => {
    const im = creerImg(NP, NP, 1);
    const m = Math.max(...point);
    for (let i = 0; i < point.length; i++) im.d[i] = point[i] / m;
    return im;
  });
  const sature = $derived(point.filter((v) => v >= 0.999).length);

  // graphes : u ∈ [−8, 8] px
  const UX = (u: number) => 40 + ((u + 8) / 16) * 270;
  const EY = (v: number) => 150 - v * 125;
  const esfChemin = $derived(Array.from(res.esf, (v, k) => `${k ? 'L' : 'M'}${UX(res.u[k]).toFixed(1)},${EY(v).toFixed(1)}`).join(' '));
  const lmax = $derived(Math.max(...res.lsf, ...proj.profil) * 1.1);
  const LY = (v: number) => 150 - (v / lmax) * 125;
  const lsfChemin = $derived(
    Array.from(res.lsf, (v, k) => [res.u[k], v] as const)
      .filter(([u]) => u > -8 && u < 8)
      .map(([u, v], i) => `${i ? 'L' : 'M'}${(UX(u) + 330).toFixed(1)},${LY(v).toFixed(1)}`)
      .join(' '),
  );
  const projChemin = $derived(
    Array.from(proj.profil, (v, k) => [proj.u[k], v] as const)
      .filter(([u]) => u > -8 && u < 8)
      .map(([u, v], i) => `${i ? 'L' : 'M'}${(UX(u) + 330).toFixed(1)},${LY(v).toFixed(1)}`)
      .join(' '),
  );
  const f2 = (v: number) => v.toFixed(2).replace('.', ',');
  // droite du bord ajustée, en coordonnées de la ROI
  const ligne = $derived({ x1: res.b, y1: 0, x2: res.a * N + res.b, y2: N });
</script>

<Panneau note={`Bord : angle estimé ${f2(res.angleDeg)}°, dx = ${res.dx.toFixed(3).replace('.', ',')} px, FWHM = ${f2(res.fwhm)} px. Source ponctuelle projetée : FWHM = ${f2(proj.fwhm)} px${sature ? ` (${sature} pixels saturés !)` : ''}. Écart : ${f2(Math.abs(res.fwhm - proj.fwhm))} px. La projection de la tache se fait sur des cases de 1 px : elle n’a pas le suréchantillonnage du bord.`}>
  {#snippet figure()}
    <div class="g">
      <div class="images">
        <figure class="roi">
          <Toile image={vueBord} affichage="lineaire" seul />
          <svg viewBox={`0 0 ${N} ${N}`} aria-hidden="true"><line x1={ligne.x1} y1={ligne.y1} x2={ligne.x2} y2={ligne.y2} class="ajuste" /></svg>
          <figcaption>Bord capturé (ROI {N} × {N}) et droite ajustée</figcaption>
        </figure>
        <figure>
          <Toile image={vuePoint} affichage="lineaire" seul />
          <figcaption>Source ponctuelle (contraste étiré)</figcaption>
        </figure>
      </div>
      <svg class="graphes" viewBox="0 0 660 190" role="img" aria-label="ESF suréchantillonnée, LSF du bord et profil projeté de la source ponctuelle">
        <!-- ESF -->
        <line x1="40" x2="310" y1={EY(0)} y2={EY(0)} class="axe" />
        {#each res.nuage as p}{#if p.u > -8 && p.u < 8}<circle cx={UX(p.u)} cy={EY(p.v)} r="1.1" class="pt" />{/if}{/each}
        <path d={esfChemin} class="esf" />
        <text x="44" y="14" class="t">ESF suréchantillonnée (cases de {f2(res.dx)} px)</text>
        <text x="310" y="184" class="t d">distance au bord u (px)</text>
        <!-- LSF -->
        <line x1="370" x2="640" y1={LY(0)} y2={LY(0)} class="axe" />
        <path d={projChemin} class="proj" />
        <path d={lsfChemin} class="lsf" />
        <text x="374" y="14" class="t">PSF 1D : <tspan class="tl">bord (dESF/du)</tspan> · <tspan class="tp">source projetée</tspan></text>
        <text x="640" y="184" class="t d">u (px)</text>
        {#each [-6, -3, 0, 3, 6] as u}<text x={UX(u)} y="164" class="t m">{u}</text><text x={UX(u) + 330} y="164" class="t m">{u}</text>{/each}
      </svg>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="PSF du système" bind:value={type} options={[{ valeur: 'stenope', texte: 'Sténopé' }, { valeur: 'gauss', texte: 'Gaussienne' }, { valeur: 'aniso', texte: 'Anisotrope' }]} />
    <Curseur label="Taille de la PSF" bind:value={taillePSF} min={0.5} max={3} step={0.05} unite="px" format={(v) => v.toFixed(2)} />
    <Curseur label="Inclinaison du bord" bind:value={angle} min={1} max={15} step={0.5} unite="°" format={(v) => v.toFixed(1)} />
    <Bascule label="Valeurs analysées" bind:value={crf} options={[{ valeur: 'lineaire', texte: 'Linéarisées (CRF corrigée)' }, { valeur: 'jpeg', texte: 'JPEG brut' }]} />
    <Curseur label="Diamètre de la source" bind:value={source} min={0.1} max={6} step={0.1} unite="px" format={(v) => v.toFixed(1)} />
    <Curseur label="Surexposition de la source" bind:value={surexpo} min={1} max={12} step={0.5} format={(v) => '×' + v.toFixed(1)} />
    <Curseur label="Bruit" bind:value={bruit} min={0} max={0.03} step={0.001} format={(v) => v.toFixed(3)} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 0.55fr) minmax(0, 1.45fr); gap: 1rem; padding: 1rem 1.1rem 0.3rem; align-items: center; }
  @media (max-width: 680px) { .g { grid-template-columns: 1fr; } }
  .images { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  figure { margin: 0; position: relative; }
  figure :global(canvas) { width: 100%; height: auto; display: block; border-radius: 4px; }
  .roi svg { position: absolute; top: 0; left: 0; width: 100%; height: auto; aspect-ratio: 1; pointer-events: none; }
  .ajuste { stroke: #3cffc0; stroke-width: 0.5; stroke-dasharray: 2 1.5; }
  figcaption { font-size: 0.74rem; color: var(--encre-3); text-align: center; margin-top: 0.3rem; line-height: 1.3; }
  .graphes { width: 100%; height: auto; font-family: var(--f-texte); }
  .axe { stroke: var(--filet-fort); }
  .pt { fill: var(--encre-3); opacity: 0.35; }
  .esf { fill: none; stroke: var(--encre); stroke-width: 1.8; }
  .lsf { fill: none; stroke: var(--accent); stroke-width: 2.2; }
  .proj { fill: none; stroke: #3a78b5; stroke-width: 2; stroke-dasharray: 5 3; }
  .t { font-size: 10.5px; fill: var(--encre-3); }
  .t.d { text-anchor: end; }
  .t.m { text-anchor: middle; }
  .tl { fill: var(--accent); }
  .tp { fill: #3a78b5; }
</style>
