<script lang="ts">
  // A priori inter-canaux (Heide et al. 2013) sur une ligne RGB : dans une image nette, les bords des trois
  // canaux sont au même endroit et ∇x_R/x_R ≈ ∇x_G/x_G. Une lentille simple floute chaque canal différemment
  // (aberration chromatique) : le coût |x_G ∇x_R − x_R ∇x_G| s'allume sur les bords. Le curseur « netteté »
  // fait passer de la ligne floue à la ligne reconstruite.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { noyauGauss1D } from '@/lib/sim/inverse';

  const n = 256;
  let nettete = $state(0);
  let paire = $state<'rg' | 'rb' | 'gb'>('rg');
  // profil commun s(x) : marche, plateau, descente, rampe vers 0 en x₀
  const s = Float64Array.from({ length: n }, (_, i) => {
    const u = i / n;
    if (u < 0.12) return 0.55;
    if (u < 0.3) return 0.45;
    if (u < 0.45) return 1;
    if (u < 0.55) return 0.8;
    if (u < 0.7) return 0.8 - (u - 0.55) * 2.2;
    return Math.max(0, 0.47 * (1 - (u - 0.7) / 0.3));
  });
  const GAIN = [0.92, 0.62, 0.3];
  const FLOU = [6, 1.2, 3.5]; // σ (pixels) par canal : le rouge est le plus flou
  const COUL = ['#e0453a', '#2fa35a', '#3a63d8'];
  const canaux = $derived(
    GAIN.map((a, c) => {
      const sig = FLOU[c] * (1 - nettete);
      const v = Float64Array.from(s, (x) => a * x);
      if (sig < 0.05) return v;
      // convolution directe, bords répliqués (pas de repliement circulaire)
      const k = noyauGauss1D(sig), r = (k.length - 1) / 2;
      return Float64Array.from(v, (_, i) => k.reduce((t, w, j) => t + w * v[Math.min(n - 1, Math.max(0, i + j - r))], 0));
    }),
  );
  const IDX = { rg: [0, 1], rb: [0, 2], gb: [1, 2] } as const;
  const cout = $derived.by(() => {
    const [i, j] = IDX[paire];
    const a = canaux[i], b = canaux[j];
    return Float64Array.from({ length: n }, (_, k) => {
      const k1 = Math.min(n - 1, k + 1);
      return Math.abs(b[k] * (a[k1] - a[k]) - a[k] * (b[k1] - b[k]));
    });
  });
  const total = $derived(cout.reduce((t, v) => t + v, 0));
  const X = (i: number) => 30 + (i / (n - 1)) * 580;
  const Y = (v: number) => 200 - v * 170;
  const ch = (v: ArrayLike<number>) => Array.from(v, (y, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const SEUIL = 0.004;
</script>

<Panneau note={`Coût inter-canaux de la paire ${paire === 'rg' ? 'R–G' : paire === 'rb' ? 'R–B' : 'G–B'} : Σₚ |x₂ ∇x₁ − x₁ ∇x₂| = ${total.toFixed(3)}. Bandeau du fond : vert là où le coût est faible, rouge là où les canaux ne « bougent » pas ensemble. Une fois nette, la ligne a un coût nul : les trois canaux sont proportionnels.`}>
  {#snippet figure()}
    <svg viewBox="0 0 640 230" role="img" aria-label="Ligne RGB et coût inter-canaux">
      {#each cout as v, i}
        <rect x={X(i) - 1.2} width="2.4" y="20" height="180" class={v > SEUIL ? 'fort' : 'faible'} />
      {/each}
      {#each canaux as v, c}<path d={ch(v)} style={`stroke:${COUL[c]}`} class="c" />{/each}
      <line x1="30" x2="612" y1={Y(0)} y2={Y(0)} class="axe" />
      <text x="612" y="218" class="g d">position x →</text>
      <text x="34" y="14" class="g">intensité des canaux R, G, B</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Netteté (de la ligne floue à la ligne reconstruite)" bind:value={nettete} min={0} max={1} step={0.01} format={(v) => Math.round(v * 100) + ' %'} />
    <Bascule label="Paire de canaux" bind:value={paire} options={[{ valeur: 'rg', texte: 'R–G' }, { valeur: 'rb', texte: 'R–B' }, { valeur: 'gb', texte: 'G–B' }]} />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.7rem 0.8rem 0.2rem; font-family: var(--f-texte); }
  .faible { fill: #2fa35a; opacity: 0.14; }
  .fort { fill: #e0453a; opacity: 0.22; }
  .c { fill: none; stroke-width: 2.4; }
  .axe { stroke: var(--encre-3); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
</style>
