<script lang="ts">
  // TV isotrope ‖∇x(p)‖₂ vs anisotrope |D_h x| + |D_v x| : à gauche, un gradient déplaçable et ses deux coûts
  // (cercle vs losange de même coût) ; à droite, l'effet sur une image : l'anisotrope préfère les bords
  // horizontaux / verticaux et « équarrit » les formes rondes ou obliques quand λ est fort.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import Toile from '../ui/Toile.svelte';
  import { tvDebruitage } from '@/lib/sim/priors';
  import { bruiter, versImg } from '@/lib/sim/imageTest';
  import type { Img } from '@/lib/sim/image';

  let g = $state([3, 4]);
  let lambda = $state(0.3);
  const iso = $derived(Math.hypot(g[0], g[1]));
  const aniso = $derived(Math.abs(g[0]) + Math.abs(g[1]));
  // repère : 1 unité = 16 px, origine (130, 130) ; le losange de coût 7,5 tient dans le cadre
  const S = 16, O = 130;
  let svg: SVGSVGElement;
  let glisse = false;
  function depuis(e: PointerEvent) {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    g = [Math.round(((pt.x - O) / S) * 2) / 2, Math.round(((O - pt.y) / S) * 2) / 2].map((v) => Math.max(-5.5, Math.min(5.5, v)));
  }
  function touche(e: KeyboardEvent) {
    const d: Record<string, [number, number]> = { ArrowRight: [0.5, 0], ArrowLeft: [-0.5, 0], ArrowUp: [0, 0.5], ArrowDown: [0, -0.5] };
    if (!d[e.key]) return;
    e.preventDefault();
    g = [Math.max(-5.5, Math.min(5.5, g[0] + d[e.key][0])), Math.max(-5.5, Math.min(5.5, g[1] + d[e.key][1]))];
  }

  // image test 128 × 128 : disque, losange (bords à 45°) et rectangle aligné
  const N = 128;
  const propre = new Float64Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let v = 0.2;
      if (Math.hypot(x - 36, y - 40) < 22) v = 0.8;
      if (Math.abs(x - 92) + Math.abs(y - 40) < 24) v = 0.65;
      if (x > 20 && x < 108 && y > 82 && y < 108) v = 0.55;
      propre[y * N + x] = v;
    }
  const b = bruiter(propre, 0.1, 6);
  let vues = $state<{ b?: Img; iso?: Img; aniso?: Img }>({ b: versImg(b, N, N) });
  let calcul = $state(false);
  function calculer() {
    calcul = true;
    requestAnimationFrame(() => {
      const a = tvDebruitage(b, N, N, lambda, true), c = tvDebruitage(b, N, N, lambda, false);
      for (let k = 0; k < 350; k++) {
        a.pas();
        c.pas();
      }
      vues = { b: vues.b, iso: versImg(a.x, N, N), aniso: versImg(c.x, N, N) };
      calcul = false;
    });
  }
  onMount(calculer);
  let attente: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void lambda;
    clearTimeout(attente);
    attente = setTimeout(calculer, 150);
  });
</script>

<Panneau note="À gauche : fais glisser la pointe du gradient (ou flèches du clavier). Le cercle réunit tous les gradients de même coût isotrope, le losange ceux de même coût anisotrope. Un gradient oblique coûte plus cher en anisotrope : (3, 4) coûte 5 ou 7, alors que (5, 0) coûte 5 dans les deux cas.">
  {#snippet figure()}
    <div class="g">
      <svg bind:this={svg} viewBox="0 0 260 304" role="group" aria-label="Gradient déplaçable et coûts isotrope et anisotrope">
        {#each [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7] as k}
          <line x1={O + k * S} x2={O + k * S} y1={O - 7.5 * S} y2={O + 7.5 * S} class="grille" />
          <line y1={O + k * S} y2={O + k * S} x1={O - 7.5 * S} x2={O + 7.5 * S} class="grille" />
        {/each}
        <line x1={O - 7.5 * S} x2={O + 7.5 * S} y1={O} y2={O} class="axe" />
        <line y1={O - 7.5 * S} y2={O + 7.5 * S} x1={O} x2={O} class="axe" />
        <circle cx={O} cy={O} r={iso * S} class="iso" />
        <path d={`M${O + aniso * S},${O} L${O},${O - aniso * S} L${O - aniso * S},${O} L${O},${O + aniso * S} Z`} class="aniso" />
        <line x1={O} y1={O} x2={O + g[0] * S} y2={O - g[1] * S} class="vec" />
        <line x1={O} y1={O - g[1] * S} x2={O + g[0] * S} y2={O - g[1] * S} class="comp" />
        <line x1={O + g[0] * S} y1={O} x2={O + g[0] * S} y2={O - g[1] * S} class="comp" />
        <circle
          cx={O + g[0] * S} cy={O - g[1] * S} r="9" class="poignee" tabindex="0" role="slider"
          aria-label="Gradient ∇x(p)" aria-valuetext={`(${g[0]}, ${g[1]})`} aria-valuenow={g[0]}
          onpointerdown={(e) => { glisse = true; (e.currentTarget as Element).setPointerCapture(e.pointerId); }}
          onpointermove={(e) => glisse && depuis(e)} onpointerup={() => (glisse = false)} onkeydown={touche}
        />
        <text x="10" y="270" class="t">∇x(p) = ({g[0]} ; {g[1]})</text>
        <text x="10" y="284" class="t iso-t">isotrope √(gₓ² + gᵧ²) = {iso.toFixed(2)}</text>
        <text x="10" y="298" class="t aniso-t">anisotrope |gₓ| + |gᵧ| = {aniso.toFixed(1)}</text>
      </svg>
      <div class="images">
        <Toile image={vues.b} affichage="lineaire" etiquette="Mesure bruitée" />
        <Toile image={vues.iso} affichage="lineaire" etiquette="TV isotrope" />
        <Toile image={vues.aniso} affichage="lineaire" etiquette={calcul ? 'calcul…' : 'TV anisotrope'} />
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Force λ (images)" bind:value={lambda} min={0.02} max={0.6} log format={(v) => v.toFixed(3)} />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => (g = [3, 4])}>(3, 4)</Bouton>
    <Bouton onclick={() => (g = [5, 0])}>(5, 0)</Bouton>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 1rem; padding: 1rem 1.1rem 0.3rem; align-items: center; }
  @media (max-width: 640px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; max-width: 22rem; margin-inline: auto; height: auto; display: block; font-family: var(--f-texte); touch-action: none; }
  .images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
  .grille { stroke: var(--filet); }
  .axe { stroke: var(--encre-3); }
  .iso { fill: color-mix(in oklch, var(--accent) 10%, transparent); stroke: var(--accent); stroke-width: 2; }
  .aniso { fill: none; stroke: #3a78b5; stroke-width: 2; }
  .vec { stroke: var(--encre); stroke-width: 2.4; }
  .comp { stroke: var(--encre-3); stroke-dasharray: 3 3; }
  .poignee { fill: var(--encre); stroke: var(--papier); stroke-width: 2; cursor: grab; outline: none; }
  .poignee:focus-visible { stroke: var(--accent); stroke-width: 3; }
  .t { font-size: 11px; fill: var(--encre-3); }
  .iso-t { fill: var(--accent); }
  .aniso-t { fill: #3a78b5; }
</style>
