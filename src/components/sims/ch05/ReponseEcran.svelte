<script lang="ts">
  // Réponse d'un écran L = F(d) mesurée sur 17 niveaux de gris, puis ajustée par un modèle L = L_noir + L_max (d/255)^γ.
  // Même démarche (mesure de paires entrée/sortie + ajustement) que la courbe de réponse de l'A2.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  let bruit = $state(2);
  let tirage = $state(1);
  const GAMMA_VRAI = 2.3, LMAX = 248, LNOIR = 0.6;
  const niveaux = Array.from({ length: 17 }, (_, i) => Math.min(255, i * 16));
  const mesures = $derived.by(() => {
    const a = creerAlea(tirage * 7);
    return niveaux.map((d) => Math.max(0.05, LNOIR + LMAX * (d / 255) ** GAMMA_VRAI + bruit * gauss(a) * (0.3 + d / 255)));
  });
  // ajustement de γ : moindres carrés sur log(L − L_noir) = log L_max + γ log(d/255) (niveaux > 0)
  const ajuste = $derived.by(() => {
    const pts = niveaux.map((d, i) => [d, mesures[i]] as const).filter(([d, l]) => d > 0 && l - LNOIR > 0.2);
    const X = pts.map(([d]) => Math.log(d / 255)), Y = pts.map(([, l]) => Math.log(l - LNOIR));
    const n = X.length, mx = X.reduce((s, v) => s + v, 0) / n, my = Y.reduce((s, v) => s + v, 0) / n;
    const g = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / X.reduce((s, x) => s + (x - mx) ** 2, 0);
    return { gamma: g, lmax: Math.exp(my - g * mx) };
  });
  const XX = (d: number) => 50 + (d / 255) * 540;
  const YY = (l: number) => 210 - (l / 260) * 190;
  const courbe = $derived(Array.from({ length: 65 }, (_, i) => i * 4).map((d, i) => `${i ? 'L' : 'M'}${XX(d)},${YY(LNOIR + ajuste.lmax * (d / 255) ** ajuste.gamma)}`).join(' '));
</script>

<Panneau note={`Valeur vraie de la simulation : γ = ${GAMMA_VRAI}. L’ajustement retrouve γ à partir des seules mesures bruitées.`}>
  {#snippet figure()}
    <svg viewBox="0 0 640 240" role="img" aria-label="Luminance mesurée en fonction du niveau de gris">
      {#each [0, 50, 100, 150, 200, 250] as l}<line x1="50" x2="590" y1={YY(l)} y2={YY(l)} class="grille" /><text x="44" y={YY(l) + 4} class="g d">{l}</text>{/each}
      {#each [0, 64, 128, 192, 255] as d}<text x={XX(d)} y="228" class="g m">{d}</text>{/each}
      <text x="8" y="14" class="g">L (cd/m²)</text>
      <text x="590" y="240" class="g d">niveau de gris d</text>
      <path d={courbe} class="fit" />
      {#each niveaux as d, i}<circle cx={XX(d)} cy={YY(mesures[i])} r="4" class="pt" />{/each}
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Bruit de mesure du colorimètre" bind:value={bruit} min={0} max={10} step={0.5} unite="cd/m²" />
    <p class="info">Ajustement : <b>γ = {ajuste.gamma.toFixed(3)}</b>, L_max = {ajuste.lmax.toFixed(1)} cd/m²</p>
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => tirage++}>Nouvelle série</Bouton>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .fit { fill: none; stroke: var(--accent); stroke-width: 2.2; }
  .pt { fill: var(--encre); stroke: var(--papier); stroke-width: 1.5; }
  .info { margin: 0; font-size: 0.9rem; color: var(--encre-2); align-self: center; }
</style>
