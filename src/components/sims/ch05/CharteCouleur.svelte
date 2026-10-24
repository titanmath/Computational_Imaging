<script lang="ts">
  // Calibration couleur : on ajuste une matrice 3 × 3 (RGB caméra linéaire → XYZ) sur 18 patchs d'une charte,
  // puis on valide sur 6 patchs mis de côté. Chaque case : en haut la référence, en bas la prédiction.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { decoderSrgb, encoderSrgb, xyzVersRgbLin } from '@/lib/sim/couleur';
  import { creerAlea, gauss } from '@/lib/sim/rng';
  import { inverser3 } from '@/lib/sim/isp';

  // Valeurs sRGB 8 bits approchées d'une charte ColorChecker classique (valeurs publiées usuelles)
  const SRGB = [
    [115, 82, 68], [194, 150, 130], [98, 122, 157], [87, 108, 67], [133, 128, 177], [103, 189, 170],
    [214, 126, 44], [80, 91, 166], [193, 90, 99], [94, 60, 108], [157, 188, 64], [224, 163, 46],
    [56, 61, 150], [70, 148, 73], [175, 54, 60], [231, 199, 31], [187, 86, 149], [8, 133, 161],
    [243, 243, 242], [200, 200, 200], [160, 160, 160], [122, 122, 121], [85, 85, 85], [52, 52, 52],
  ];
  const VALIDATION = new Set([2, 7, 11, 14, 18, 22]);
  const RGB_XYZ = [
    [0.4124, 0.3576, 0.1805],
    [0.2126, 0.7152, 0.0722],
    [0.0193, 0.1192, 0.9505],
  ];
  const mul = (M: number[][], v: number[]) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  // caméra : canaux qui se chevauchent (diaphonie) + gains différents
  const CAM = [
    [0.62, 0.32, 0.06],
    [0.18, 0.68, 0.14],
    [0.04, 0.3, 0.66],
  ];
  let mode = $state<'brut' | 'corrige'>('corrige');
  let bruit = $state(0.01);

  const donnees = $derived.by(() => {
    const a = creerAlea(17);
    return SRGB.map((s) => {
      const lin = s.map((v) => decoderSrgb(v / 255));
      const xyz = mul(RGB_XYZ, lin);
      const cam = mul(CAM, lin).map((v) => Math.max(0, v + bruit * gauss(a)));
      return { s, xyz, cam };
    });
  });
  // moindres carrés : M = argmin Σ ‖M c − x‖², ligne par ligne : M = X Cᵀ (C Cᵀ)⁻¹ sur l'ensemble d'entraînement
  const M = $derived.by(() => {
    const train = donnees.filter((_, i) => !VALIDATION.has(i));
    const CCt = [0, 1, 2].map((i) => [0, 1, 2].map((j) => train.reduce((s, d) => s + d.cam[i] * d.cam[j], 0)));
    const XCt = [0, 1, 2].map((i) => [0, 1, 2].map((j) => train.reduce((s, d) => s + d.xyz[i] * d.cam[j], 0)));
    const inv = inverser3(CCt);
    return XCt.map((r) => [0, 1, 2].map((j) => r[0] * inv[0][j] + r[1] * inv[1][j] + r[2] * inv[2][j]));
  });
  const blanc = mul(RGB_XYZ, [1, 1, 1]);
  const lab = (x: number[]) => {
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
    const [fx, fy, fz] = [f(x[0] / blanc[0]), f(x[1] / blanc[1]), f(x[2] / blanc[2])];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const css = (xyz: number[]) => `rgb(${xyzVersRgbLin(xyz).map((v) => Math.round(encoderSrgb(v) * 255)).join(',')})`;
  const resultats = $derived(
    donnees.map((d, i) => {
      // sans correction : on affiche le RGB caméra comme s'il était sRGB
      const pred = mode === 'corrige' ? mul(M, d.cam) : mul(RGB_XYZ, d.cam);
      const [a, b] = [lab(d.xyz), lab(pred)];
      return { ref: css(d.xyz), pred: css(pred), dE: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), val: VALIDATION.has(i) };
    }),
  );
  const moyEnt = $derived(resultats.filter((r) => !r.val).reduce((s, r) => s + r.dE, 0) / 18);
  const moyVal = $derived(resultats.filter((r) => r.val).reduce((s, r) => s + r.dE, 0) / 6);
</script>

<Panneau note="Cadre pointillé = patch de validation (jamais utilisé pour ajuster M). ΔE (CIELAB) < 2 : écart difficilement visible.">
  {#snippet figure()}
    <div class="charte">
      {#each resultats as r}
        <div class="case" class:val={r.val}>
          <span style={`background:${r.ref}`}></span>
          <span style={`background:${r.pred}`}></span>
          <em>{r.dE.toFixed(1)}</em>
        </div>
      {/each}
    </div>
    <p class="bilan">ΔE moyen : entraînement <b>{moyEnt.toFixed(2)}</b> · validation <b>{moyVal.toFixed(2)}</b></p>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Couleurs prédites" bind:value={mode} options={[{ valeur: 'brut', texte: 'RGB caméra brut' }, { valeur: 'corrige', texte: 'Matrice 3 × 3 ajustée' }]} />
    <Curseur label="Bruit de mesure" bind:value={bruit} min={0} max={0.05} step={0.002} format={(v) => (v * 100).toFixed(1) + ' %'} />
  {/snippet}
</Panneau>

<style>
  .charte { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; padding: 1rem 1.1rem 0.3rem; }
  .case { position: relative; border-radius: 6px; overflow: hidden; display: grid; grid-template-rows: 1fr 1fr; aspect-ratio: 1; border: 2px solid transparent; }
  .case.val { border: 2px dashed var(--encre-2); }
  .case span { display: block; }
  .case em { position: absolute; right: 3px; bottom: 2px; font-style: normal; font-size: 0.68rem; color: #fff; text-shadow: 0 0 3px #000; font-variant-numeric: tabular-nums; }
  .bilan { margin: 0.2rem 1.1rem 0.8rem; font-size: 0.9rem; color: var(--encre-2); }
</style>
