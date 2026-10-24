<script lang="ts">
  // Puits de charge : électrons moyens = α·N_γ, plafonnés à Q_FW (α = 50 %, Q_FW = 10 000 e⁻, slides).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  let photons = $state(12000);
  const a = 0.5, Q = 10000;
  const X = (n: number) => 50 + (n / 30000) * 540;
  const Y = (e: number) => 200 - (e / 12000) * 170;
  const ne = $derived(Math.min(Q, a * photons));
  const sature = $derived(a * photons >= Q);
</script>

<Panneau>
  {#snippet figure()}
    <svg viewBox="0 0 640 240" role="img" aria-label={`${photons} photons → ${ne.toFixed(0)} électrons`}>
      {#each [0, 4000, 8000, 12000] as e}
        <line x1="50" x2="590" y1={Y(e)} y2={Y(e)} class="grille" />
        <text x="44" y={Y(e) + 4} class="g d">{e.toLocaleString('fr-FR')}</text>
      {/each}
      {#each [0, 10000, 20000, 30000] as n}<text x={X(n)} y="222" class="g m">{n.toLocaleString('fr-FR')}</text>{/each}
      <text x="8" y="16" class="g">électrons collectés</text>
      <text x="590" y="236" class="g d">photons incidents</text>
      <line x1={X(0)} y1={Y(0)} x2={X(Q / a)} y2={Y(Q)} class="courbe" />
      <line x1={X(Q / a)} y1={Y(Q)} x2={X(30000)} y2={Y(Q)} class="courbe sat" />
      <line x1={X(Q / a)} y1={Y(Q)} x2={X(30000 * 0.8)} y2={Y(Q * 2.4)} class="ideal" />
      <text x={X(25000)} y={Y(Q) - 8} class="g m">Q_FW = 10 000 e⁻</text>
      <circle cx={X(photons)} cy={Y(ne)} r="7" class:rouge={sature} class="pt" />
      <!-- seau -->
      <g transform="translate(600 40)">
        <rect x="0" y="0" width="30" height="150" rx="4" class="seau" />
        <rect x="2" y={2 + 146 * (1 - ne / Q)} width="26" height={146 * (ne / Q)} rx="3" class="eau" class:rouge={sature} />
      </g>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Photons incidents sur le pixel" bind:value={photons} min={0} max={30000} step={250} format={(v) => v.toLocaleString('fr-FR')} />
    <p class="info">{sature ? 'Le puits est plein : tous les photons supplémentaires sont perdus. Le pixel est saturé (blanc pur), l’information est perdue.' : `Signal proportionnel à la lumière : ${ne.toLocaleString('fr-FR')} e⁻ (α = 50 %).`}</p>
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.4rem 0.4rem 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .courbe { stroke: var(--accent); stroke-width: 2.5; }
  .courbe.sat { stroke: var(--ambre); }
  .ideal { stroke: var(--encre-3); stroke-dasharray: 4 4; }
  .pt { fill: var(--accent); stroke: var(--papier); stroke-width: 2; }
  .pt.rouge { fill: var(--ambre); }
  .seau { fill: none; stroke: var(--encre-2); stroke-width: 1.5; }
  .eau { fill: color-mix(in oklab, var(--accent) 60%, transparent); transition: y 0.2s, height 0.2s; }
  .eau.rouge { fill: var(--ambre); }
  .info { margin: 0; font-size: 0.9rem; color: var(--encre-2); align-self: center; }
</style>
