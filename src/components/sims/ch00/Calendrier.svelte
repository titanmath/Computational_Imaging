<script lang="ts">
  // Frise du semestre : quatre grandes parties, assignments, démos et la date du jour.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';

  const D = (m: number, j: number) => new Date(2026, m - 1, j).getTime();
  const debut = D(9, 1);
  const fin = D(12, 31);
  const X0 = 30;
  const X1 = 770;
  const x = (t: number) => X0 + ((t - debut) / (fin - debut)) * (X1 - X0);

  const parties = [
    { de: D(9, 8), a: D(10, 1), t: 'Formation de l’image', s: 'lentille · capteur · ISP · perception · calibration', nm: 440 },
    { de: D(10, 1), a: D(11, 1), t: 'Calcul', s: 'HDR · problèmes inverses · solveurs neuronaux · rendu', nm: 520 },
    { de: D(11, 1), a: D(11, 19), t: 'Au-delà du RGB', s: 'apparence · spectre · événements · ToF · polarisation', nm: 580 },
    { de: D(11, 19), a: D(12, 18), t: 'Optique ondulatoire', s: 'optique adaptative · holographie · réseaux optiques', nm: 640 },
  ];
  const assignments = [
    { c: 'A1', de: D(9, 10), a: D(10, 1) },
    { c: 'A2', de: D(10, 1), a: D(10, 27) },
    { c: 'A3', de: D(11, 3), a: D(11, 24) },
    { c: 'A4', de: D(11, 24), a: D(12, 22) },
  ];
  const demos = [D(10, 29), D(12, 24)];
  const mois = [
    { t: 'sept.', d: D(9, 1) },
    { t: 'oct.', d: D(10, 1) },
    { t: 'nov.', d: D(11, 1) },
    { t: 'déc.', d: D(12, 1) },
  ];
  const teintes: Record<number, string> = { 440: '#4a5fd0', 520: '#2f9a74', 580: '#c39a22', 640: '#d0553a' };

  let aujourdhui = $state<number | null>(null);
  onMount(() => {
    const t = Date.now();
    if (t >= debut && t <= fin) aujourdhui = t;
  });
  const fmt = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
</script>

<Panneau>
  {#snippet figure()}
    <svg viewBox="0 0 800 300" role="img" aria-label="Frise du semestre d’automne 2026 avec les quatre parties du cours, les assignments et les démos">
      {#each mois as m}
        <line class="grille" x1={x(m.d)} x2={x(m.d)} y1="20" y2="270" />
        <text class="mois" x={x(m.d) + 4} y="16">{m.t}</text>
      {/each}
      {#each parties as p, i}
        <g>
          <rect x={x(p.de)} y={34 + (i % 2) * 52} width={x(p.a) - x(p.de) - 3} height="44" rx="7" style={`fill:${teintes[p.nm]}22;stroke:${teintes[p.nm]}`} />
          <text class="pt" x={x(p.de) + 8} y={53 + (i % 2) * 52} style={`fill:${teintes[p.nm]}`}>{p.t}</text>
          <text class="ps" x={x(p.de) + 8} y={70 + (i % 2) * 52}>{p.s.length > 44 ? p.s.slice(0, 42) + '…' : p.s}</text>
        </g>
      {/each}
      {#each assignments as a, i}
        <g class="assign">
          <line x1={x(a.de)} x2={x(a.a)} y1={170 + (i % 2) * 26} y2={170 + (i % 2) * 26} />
          <circle cx={x(a.de)} cy={170 + (i % 2) * 26} r="3.5" class="sortie" />
          <circle cx={x(a.a)} cy={170 + (i % 2) * 26} r="5" class="rendu" />
          <text x={x(a.de) + 6} y={164 + (i % 2) * 26}>{a.c} · rendu {fmt(a.a)}</text>
        </g>
      {/each}
      {#each demos as d}
        <g class="demo">
          <path d={`M${x(d)} 232 l7 12 h-14z`} />
          <text x={x(d)} y="262">démo {fmt(d)}</text>
        </g>
      {/each}
      {#if aujourdhui}
        <g class="auj">
          <line x1={x(aujourdhui)} x2={x(aujourdhui)} y1="24" y2="276" />
          <text x={x(aujourdhui) + 5} y="288">aujourd’hui</text>
        </g>
      {/if}
    </svg>
  {/snippet}
</Panneau>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
    padding: 0.6rem 0.4rem 0.2rem;
    font-family: var(--f-texte);
  }
  .grille {
    stroke: var(--filet);
  }
  .mois {
    font-size: 12px;
    fill: var(--encre-3);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .pt {
    font-family: var(--f-titre);
    font-size: 14.5px;
  }
  .ps {
    font-size: 10.5px;
    fill: var(--encre-3);
  }
  .assign line {
    stroke: var(--encre-2);
    stroke-width: 2;
  }
  .assign .sortie {
    fill: var(--papier);
    stroke: var(--encre-2);
    stroke-width: 1.5;
  }
  .assign .rendu {
    fill: var(--encre);
  }
  .assign text {
    font-size: 11.5px;
    fill: var(--encre);
    font-weight: 600;
  }
  .demo path {
    fill: var(--accent);
  }
  .demo text {
    font-size: 11px;
    text-anchor: middle;
    fill: var(--accent);
    font-weight: 600;
  }
  .auj line {
    stroke: var(--ambre);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }
  .auj text {
    font-size: 11px;
    fill: var(--ambre);
    font-weight: 600;
  }
</style>
