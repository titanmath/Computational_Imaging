<script lang="ts">
  // Champ neuronal 1D entraîné en direct sur UNE mesure bruitée (aucune donnée d'entraînement externe).
  // Courbes : PSNR par rapport à la mesure (l'ajustement, qui monte toujours) et par rapport au signal propre
  // (inconnu en pratique), qui monte puis redescend quand le réseau se met à recopier le bruit.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { creerChamp } from '@/lib/sim/champNeuronal';
  import { signalMorceaux } from '@/lib/sim/scenes';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  const n = 160;
  const MAX = 800;
  const x = Float64Array.from(signalMorceaux(n));
  const u = Float64Array.from({ length: n }, (_, i) => i / n);
  let sigma = $state(6);
  let bruit = $state(0.08);
  let enCours = $state(false);
  let b = $state(new Float64Array(n));
  let pred = $state(new Float64Array(n));
  let meilleur = $state({ it: 0, psnr: 0, pred: new Float64Array(n) });
  let histo = $state<{ it: number; propre: number; mesure: number }[]>([]);
  let iteration = $state(0);
  let champ: ReturnType<typeof creerChamp>;
  let raf = 0;
  let racine: HTMLElement;
  let visible = true;
  const p = (a: ArrayLike<number>, ref: ArrayLike<number>) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += (a[i] - ref[i]) ** 2;
    return 10 * Math.log10(n / Math.max(1e-12, s));
  };

  function initialiser() {
    cancelAnimationFrame(raf);
    const a = creerAlea(3);
    b = Float64Array.from(x, (v) => v + bruit * gauss(a));
    champ = creerChamp(u, b, { sigma, graine: 7, pas: 2.5e-3 });
    pred = champ.predire();
    iteration = 0;
    histo = [];
    meilleur = { it: 0, psnr: p(pred, x), pred };
    enCours = true;
    raf = requestAnimationFrame(boucle);
  }
  function boucle() {
    if (!enCours) return;
    if (visible) {
      for (let k = 0; k < 4; k++) champ.pas();
      iteration = champ.iteration;
      pred = champ.predire();
      const pp = p(pred, x);
      histo = [...histo, { it: iteration, propre: pp, mesure: p(pred, b) }];
      if (pp > meilleur.psnr) meilleur = { it: iteration, psnr: pp, pred };
    }
    if (iteration >= MAX) enCours = false;
    else raf = requestAnimationFrame(boucle);
  }
  onMount(() => {
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(racine);
    initialiser();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  });
  let attente: ReturnType<typeof setTimeout> | undefined;
  let premier = true;
  $effect(() => {
    void sigma, bruit;
    if (premier) {
      premier = false;
      return;
    }
    clearTimeout(attente);
    attente = setTimeout(initialiser, 150);
  });
  const X = (i: number) => 30 + (i / (n - 1)) * 380;
  const Y = (v: number) => 190 - v * 160;
  const ch = (s: ArrayLike<number>) => Array.from(s, (v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  // courbes PSNR : x = itération (0…MAX), y = 15…45 dB
  const PX = (it: number) => 450 + (it / MAX) * 170;
  const PY = (d: number) => 190 - ((Math.min(45, Math.max(15, d)) - 15) / 30) * 160;
  const courbe = (k: 'propre' | 'mesure') => histo.map((h, i) => `${i ? 'L' : 'M'}${PX(h.it).toFixed(1)},${PY(h[k]).toFixed(1)}`).join(' ');
</script>

<div bind:this={racine}>
  <Panneau note={`Itération ${iteration} / ${MAX}. Meilleur PSNR par rapport au signal propre : ${meilleur.psnr.toFixed(1)} dB à l’itération ${meilleur.it} (mesure : ${p(b, x).toFixed(1)} dB). En pratique on ne connaît pas le signal propre : il faut décider quand s’arrêter sans lui (nombre d’itérations fixé, validation…).`}>
    {#snippet figure()}
      <svg viewBox="0 0 640 230" role="img" aria-label="Ajustement d'un champ neuronal et courbes de PSNR">
        <path d={ch(b)} class="bruite" />
        <path d={ch(x)} class="propre" />
        <path d={ch(meilleur.pred)} class="best" />
        <path d={ch(pred)} class="pred" />
        <text x="30" y="222" class="g">— mesure  </text>
        <text x="92" y="222" class="g pr">— propre</text>
        <text x="152" y="222" class="g ac">— F_θ(u) actuel</text>
        <text x="250" y="222" class="g be">- - meilleur arrêt</text>
        <!-- PSNR -->
        {#each [20, 30, 40] as d}<line x1="450" x2="620" y1={PY(d)} y2={PY(d)} class="grille" /><text x="446" y={PY(d) + 4} class="g d">{d}</text>{/each}
        <line x1={PX(meilleur.it)} x2={PX(meilleur.it)} y1="30" y2="190" class="arret" />
        <path d={courbe('mesure')} class="cm" />
        <path d={courbe('propre')} class="cp" />
        <text x="452" y="20" class="g">PSNR (dB) au fil des itérations</text>
        <text x="620" y="206" class="g d">itérations →</text>
        <text x="620" y="222" class="g d"><tspan class="tm">vs mesure</tspan> · <tspan class="tp">vs propre</tspan></text>
      </svg>
    {/snippet}
    {#snippet controles()}
      <Curseur label="Échelle des fréquences de Fourier σ" bind:value={sigma} min={1} max={30} step={1} />
      <Curseur label="Bruit de la mesure" bind:value={bruit} min={0.02} max={0.2} step={0.01} format={(v) => v.toFixed(2)} />
    {/snippet}
    {#snippet lecture()}
      <Bouton principal onclick={() => { if (enCours) enCours = false; else if (iteration < MAX) { enCours = true; raf = requestAnimationFrame(boucle); } else initialiser(); }}>
        {enCours ? 'Pause' : iteration >= MAX ? 'Recommencer' : 'Reprendre'}
      </Bouton>
      <Bouton onclick={initialiser}>Réinitialiser le réseau</Bouton>
    {/snippet}
  </Panneau>
</div>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.7rem 0.8rem 0.2rem; font-family: var(--f-texte); }
  .bruite { fill: none; stroke: var(--encre-3); stroke-width: 1; opacity: 0.5; }
  .propre { fill: none; stroke: var(--encre); stroke-width: 1.5; }
  .pred { fill: none; stroke: var(--accent); stroke-width: 2.2; }
  .best { fill: none; stroke: #3a78b5; stroke-width: 1.6; stroke-dasharray: 5 3; }
  .grille { stroke: var(--filet); }
  .arret { stroke: #3a78b5; stroke-dasharray: 3 3; }
  .cm { fill: none; stroke: var(--encre-3); stroke-width: 1.8; }
  .cp { fill: none; stroke: var(--accent); stroke-width: 2.2; }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .pr { fill: var(--encre); }
  .ac, .tp { fill: var(--accent); }
  .be { fill: #3a78b5; }
</style>
