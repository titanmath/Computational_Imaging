<script lang="ts">
  // Vision classique vs conception conjointe : d'où part la rétroaction de la tâche ?
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';

  let mode = $state<'classique' | 'conjointe'>('classique');
  const blocs = [
    { id: 'scene', x: 40, t: 'Scène', s: 'le monde' },
    { id: 'materiel', x: 190, t: 'Matériel', s: 'optique, capteur' },
    { id: 'mesure', x: 340, t: 'Mesure', s: 'pixels bruts' },
    { id: 'logiciel', x: 490, t: 'Logiciel', s: 'algorithme' },
    { id: 'tache', x: 640, t: 'Tâche', s: 'image, profondeur…' },
  ];
  const L = 110;
  const Y = 70;
  const H = 62;
  const uid = $props.id();
  const mid = `fl-${uid}`;
  const cx = (id: string) => blocs.find((b) => b.id === id)!.x + L / 2;
</script>

<Panneau>
  {#snippet figure()}
    <svg viewBox="0 0 790 290" class="schema" role="img" aria-label={mode === 'classique'
        ? 'Vision classique : la rétroaction de la tâche ne met à jour que le logiciel'
        : 'Conception conjointe : la rétroaction met à jour le logiciel et le matériel'}>
      <defs>
        <marker id={mid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="currentColor" />
        </marker>
      </defs>
      {#each blocs as b, i}
        <g class="bloc" class:actif={b.id === 'logiciel' || (mode === 'conjointe' && b.id === 'materiel')}>
          <rect x={b.x} y={Y} width={L} height={H} rx="10" />
          <text x={b.x + L / 2} y={Y + 27} class="t">{b.t}</text>
          <text x={b.x + L / 2} y={Y + 46} class="s">{b.s}</text>
        </g>
        {#if i < blocs.length - 1}
          <line class="flux" x1={b.x + L + 4} y1={Y + H / 2} x2={blocs[i + 1].x - 6} y2={Y + H / 2} marker-end={`url(#${mid})`} />
        {/if}
      {/each}
      <!-- rétroaction vers le logiciel (toujours) -->
      <path class="retro" d={`M${cx('tache')} ${Y + H + 6} C ${cx('tache')} ${Y + H + 70}, ${cx('logiciel')} ${Y + H + 70}, ${cx('logiciel')} ${Y + H + 8}`} marker-end={`url(#${mid})`} />
      <!-- rétroaction vers le matériel (conception conjointe) -->
      <path class="retro hw" class:visible={mode === 'conjointe'} d={`M${cx('tache')} ${Y + H + 6} C ${cx('tache')} ${Y + H + 140}, ${cx('materiel')} ${Y + H + 140}, ${cx('materiel')} ${Y + H + 8}`} marker-end={`url(#${mid})`} />
      <text x={cx('logiciel') + 75} y={Y + H + 66} class="lbl">mise à jour</text>
      <text x={cx('materiel') + 230} y={Y + H + 122} class="lbl hw" class:visible={mode === 'conjointe'}>mise à jour du matériel</text>
      <text x="395" y="34" class="titre">{mode === 'classique' ? 'Le matériel est figé : seul l’algorithme apprend' : 'Optique et algorithme sont optimisés ensemble'}</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Bascule
      label="Approche"
      bind:value={mode}
      options={[
        { valeur: 'classique', texte: 'Vision classique' },
        { valeur: 'conjointe', texte: 'Conception conjointe' },
      ]}
    />
  {/snippet}
</Panneau>

<style>
  .schema {
    width: 100%;
    height: auto;
    display: block;
    padding: 0.5rem 0.5rem 0;
    color: var(--encre-3);
    font-family: var(--f-texte);
  }
  .bloc rect {
    fill: var(--papier-2);
    stroke: var(--filet-fort);
    stroke-width: 1.2;
    transition: fill 0.4s var(--ease), stroke 0.4s var(--ease);
  }
  .bloc.actif rect {
    fill: color-mix(in oklab, var(--accent) 12%, var(--papier));
    stroke: var(--accent);
  }
  .t {
    text-anchor: middle;
    font-family: var(--f-titre);
    font-size: 17px;
    fill: var(--encre);
  }
  .s {
    text-anchor: middle;
    font-size: 12px;
    fill: var(--encre-3);
  }
  .flux {
    stroke: var(--encre-3);
    stroke-width: 1.4;
  }
  .retro {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.8;
    stroke-dasharray: 6 6;
    color: var(--accent);
    animation: defile 1.2s linear infinite;
  }
  .retro.hw {
    opacity: 0;
    transition: opacity 0.5s var(--ease);
  }
  .retro.hw.visible {
    opacity: 1;
  }
  @keyframes defile {
    to {
      stroke-dashoffset: -12;
    }
  }
  .lbl {
    font-size: 12px;
    fill: var(--accent);
    font-weight: 600;
  }
  .lbl.hw {
    opacity: 0;
    transition: opacity 0.5s var(--ease);
  }
  .lbl.hw.visible {
    opacity: 1;
  }
  .titre {
    text-anchor: middle;
    font-family: var(--f-titre);
    font-style: italic;
    font-size: 16px;
    fill: var(--encre-2);
  }
</style>
