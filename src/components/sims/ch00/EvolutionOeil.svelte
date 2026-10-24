<script lang="ts">
  // Quatre stades d'yeux naturels et l'image que chacun « mesure » d'une même scène.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { flouGauss } from '@/lib/sim/conv';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, poisson } from '@/lib/sim/rng';

  const stades = [
    {
      t: 'Tache photosensible',
      d: 'Des cellules sensibles à plat : elles savent s’il fait clair ou sombre, pas d’où vient la lumière.',
    },
    {
      t: 'Cupule',
      d: 'Des cellules au fond d’un creux : chaque côté ne reçoit qu’une partie des directions. Une image très floue apparaît.',
    },
    {
      t: 'Œil à sténopé',
      d: 'Une petite ouverture ne laisse passer qu’un rayon par direction : l’image est nette mais sombre, donc bruitée.',
    },
    {
      t: 'Œil à cristallin',
      d: 'Une lentille collecte un large faisceau et le refocalise : l’image est à la fois nette et lumineuse.',
    },
  ];
  let stade = $state(0);
  let images: Img[] = $state([]);

  onMount(() => {
    const s = scenePaysage(192, 144);
    const alea = creerAlea(5);
    // 0 : une seule valeur (moyenne)
    const m = [0, 0, 0];
    for (let i = 0; i < s.l * s.h; i++) for (let k = 0; k < 3; k++) m[k] += s.d[3 * i + k] / (s.l * s.h);
    const i0 = creerImg(s.l, s.h, 3);
    for (let i = 0; i < s.l * s.h; i++) for (let k = 0; k < 3; k++) i0.d[3 * i + k] = m[k];
    // 1 : flou énorme
    const i1 = flouGauss(s, 22);
    // 2 : net mais pauvre en photons (≈ 6 photons / pixel), image renormalisée
    const i2b = flouGauss(s, 1.2);
    const i2 = creerImg(s.l, s.h, 3);
    const n = 6;
    for (let i = 0; i < i2.d.length; i++) i2.d[i] = poisson(alea, i2b.d[i] * n) / n;
    // 3 : net et lumineux
    const i3 = flouGauss(s, 0.5);
    images = [i0, i1, i2, i3];
  });
</script>

<Panneau>
  {#snippet figure()}
    <div class="grille">
      <svg viewBox="0 0 300 220" role="img" aria-label={`Coupe schématique : ${stades[stade].t}`}>
        <defs>
          <linearGradient id="oeil-rayon" x1="0" x2="1">
            <stop offset="0" stop-color="var(--accent)" stop-opacity="0" />
            <stop offset="1" stop-color="var(--accent)" stop-opacity="0.9" />
          </linearGradient>
        </defs>
        {#if stade === 0}
          {#each Array(9) as _, i}
            <line class="ray" x1={20 + i * 12} y1={40 + (i % 3) * 18} x2={110 + i * 12} y2="150" />
          {/each}
          <rect class="tissu" x="80" y="150" width="160" height="16" rx="3" />
          {#each Array(14) as _, i}<rect class="recep" x={85 + i * 11} y="146" width="6" height="8" rx="2" />{/each}
        {:else if stade === 1}
          <path class="tissu-p" d="M70 60 Q70 190 160 190 Q250 190 250 60" />
          {#each Array(13) as _, i}
            {@const a = Math.PI * (0.08 + (0.84 * i) / 12)}
            <circle class="recep" cx={160 - 86 * Math.cos(a)} cy={70 + 116 * Math.sin(a)} r="3.2" />
          {/each}
          {#each Array(6) as _, i}<line class="ray" x1="10" y1={30 + i * 10} x2={190 + i * 9} y2={150 + i * 6} />{/each}
        {:else}
          <circle class="tissu-p" cx="170" cy="110" r="78" />
          {#each Array(15) as _, i}
            {@const a = Math.PI * (0.55 + (0.9 * i) / 14) - Math.PI}
            <circle class="recep" cx={170 - 72 * Math.cos(a)} cy={110 + 72 * Math.sin(a)} r="3.2" />
          {/each}
          <rect class="masque" x="88" y="70" width="10" height="80" />
          {#if stade === 2}
            <line class="ray" x1="10" y1="50" x2="242" y2="166" />
            <line class="ray b" x1="10" y1="170" x2="242" y2="55" />
          {:else}
            <ellipse class="lentille" cx="93" cy="110" rx="9" ry="34" />
            {#each [-26, -13, 0, 13, 26] as dy}
              <polyline class="ray" points={`10,50 93,${110 + dy} 238,158`} />
              <polyline class="ray b" points={`10,170 93,${110 + dy} 238,62`} />
            {/each}
          {/if}
        {/if}
        <text x="150" y="212" class="leg">{stades[stade].t}</text>
      </svg>
      <div class="vue">
        <Toile image={images[stade]} etiquette="Ce que mesurent les cellules" lisse={stade === 1} />
      </div>
    </div>
    <p class="desc">{stades[stade].d}</p>
  {/snippet}
  {#snippet controles()}
    <Bascule
      label="Stade d’évolution"
      bind:value={stade}
      options={stades.map((s, i) => ({ valeur: i, texte: `${i + 1}. ${s.t}` }))}
    />
  {/snippet}
</Panneau>

<style>
  .grille {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.25rem;
    align-items: center;
    padding: 1.1rem 1.1rem 0.4rem;
  }
  @media (max-width: 560px) {
    .grille {
      grid-template-columns: 1fr;
    }
  }
  svg {
    width: 100%;
    height: auto;
  }
  .ray {
    stroke: url(#oeil-rayon);
    stroke: var(--accent);
    stroke-opacity: 0.75;
    stroke-width: 1.4;
    fill: none;
  }
  .ray.b {
    stroke: #3f8cff;
  }
  .tissu {
    fill: var(--papier-3);
  }
  .tissu-p {
    fill: var(--papier-2);
    stroke: var(--filet-fort);
    stroke-width: 10;
    stroke-linecap: round;
  }
  .recep {
    fill: var(--accent);
    opacity: 0.85;
  }
  .masque {
    fill: var(--papier);
  }
  .lentille {
    fill: color-mix(in oklab, #9fc4ff 45%, transparent);
    stroke: #6f9be0;
    stroke-width: 1.2;
  }
  .leg {
    text-anchor: middle;
    font-family: var(--f-titre);
    font-size: 14px;
    fill: var(--encre-2);
  }
  .desc {
    margin: 0.4rem 1.1rem 1rem;
    color: var(--encre-2);
    font-size: 0.98rem;
  }
</style>
