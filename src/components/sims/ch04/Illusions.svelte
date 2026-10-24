<script lang="ts">
  // Trois illusions de contexte, chacune avec un bouton « révéler » qui supprime le contexte.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';

  let quelle = $state<'induction' | 'mach' | 'cornsweet'>('induction');
  let reveler = $state(false);
  const gris = (v: number) => `rgb(${v},${v},${v})`;
  // Cornsweet : deux plateaux identiques (148), un bord avec une petite rampe sombre / claire
  const W = 600;
  const profilCornsweet = (x: number) => {
    // bord de Cornsweet : rampe sombre à gauche du bord, claire à droite, plateaux identiques (148)
    const d = x - W / 2;
    return Math.round(d < 0 ? 148 - 40 * Math.exp(d / 18) : 148 + 40 * Math.exp(-d / 18));
  };
  const etapes = [70, 100, 130, 160, 190, 220];
</script>

<Panneau note={quelle === 'induction' ? 'Les deux carrés centraux ont exactement le même code RGB (165, 165, 165).' : quelle === 'mach' ? 'Chaque bande est parfaitement uniforme : son profil réel est un escalier.' : 'Loin du bord, les deux côtés ont la même valeur RGB (148, 148, 148).'}>
  {#snippet figure()}
    <div class="cadre">
      {#if quelle === 'induction'}
        <svg viewBox="0 0 600 260" role="img" aria-label="Deux carrés gris identiques sur des fonds différents">
          <rect x="20" y="20" width="270" height="220" fill={reveler ? gris(200) : 'rgb(240,200,40)'} />
          <rect x="310" y="20" width="270" height="220" fill={reveler ? gris(200) : 'rgb(40,70,200)'} />
          <rect x="105" y="80" width="100" height="100" fill={gris(165)} />
          <rect x="395" y="80" width="100" height="100" fill={gris(165)} />
          {#if reveler}<rect x="205" y="122" width="190" height="16" fill={gris(165)} />{/if}
        </svg>
      {:else if quelle === 'mach'}
        <svg viewBox="0 0 600 260" role="img" aria-label="Bandes de Mach">
          {#each etapes as v, i}
            <rect x={20 + i * 93.3 + (reveler ? i * 6 : 0)} y="20" width={reveler ? 87 : 93.4} height="170" fill={gris(v)} />
          {/each}
          <polyline class="profil" points={etapes.map((v, i) => `${20 + i * 93.3},${250 - (v - 60) * 0.3} ${20 + (i + 1) * 93.3},${250 - (v - 60) * 0.3}`).join(' ')} />
          <text x="590" y="214" class="t">profil réel (escalier)</text>
        </svg>
      {:else}
        <svg viewBox="0 0 600 260" role="img" aria-label="Illusion de Cornsweet">
          {#each Array(W / 4) as _, i}
            <rect x={i * 4} y="20" width="4.5" height="170" fill={gris(profilCornsweet(i * 4 + 2))} />
          {/each}
          {#if reveler}<rect x={W / 2 - 70} y="10" width="140" height="190" class="cache" />{/if}
          <polyline class="profil" points={Array.from({ length: 151 }, (_, i) => `${i * 4},${250 - (profilCornsweet(i * 4) - 100) * 0.5}`).join(' ')} />
          <text x="590" y="214" class="t">profil de luminance</text>
        </svg>
      {/if}
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Illusion" bind:value={quelle} onchange={() => (reveler = false)} options={[{ valeur: 'induction', texte: 'Induction' }, { valeur: 'mach', texte: 'Bandes de Mach' }, { valeur: 'cornsweet', texte: 'Cornsweet' }]} />
    <Bascule label="Contexte" bind:value={reveler} options={[{ valeur: false, texte: 'Avec' }, { valeur: true, texte: 'Révéler' }]} />
  {/snippet}
</Panneau>

<style>
  .cadre { padding: 1rem 1.1rem 0.4rem; }
  svg { width: 100%; height: auto; display: block; font-family: var(--f-texte); }
  .profil { fill: none; stroke: var(--accent); stroke-width: 2; }
  .t { font-size: 11px; fill: var(--encre-3); text-anchor: end; }
  .cache { fill: var(--papier); stroke: var(--filet-fort); }
</style>
