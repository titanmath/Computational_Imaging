<script lang="ts">
  // Budget de bruit : σ_I² = g²(μ_s + μ_d + σ_read²) + 1/12. Quel terme domine selon le signal ?
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';

  let g = $state(0.1);
  let lecture = $state(3);
  let mud = $state(4);
  const X = (mus: number) => 50 + (Math.log10(mus) / 4) * 520; // 1 → 10⁴ e⁻
  const Y = (s: number) => 200 - ((Math.log10(s) + 1) / 3) * 180; // 0,1 → 100 DN
  const pts = Array.from({ length: 81 }, (_, i) => 10 ** (i / 20));
  const courbe = (f: (m: number) => number) => pts.map((m, i) => `${i ? 'L' : 'M'}${X(m)},${Y(Math.max(0.1, f(m)))}`).join(' ');
  const total = (m: number) => Math.sqrt(g * g * (m + mud + lecture * lecture) + 1 / 12);
  const series = $derived([
    { nom: 'Photonique g√μs', c: '#e0359b', f: (m: number) => g * Math.sqrt(m) },
    { nom: 'Obscurité g√μd', c: '#8a6bd6', f: () => g * Math.sqrt(mud) },
    { nom: 'Lecture g·σread', c: '#2f7bf0', f: () => g * lecture },
    { nom: 'Quantification 1/√12', c: '#c39a22', f: () => Math.sqrt(1 / 12) },
  ]);
  // Point de bascule : là où le bruit photonique dépasse les bruits « fixes »
  const bascule = $derived((mud + lecture * lecture + 1 / (12 * g * g)));
</script>

<Panneau note="Les deux axes sont logarithmiques. Le signal (en DN) vaut g·μs et croît plus vite que le bruit photonique (en √μs) : le rapport signal/bruit augmente avec la lumière.">
  {#snippet figure()}
    <svg viewBox="0 0 640 240" role="img" aria-label="Écart-type de chaque source de bruit en fonction du signal">
      {#each [0.1, 1, 10, 100] as s}<line x1="50" x2="570" y1={Y(s)} y2={Y(s)} class="grille" /><text x="44" y={Y(s) + 4} class="g d">{s}</text>{/each}
      {#each [1, 10, 100, 1000, 10000] as m}<text x={X(m)} y="216" class="g m">{m.toLocaleString('fr-FR')}</text>{/each}
      <text x="8" y="14" class="g">bruit σ (DN)</text>
      <text x="570" y="232" class="g d">électrons de signal μs</text>
      <path d={courbe((m) => g * m)} class="signal" />
      {#each series as s}<path d={courbe(s.f)} stroke={s.c} class="serie" />{/each}
      <path d={courbe(total)} class="total" />
      <line x1={X(bascule)} x2={X(bascule)} y1="20" y2="200" class="bascule" />
      <text x={X(bascule) + 5} y="30" class="g">bruit photonique dominant →</text>
    </svg>
    <ul class="legende">
      {#each [...series, { nom: 'Total', c: 'var(--encre)' }, { nom: 'Signal g·μs', c: 'var(--accent)' }] as s}
        <li><span style={`background:${s.c}`}></span>{s.nom}</li>
      {/each}
    </ul>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Gain g" bind:value={g} min={0.02} max={2} log step={0.01} unite="DN/e⁻" format={(v) => v.toFixed(2)} />
    <Curseur label="Bruit de lecture σread" bind:value={lecture} min={0.5} max={30} log step={0.1} unite="e⁻" format={(v) => v.toFixed(1)} />
    <Curseur label="Électrons d’obscurité μd" bind:value={mud} min={0} max={400} step={1} unite="e⁻" />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 10.5px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .serie { fill: none; stroke-width: 1.8; stroke-dasharray: 5 3; }
  .total { fill: none; stroke: var(--encre); stroke-width: 2.5; }
  .signal { fill: none; stroke: var(--accent); stroke-width: 2.5; }
  .bascule { stroke: var(--encre-3); stroke-dasharray: 2 3; }
  .legende { list-style: none; display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; margin: 0.2rem 1.1rem 0.6rem; padding: 0; font-size: 0.8rem; color: var(--encre-2); }
  .legende span { display: inline-block; width: 12px; height: 3px; margin-right: 0.35rem; vertical-align: middle; }
</style>
