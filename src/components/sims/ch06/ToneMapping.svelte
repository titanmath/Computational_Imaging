<script lang="ts">
  // La radiance estimée et son apparence affichée sont deux choses : un opérateur global L_d = L/(1+L)
  // (Reinhard 2002) compresse les hautes lumières tout en gardant les ombres.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { radianceInterieur } from '@/lib/sim/scenes';
  import { creerImg, type Img } from '@/lib/sim/image';

  let cle = $state(0); // exposition (IL)
  let op = $state<'lineaire' | 'reinhard' | 'log'>('reinhard');
  let E: Img | undefined;
  let rendu: Img | undefined = $state();
  const L = 240, H = 150;
  const f = (x: number) => (op === 'lineaire' ? Math.min(1, x) : op === 'reinhard' ? x / (1 + x) : Math.log1p(x * 4) / Math.log1p(4 * 64));
  function calculer() {
    if (!E) return;
    const k = 0.8 * Math.pow(2, cle);
    const out = creerImg(L, H, 3);
    for (let i = 0; i < L * H; i++) {
      const lum = 0.2126 * E.d[3 * i] + 0.7152 * E.d[3 * i + 1] + 0.0722 * E.d[3 * i + 2];
      const Ls = lum * k;
      const Ld = f(Ls);
      // on applique le même rapport aux trois canaux (préserve la teinte)
      for (let c = 0; c < 3; c++) out.d[3 * i + c] = Math.min(1, (E.d[3 * i + c] * k * Ld) / Math.max(1e-6, Ls));
    }
    rendu = out;
  }
  onMount(() => {
    E = radianceInterieur(L, H);
    calculer();
  });
  $effect(() => {
    void cle, op;
    calculer();
  });
  const X = (x: number) => 30 + (x / 8) * 260;
  const Y = (y: number) => 150 - y * 130;
  const courbe = $derived(Array.from({ length: 161 }, (_, i) => (i / 160) * 8).map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(f(x)).toFixed(1)}`).join(' '));
</script>

<Panneau note="Opérateur appliqué à la luminance, puis même facteur sur R, G, B. La clé d’exposition fixe quelle luminance de la scène correspond à 1.">
  {#snippet figure()}
    <div class="g">
      <Toile image={rendu} lisse />
      <svg viewBox="0 0 300 170" role="img" aria-label="Courbe de tone mapping">
        <line x1="30" x2="290" y1="150" y2="150" class="axe" />
        <line x1="30" x2="30" y1="15" y2="150" class="axe" />
        <path d={courbe} class="c" />
        <text x="290" y="166" class="g d">luminance de la scène L (mise à l’échelle)</text>
        <text x="34" y="14" class="g">luminance affichée L_d</text>
        <text x="200" y={Y(0.5) - 6} class="g">{op === 'reinhard' ? 'L / (1 + L)' : op === 'lineaire' ? 'min(L, 1)' : 'log'}</text>
      </svg>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Clé d’exposition" bind:value={cle} min={-4} max={4} step={0.25} unite="IL" />
    <Bascule label="Opérateur" bind:value={op} options={[{ valeur: 'lineaire', texte: 'Linéaire (écrêtage)' }, { valeur: 'reinhard', texte: 'Reinhard global' }, { valeur: 'log', texte: 'Logarithmique' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .axe { stroke: var(--filet-fort); }
  .c { fill: none; stroke: var(--accent); stroke-width: 2.5; }
  .g { font-size: 10px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
</style>
