<script lang="ts">
  // L(λ) = E(λ) ρ(λ) / π : l'illuminant et la réflectance façonnent le stimulus ; V(λ) en donne la luminance.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import GrapheSpectre from '../ui/GrapheSpectre.svelte';
  import { cssAdapte, ILLUMINANTS, integrer, spectre, V, type NomIlluminant } from '@/lib/sim/spectres';

  let illum = $state<NomIlluminant>('D65');
  let surface = $state<'tomate' | 'feuille' | 'ciel' | 'gris'>('tomate');
  const REFL = {
    tomate: spectre((l) => 0.06 + 0.72 / (1 + Math.exp(-(l - 595) / 12))),
    feuille: spectre((l) => 0.05 + 0.32 * Math.exp(-((l - 545) ** 2) / (2 * 28 ** 2)) + 0.6 / (1 + Math.exp(-(l - 710) / 12))),
    ciel: spectre((l) => 0.12 + 0.55 * Math.exp(-((l - 470) ** 2) / (2 * 45 ** 2))),
    gris: spectre(() => 0.18),
  };
  const E = $derived(ILLUMINANTS[illum]);
  const rho = $derived(REFL[surface]);
  const L = $derived(E.map((e, i) => e * rho[i]));
  const VL = spectre(V);
  const Lv = $derived(integrer(L, V) / integrer(E, V));
</script>

<Panneau note="Les courbes sont relatives (illuminants approchés, normalisés à 560 nm). La luminance relative compare la surface à un blanc parfait sous le même éclairage : c’est la « réflectance photométrique » vue par l’œil.">
  {#snippet figure()}
    <div class="g">
      <GrapheSpectre titre="Illuminant E(λ)" series={[{ valeurs: E, couleur: 'var(--ambre)', remplir: true }]} hauteur={130} />
      <GrapheSpectre titre="Réflectance ρ(λ)" series={[{ valeurs: rho, couleur: 'var(--encre)', remplir: true }]} ymax={1} hauteur={130} />
      <GrapheSpectre titre="Stimulus E·ρ et pondération V(λ)" series={[{ valeurs: L, couleur: 'var(--accent)', remplir: true }, { valeurs: VL.map((v) => v * Math.max(...L)), couleur: 'var(--encre-3)', tirets: true }]} hauteur={130} />
      <div class="res">
        <span class="pastille" style={`background:${cssAdapte(rho, E)}`}></span>
        <p>Luminance relative<br /><b>{(Lv * 100).toFixed(1)} %</b></p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Éclairage" bind:value={illum} options={[{ valeur: 'D65', texte: 'Jour' }, { valeur: 'A', texte: 'Ampoule' }, { valeur: 'F', texte: 'Fluorescent' }]} />
    <Bascule label="Surface" bind:value={surface} options={[{ valeur: 'tomate', texte: 'Tomate' }, { valeur: 'feuille', texte: 'Feuille' }, { valeur: 'ciel', texte: 'Bleu' }, { valeur: 'gris', texte: 'Gris 18 %' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem 1rem; padding: 0.8rem 1.1rem 0.3rem; align-items: center; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  .res { display: flex; gap: 1rem; align-items: center; }
  .pastille { width: 5rem; height: 5rem; border-radius: 12px; border: 1px solid var(--filet); flex: none; }
  .res p { margin: 0; font-size: 0.9rem; color: var(--encre-2); }
  .res b { font-family: var(--f-titre); font-size: 1.5rem; color: var(--encre); }
</style>
