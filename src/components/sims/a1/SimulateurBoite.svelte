<script lang="ts">
  // A1 : dimensionner une caméra sténopé. Entrées : longueur de la boîte (= focale f), écran, diamètre d,
  // longueur d'onde, distance de l'objet. Sorties : champ de vision, focale équivalente 24 × 36, flous
  // géométrique / de diffraction / total, diamètre optimal, luminosité relative et ISO nécessaire à temps fixé.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';

  let f = $state(26); // cm
  let lEcran = $state(19); // cm
  let hEcran = $state(15); // cm
  let d = $state(1); // mm
  let lambda = $state(550); // nm
  let s = $state(10); // m
  const fmm = $derived(f * 10);
  const lam = $derived(lambda * 1e-6); // mm
  const geo = $derived(1 + f / 100 / s); // (s + f)/s
  const bg = $derived(d * geo);
  const bd = $derived((2.44 * lam * fmm) / d);
  const b = $derived(bg + bd);
  const dopt = $derived(Math.sqrt((2.44 * lam * fmm) / geo));
  const bmin = $derived(2 * Math.sqrt(2.44 * lam * fmm * geo));
  const deg = (r: number) => (r * 180) / Math.PI;
  const fovH = $derived(deg(2 * Math.atan(lEcran / (2 * f))));
  const fovV = $derived(deg(2 * Math.atan(hEcran / (2 * f))));
  const diag = $derived(Math.hypot(lEcran, hEcran));
  const f35 = $derived((fmm * 43.27) / (diag * 10));
  const nombreF = $derived(fmm / d);
  // luminosité de l'écran ∝ (d / f)² ; référence : d = 1 mm, f = 26 cm, ISO 500 à 30 s (scène de jour)
  const relatif = $derived((d / fmm) ** 2 / (1 / 260) ** 2);
  const iso = $derived(500 / relatif);
  const points = $derived((lEcran * 10) / b);
  const vignette = $derived(Math.cos(Math.atan(lEcran / (2 * f))) ** 4 * 100);

  // courbe log-log des flous en fonction de d ∈ [0,02 ; 10] mm
  const X = (v: number) => 50 + ((Math.log10(v) + 1.7) / 2.7) * 380;
  const Y = (v: number) => 200 - ((Math.log10(Math.max(v, 0.01)) + 2) / 4) * 180;
  const courbe = (fn: (x: number) => number) =>
    Array.from({ length: 121 }, (_, k) => {
      const x = Math.pow(10, -1.7 + (k / 120) * 2.7);
      return `${k ? 'L' : 'M'}${X(x).toFixed(1)},${Y(fn(x)).toFixed(1)}`;
    }).join(' ');
  const cG = $derived(courbe((x) => x * geo));
  const cD = $derived(courbe((x) => (2.44 * lam * fmm) / x));
  const cT = $derived(courbe((x) => x * geo + (2.44 * lam * fmm) / x));
  const f2 = (v: number, n = 2) => v.toFixed(n).replace('.', ',');
  const regime = $derived(d < dopt * 0.8 ? 'diffraction' : d > dopt * 1.25 ? 'géométrie' : 'équilibre');
</script>

<Panneau note={`Hypothèses : trou centré, objet à ${s} m, λ = ${lambda} nm. Luminosité relative à un trou de 1 mm dans une boîte de 26 cm ; l’ISO indiqué garde la même image (même temps de pose) que ISO 500 pour cette référence.`}>
  {#snippet figure()}
    <div class="g">
      <svg viewBox="0 0 450 230" role="img" aria-label="Flous géométrique, de diffraction et total en fonction du diamètre">
        {#each [0.03, 0.1, 0.3, 1, 3, 10] as v}<line x1={X(v)} x2={X(v)} y1="20" y2="200" class="grille" /><text x={X(v)} y="214" class="t m">{String(v).replace('.', ',')}</text>{/each}
        {#each [0.01, 0.1, 1, 10, 100] as v}<line x1="50" x2="430" y1={Y(v)} y2={Y(v)} class="grille" /><text x="45" y={Y(v) + 4} class="t d">{String(v).replace('.', ',')}</text>{/each}
        <path d={cG} class="geo" />
        <path d={cD} class="dif" />
        <path d={cT} class="tot" />
        <line x1={X(dopt)} x2={X(dopt)} y1="20" y2="200" class="opt" />
        <circle cx={X(d)} cy={Y(b)} r="5" class="moi" />
        <text x="430" y="228" class="t d">diamètre du trou d (mm, log)</text>
        <text x="52" y="14" class="t">flou sur l’écran (mm, log) : <tspan class="tg">géométrique</tspan> · <tspan class="td">diffraction</tspan> · <tspan class="tt">total</tspan></text>
      </svg>
      <dl class="res">
        <div><dt>Champ de vision</dt><dd>{f2(fovH, 1)}° × {f2(fovV, 1)}°</dd></div>
        <div><dt>Focale équivalente 24 × 36</dt><dd>≈ {Math.round(f35)} mm</dd></div>
        <div><dt>Flou géométrique b<sub>g</sub></dt><dd>{f2(bg, 3)} mm</dd></div>
        <div><dt>Flou de diffraction b<sub>d</sub></dt><dd>{f2(bd, 3)} mm</dd></div>
        <div><dt>Flou total b</dt><dd>{f2(b, 3)} mm <small>({regime})</small></dd></div>
        <div><dt>Diamètre optimal</dt><dd>{f2(dopt, 3)} mm <small>(b<sub>min</sub> ≈ {f2(bmin, 2)} mm)</small></dd></div>
        <div><dt>Nombre d’ouverture f/d</dt><dd>f/{Math.round(nombreF)}</dd></div>
        <div><dt>Luminosité relative</dt><dd>×{relatif >= 10 ? Math.round(relatif) : f2(relatif)} <small>→ ISO ≈ {Math.round(iso)}</small></dd></div>
        <div><dt>« Points » sur la largeur</dt><dd>≈ {Math.round(points)}</dd></div>
        <div><dt>Vignetage au bord (cos⁴θ)</dt><dd>{Math.round(vignette)} %</dd></div>
      </dl>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Diamètre du trou d" bind:value={d} min={0.05} max={8} log step={0.01} unite="mm" format={(v) => f2(v)} />
    <Curseur label="Longueur de la boîte f" bind:value={f} min={5} max={60} step={0.5} unite="cm" />
    <Curseur label="Largeur de l’écran" bind:value={lEcran} min={5} max={40} step={0.5} unite="cm" />
    <Curseur label="Hauteur de l’écran" bind:value={hEcran} min={5} max={40} step={0.5} unite="cm" />
    <Curseur label="Longueur d’onde λ" bind:value={lambda} min={400} max={700} step={10} unite="nm" />
    <Curseur label="Distance de l’objet s" bind:value={s} min={0.5} max={100} log step={0.1} unite="m" format={(v) => f2(v, 1)} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => (d = Math.round(dopt * 100) / 100)}>Trou optimal</Bouton>
    <Bouton onclick={() => { f = 26; lEcran = 19; hEcran = 15; d = 1; lambda = 550; s = 10; }}>Boîte 26 × 19 × 15 cm</Bouton>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 1rem; padding: 1rem 1.1rem 0.3rem; align-items: center; }
  @media (max-width: 680px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .geo { fill: none; stroke: #3a78b5; stroke-width: 1.8; stroke-dasharray: 5 3; }
  .dif { fill: none; stroke: #e0453a; stroke-width: 1.8; stroke-dasharray: 5 3; }
  .tot { fill: none; stroke: var(--encre); stroke-width: 2.4; }
  .opt { stroke: var(--encre-3); stroke-dasharray: 2 3; }
  .moi { fill: var(--accent); stroke: var(--papier); stroke-width: 2; }
  .t { font-size: 10.5px; fill: var(--encre-3); }
  .t.m { text-anchor: middle; }
  .t.d { text-anchor: end; }
  .tg { fill: #3a78b5; }
  .td { fill: #e0453a; }
  .tt { fill: var(--encre); }
  .res { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; }
  .res div { min-width: 0; }
  dt { font-size: 0.72rem; letter-spacing: 0.04em; color: var(--encre-3); }
  dd { margin: 0; font-family: var(--f-titre); font-size: 1.02rem; font-variant-numeric: tabular-nums; }
  dd small { font-family: var(--f-texte); font-size: 0.74rem; color: var(--encre-3); }
</style>
