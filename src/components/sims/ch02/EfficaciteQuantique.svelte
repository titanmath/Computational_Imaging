<script lang="ts">
  // α(λ) = E[N_e] / N_γ : sur 1000 photons incidents, combien deviennent des électrons ?
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { qeTypique } from '@/lib/sim/capteur';
  import { hexSpectral } from '@/lib/sim/couleur';
  import { creerAlea } from '@/lib/sim/rng';

  let lambda = $state(460);
  let tirage = $state(1);
  const X = (l: number) => 40 + ((l - 250) / 800) * 330;
  const Y = (q: number) => 200 - q * 170;
  const courbe = Array.from({ length: 81 }, (_, i) => 250 + i * 10)
    .map((l, i) => `${i ? 'L' : 'M'}${X(l)},${Y(qeTypique(l))}`)
    .join(' ');
  const qe = $derived(qeTypique(lambda));
  // 100 photons dessinés (= 1000 / 10), chacun converti avec la probabilité α
  const grille = $derived.by(() => {
    const a = creerAlea(tirage * 31 + Math.round(lambda));
    return Array.from({ length: 100 }, () => a() < qe);
  });
  const nElectrons = $derived(grille.filter(Boolean).length * 10);
</script>

<Panneau>
  {#snippet figure()}
    <div class="g2">
      <svg viewBox="0 0 390 230" role="img" aria-label={`Efficacité quantique ${(qe * 100).toFixed(0)} % à ${lambda} nm`}>
        {#each [0, 0.2, 0.4, 0.6, 0.8, 1] as q}
          <line x1="40" x2="370" y1={Y(q)} y2={Y(q)} class="grille" />
          <text x="34" y={Y(q) + 4} class="g d">{q * 100}</text>
        {/each}
        {#each [250, 450, 650, 850, 1050] as l}<text x={X(l)} y="220" class="g m">{l}</text>{/each}
        <text x="6" y="14" class="g">QE (%)</text>
        <text x="370" y="220" class="g d">λ (nm)</text>
        <path d={courbe} class="courbe" />
        <line x1={X(lambda)} x2={X(lambda)} y1="30" y2="200" class="repere" />
        <circle cx={X(lambda)} cy={Y(qe)} r="6" fill={hexSpectral(Math.min(780, Math.max(380, lambda)))} stroke="var(--papier)" stroke-width="2" />
      </svg>
      <div class="conversion">
        <div class="points" aria-hidden="true">
          {#each grille as e}<span class:e style={`--c:${hexSpectral(Math.min(780, Math.max(380, lambda)))}`}></span>{/each}
        </div>
        <p>1 000 photons à {lambda} nm → <strong>≈ {nElectrons} électrons</strong> (α ≈ {(qe * 100).toFixed(0)} %)</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Longueur d’onde" bind:value={lambda} min={250} max={1050} step={10} unite="nm" />
  {/snippet}
  {#snippet lecture()}
    <Bouton onclick={() => tirage++}>Nouveau tirage</Bouton>
  {/snippet}
</Panneau>

<style>
  .g2 { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 0.8rem 1rem 0.3rem; }
  @media (max-width: 600px) { .g2 { grid-template-columns: 1fr; } }
  svg { width: 100%; height: auto; font-family: var(--f-texte); }
  .grille { stroke: var(--filet); }
  .g { font-size: 10.5px; fill: var(--encre-3); }
  .g.d { text-anchor: end; }
  .g.m { text-anchor: middle; }
  .courbe { fill: none; stroke: var(--encre); stroke-width: 2; }
  .repere { stroke: var(--encre-3); stroke-dasharray: 3 3; }
  .points { display: grid; grid-template-columns: repeat(10, 1fr); gap: 5px; max-width: 15rem; }
  .points span { aspect-ratio: 1; border-radius: 50%; background: var(--filet); transition: background 0.3s; }
  .points span.e { background: var(--c); box-shadow: 0 0 6px var(--c); }
  .conversion p { margin: 0.8rem 0 0; font-size: 0.92rem; color: var(--encre-2); }
</style>
