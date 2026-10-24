<script lang="ts">
  // E = hc/λ : l'énergie d'un photon diminue avec la longueur d'onde.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { energiePhoton } from '@/lib/sim/capteur';
  import { hexSpectral } from '@/lib/sim/couleur';

  let lambda = $state(550);
  const X = (l: number) => 50 + ((l - 380) / (780 - 380)) * 560;
  const Y = (e: number) => 210 - ((e - 2) / (5.5 - 2)) * 180;
  const courbe = Array.from({ length: 81 }, (_, i) => 380 + i * 5)
    .map((l, i) => `${i ? 'L' : 'M'}${X(l)},${Y(energiePhoton(l) / 1e-19)}`)
    .join(' ');
  const E = $derived(energiePhoton(lambda));
  const parNanojoule = $derived(1e-9 / E);
</script>

<Panneau>
  {#snippet figure()}
    <svg viewBox="0 0 640 250" role="img" aria-label={`Photon de ${lambda} nm : ${(E / 1e-19).toFixed(2)} × 10⁻¹⁹ J`}>
      <defs>
        <linearGradient id="spectre-e" x1="0" x2="1">
          {#each Array(21) as _, i}<stop offset={i / 20} stop-color={hexSpectral(380 + i * 20)} />{/each}
        </linearGradient>
      </defs>
      <rect x="50" y="222" width="560" height="10" rx="2" fill="url(#spectre-e)" />
      {#each [2, 3, 4, 5] as e}
        <line x1="50" x2="610" y1={Y(e)} y2={Y(e)} class="grille" />
        <text x="42" y={Y(e) + 4} class="g d">{e}</text>
      {/each}
      <text x="12" y="20" class="g">E (10⁻¹⁹ J)</text>
      {#each [400, 500, 600, 700] as l}<text x={X(l)} y="248" class="g m">{l} nm</text>{/each}
      <path d={courbe} class="courbe" />
      <line x1={X(lambda)} x2={X(lambda)} y1={Y(E / 1e-19)} y2="222" class="repere" />
      <circle cx={X(lambda)} cy={Y(E / 1e-19)} r="7" fill={hexSpectral(lambda)} stroke="var(--papier)" stroke-width="2" />
      <text x={X(lambda) + (lambda > 650 ? -12 : 12)} y={Y(E / 1e-19) - 10} class="val" text-anchor={lambda > 650 ? 'end' : 'start'}>{(E / 1e-19).toFixed(2)} × 10⁻¹⁹ J</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Longueur d’onde λ" bind:value={lambda} min={380} max={780} step={5} unite="nm" />
    <p class="info">Il faut <strong>{(parNanojoule / 1e9).toFixed(2)} milliards</strong> de photons de cette couleur pour transporter 1 nanojoule.</p>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.4rem 0.4rem 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .courbe { fill: none; stroke: var(--encre); stroke-width: 2; }
  .repere { stroke: var(--encre-3); stroke-dasharray: 3 3; }
  .val { font-family: var(--f-titre); font-size: 15px; fill: var(--encre); }
  .info { margin: 0; font-size: 0.9rem; color: var(--encre-2); align-self: center; }
</style>
