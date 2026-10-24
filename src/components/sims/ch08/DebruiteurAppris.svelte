<script lang="ts">
  // Le plus petit « réseau » débruiteur : un seul filtre linéaire F_θ(b) = θ ∗ b, appris sur des paires
  // (bruitée, propre) par moindres carrés : min_θ (1/M) Σ ‖θ ∗ b_i − x_i‖². Aucun terme d'a priori explicite :
  // l'a priori est dans les données. On le teste sur une AUTRE image, et on compare à la TV.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { MoindresCarres } from '@/lib/sim/linalg';
  import Bascule from '../ui/Bascule.svelte';
  import { panorama, paysageProfondeur } from '@/lib/sim/scenes';
  import { versGris } from '@/lib/sim/image';
  import { encoderSrgb } from '@/lib/sim/couleur';
  import { tvDebruitage } from '@/lib/sim/priors';
  import { divergente } from '@/lib/sim/colormaps';
  import { bruiter, H, imageGrise, L, psnr, versImg } from '@/lib/sim/imageTest';
  import type { Img } from '@/lib/sim/image';

  let taille = $state(5);
  let paires = $state(3);
  let bruit = $state(0.1);
  let base = $state<'sapins' | 'variee' | 'meme'>('sapins');
  const enGris = (d: ArrayLike<number>) => Float64Array.from(d, (v) => encoderSrgb(v));
  const sapins = enGris(versGris(paysageProfondeur(L, H).rgb).d);
  const pano = (() => {
    const g = versGris(panorama(1400, 280)).d, out = new Float64Array(L * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) out[y * L + x] = encoderSrgb(g[(y + 120) * 1400 + x + 560]);
    return out;
  })();
  // textures fines (rayures de fréquence croissante, comme du texte ou des briques)
  const textures = Float64Array.from({ length: L * H }, (_, k) => {
    const x = k % L, y = Math.floor(k / L), f = 0.15 + (x / L) * 1.4;
    return 0.5 + 0.3 * Math.sign(Math.sin(f * x + 0.3 * y)) * (y % 32 < 16 ? 1 : 0.5) + 0.1 * Math.sin(y * 0.4);
  });
  const test = imageGrise();
  const SOURCES = { sapins: [sapins], variee: [sapins, pano, textures], meme: [test] };
  let theta = $state<Float64Array>(new Float64Array(25));
  let res = $state<{ b?: Img; f?: Img; tv?: Img; pb: number; pf: number; ptv: number }>({ pb: 0, pf: 0, ptv: 0 });

  function filtrer(b: Float64Array, th: Float64Array, t: number) {
    const r = (t - 1) / 2, out = new Float64Array(L * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < L; x++) {
        let s = 0;
        for (let j = 0; j < t; j++)
          for (let i = 0; i < t; i++) {
            const yy = Math.min(H - 1, Math.max(0, y + j - r)), xx = Math.min(L - 1, Math.max(0, x + i - r));
            s += th[j * t + i] * b[yy * L + xx];
          }
        out[y * L + x] = s;
      }
    return out;
  }
  function entrainer() {
    const t = taille, r = (t - 1) / 2, n = t * t;
    const mc = new MoindresCarres(n);
    const idx = Array.from({ length: n }, (_, k) => k);
    const patch = new Array<number>(n);
    for (let m = 0; m < paires; m++) {
      const sources = SOURCES[base];
      const entrainement = sources[m % sources.length];
      const b = bruiter(entrainement, bruit, 100 + m);
      for (let y = r; y < H - r; y += 2)
        for (let x = r + (m % 2); x < L - r; x += 2) {
          for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) patch[j * t + i] = b[(y + j - r) * L + x + i - r];
          mc.ajouter(idx, patch, entrainement[y * L + x]);
        }
    }
    theta = mc.resoudre();
    const bt = bruiter(test, bruit, 7);
    const f = filtrer(bt, theta, t);
    const tv = tvDebruitage(bt, L, H, 0.07 * (bruit / 0.1), true);
    for (let k = 0; k < 150; k++) tv.pas();
    res = { b: versImg(bt), f: versImg(f), tv: versImg(tv.x), pb: psnr(bt, test), pf: psnr(f, test), ptv: psnr(tv.x, test) };
  }
  onMount(entrainer);
  let attente: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void taille, paires, bruit, base;
    clearTimeout(attente);
    attente = setTimeout(entrainer, 120);
  });
  const maxAbs = $derived(Math.max(1e-6, ...Array.from(theta, Math.abs)));
  const couleur = (v: number) => {
    const [r, g, b] = divergente(0.5 + v / (2 * maxAbs));
    return `rgb(${r},${g},${b})`;
  };
</script>

<Panneau note={`${paires} paire${paires > 1 ? 's' : ''} d’entraînement ; test sur le paysage à la maison${base === 'meme' ? ' (ici aussi utilisé pour l’entraînement : c’est de la triche, le score est trop optimiste)' : ', jamais vu'}. Le filtre appris (${taille} × ${taille} poids θ) est un flou : un débruiteur linéaire ne peut que moyenner, bords compris. Entraîné sur une seule image trop différente (sapins, grands aplats), il floute trop ; une base variée, avec des textures fines, approche le meilleur filtre linéaire. Les réseaux profonds (RED30 : 30 couches, des millions de poids) apprennent des fonctions non linéaires, mais restent tributaires de leurs données.`}>
  {#snippet figure()}
    <div class="g">
      <figure class="noyau">
        <svg viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label="Poids du filtre appris">
          {#each theta as v, k}<rect x={k % taille} y={Math.floor(k / taille)} width="0.96" height="0.96" fill={couleur(v)} />{/each}
        </svg>
        <figcaption>Poids appris θ<br /><small>centre {theta[(taille * taille - 1) / 2]?.toFixed(3)} · somme {theta.reduce((s, v) => s + v, 0).toFixed(3)}</small></figcaption>
      </figure>
      <Toile image={res.b} affichage="lineaire" etiquette={`Test bruité · ${res.pb.toFixed(1)} dB`} lisse />
      <Toile image={res.f} affichage="lineaire" etiquette={`Filtre appris · ${res.pf.toFixed(1)} dB`} lisse />
      <Toile image={res.tv} affichage="lineaire" etiquette={`TV (λ fixé) · ${res.ptv.toFixed(1)} dB`} lisse />
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Base d’entraînement" bind:value={base} options={[{ valeur: 'sapins', texte: 'Une autre image' }, { valeur: 'variee', texte: 'Base variée' }, { valeur: 'meme', texte: 'L’image test (triche)' }]} />
    <Curseur label="Taille du filtre" bind:value={taille} min={1} max={9} step={2} format={(v) => `${v} × ${v}`} />
    <Curseur label="Paires d’entraînement M" bind:value={paires} min={1} max={6} step={1} />
    <Curseur label="Bruit σ" bind:value={bruit} min={0.02} max={0.2} step={0.01} format={(v) => v.toFixed(2)} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: 7rem repeat(3, minmax(0, 1fr)); gap: 0.8rem; padding: 1rem 1.1rem 0.3rem; align-items: start; }
  @media (max-width: 700px) { .g { grid-template-columns: 1fr 1fr; } }
  .noyau { margin: 0; }
  .noyau svg { width: 100%; height: auto; display: block; border-radius: 4px; shape-rendering: crispEdges; }
  figcaption { margin-top: 0.4rem; font-size: 0.82rem; color: var(--encre-3); text-align: center; }
  small { font-size: 0.72rem; font-variant-numeric: tabular-nums; }
</style>
