<script lang="ts">
  // Chaque exposition « voit » une fenêtre de ~10 diaphragmes de la scène (bruit en bas, saturation en haut).
  // Des expositions décalées couvrent ensemble toute la dynamique.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';

  let lecture = $state(3); // bruit de lecture (e⁻)
  let ecart = $state(3); // décalage entre expositions (IL)
  const PUITS = 12000;
  const largeur = $derived(Math.log2(PUITS / lecture)); // dynamique d'une exposition (en IL)
  const X = (s: number) => 40 + ((s + 18) / 20) * 560;
  const scene = [
    { s: -16, t: 'ombre profonde' },
    { s: -11, t: 'intérieur' },
    { s: -6, t: 'fenêtre' },
    { s: -1, t: 'soleil' },
  ];
</script>

<Panneau note={`Capteur illustratif : puits de 12 000 e⁻, bruit de lecture ${lecture} e⁻ → dynamique d’une pose ≈ log₂(12 000 / ${lecture}) = ${largeur.toFixed(1)} IL.`}>
  {#snippet figure()}
    <svg viewBox="0 0 640 210" role="img" aria-label="Fenêtres de mesure de trois expositions sur l’échelle des luminances de la scène">
      <defs>
        <linearGradient id="echelle-ps" x1="0" x2="1">
          <stop offset="0" stop-color="#000" /><stop offset="1" stop-color="#fff" />
        </linearGradient>
      </defs>
      <rect x="40" y="20" width="560" height="14" fill="url(#echelle-ps)" rx="2" />
      {#each scene as o}<text x={X(o.s)} y="52" class="g m">{o.t}</text>{/each}
      {#each [-18, -14, -10, -6, -2, 2] as s}<text x={X(s)} y="198" class="g m">{s}</text>{/each}
      <text x="600" y="210" class="g d">luminance de la scène (IL, relatif)</text>
      {#each [['Courte', 0], ['Moyenne', -1], ['Longue', -2]] as [nom, k], i}
        {@const haut = 2 + Number(k) * ecart}
        <g transform={`translate(0 ${74 + i * 36})`}>
          <rect x={X(haut - largeur)} y="0" width={X(haut) - X(haut - largeur)} height="22" rx="5" class="fen" style={`--o:${0.35 + i * 0.2}`} />
          <text x={X(haut - largeur) + 6} y="15" class="g l">{nom} : du bruit à la saturation</text>
        </g>
      {/each}
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Bruit de lecture" bind:value={lecture} min={1} max={60} log step={0.5} unite="e⁻" />
    <Curseur label="Décalage entre expositions" bind:value={ecart} min={1} max={8} step={0.5} unite="IL" />
  {/snippet}
</Panneau>

<style>
  svg { width: 100%; height: auto; display: block; padding: 0.6rem 0.4rem 0; font-family: var(--f-texte); }
  .g { font-size: 11px; fill: var(--encre-3); }
  .g.m { text-anchor: middle; }
  .g.d { text-anchor: end; }
  .g.l { fill: var(--encre); font-weight: 600; }
  .fen { fill: color-mix(in oklab, var(--accent) calc(var(--o) * 100%), transparent); stroke: var(--accent); }
</style>
