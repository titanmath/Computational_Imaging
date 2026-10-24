<script lang="ts">
  // Petit tracé spectral 380–780 nm avec bande spectrale en abscisse.
  import { LAMBDAS } from '@/lib/sim/spectres';
  import { hexSpectral } from '@/lib/sim/couleur';
  interface Serie {
    valeurs: ArrayLike<number>;
    couleur: string;
    nom?: string;
    remplir?: boolean;
    tirets?: boolean;
  }
  interface Props {
    series: Serie[];
    ymax?: number;
    titre?: string;
    hauteur?: number;
    repere?: number | null;
  }
  let { series, ymax, titre, hauteur = 170, repere = null }: Props = $props();
  const uid = $props.id();
  const W = 400;
  const X = (l: number) => 34 + ((l - 380) / 400) * (W - 44);
  const max = $derived(ymax ?? Math.max(1e-9, ...series.flatMap((s) => Array.from(s.valeurs))) * 1.08);
  const Y = (v: number) => hauteur - 26 - (v / max) * (hauteur - 46);
  const chemin = (v: ArrayLike<number>) => Array.from(v, (y, i) => `${i ? 'L' : 'M'}${X(LAMBDAS[i]).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
</script>

<svg viewBox={`0 0 ${W} ${hauteur}`} class="gs" role="img" aria-label={titre ?? 'Tracé spectral'}>
  <defs>
    <linearGradient id={`b-${uid}`} x1="0" x2="1">
      {#each Array(21) as _, i}<stop offset={i / 20} stop-color={hexSpectral(380 + i * 20)} />{/each}
    </linearGradient>
  </defs>
  {#if titre}<text x="34" y="13" class="t">{titre}</text>{/if}
  <line x1="34" x2={W - 10} y1={hauteur - 26} y2={hauteur - 26} class="axe" />
  <rect x="34" y={hauteur - 22} width={W - 44} height="5" rx="1" fill={`url(#b-${uid})`} />
  {#each [400, 500, 600, 700] as l}<text x={X(l)} y={hauteur - 6} class="g">{l}</text>{/each}
  {#each series as s}
    {#if s.remplir}<path d={`${chemin(s.valeurs)} L${X(780)},${Y(0)} L${X(380)},${Y(0)} Z`} fill={s.couleur} opacity="0.16" />{/if}
    <path d={chemin(s.valeurs)} stroke={s.couleur} class="c" stroke-dasharray={s.tirets ? '5 4' : undefined} />
  {/each}
  {#if repere !== null}<line x1={X(repere)} x2={X(repere)} y1="18" y2={hauteur - 26} class="rep" />{/if}
</svg>

<style>
  .gs { width: 100%; height: auto; display: block; font-family: var(--f-texte); }
  .axe { stroke: var(--c-filet, var(--filet-fort)); }
  .g { font-size: 10px; fill: var(--c-encre-2, var(--encre-3)); text-anchor: middle; }
  .t { font-size: 11px; fill: var(--c-encre-2, var(--encre-2)); font-weight: 600; }
  .c { fill: none; stroke-width: 2; }
  .rep { stroke: var(--c-encre-2, var(--encre-3)); stroke-dasharray: 3 3; }
</style>
