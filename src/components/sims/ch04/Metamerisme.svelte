<script lang="ts">
  // Deux réflectances différentes, identiques pour nos cônes sous la lumière du jour… mais pas sous une autre lumière.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import GrapheSpectre from '../ui/GrapheSpectre.svelte';
  import { cssAdapte, deltaE, ILLUMINANTS, metamere, spectre, versXYZ, type NomIlluminant } from '@/lib/sim/spectres';

  let illum = $state<NomIlluminant>('D65');
  const A = spectre((l) => 0.32 + 0.22 * Math.exp(-((l - 610) ** 2) / (2 * 50 ** 2)) + 0.12 * Math.exp(-((l - 470) ** 2) / (2 * 30 ** 2)));
  const B = metamere(A, ILLUMINANTS.D65, 0.28);
  const E = $derived(ILLUMINANTS[illum]);
  const prod = (s: Float64Array, e: Float64Array) => s.map((v, i) => v * e[i]);
  const dE = $derived(deltaE(versXYZ(prod(A, E)), versXYZ(prod(B, E)), versXYZ(E)));
  const noms: Record<NomIlluminant, string> = { D65: 'lumière du jour (D65)', A: 'ampoule à incandescence (A)', F: 'tube fluorescent (F)', egal: 'spectre plat' };
</script>

<Panneau note="ΔE (CIELAB) : en dessous de ≈ 2, la différence est difficilement visible. Les couleurs affichées supposent l’œil adapté au blanc de l’éclairage. Spectres d’illuminants approchés.">
  {#snippet figure()}
    <div class="g">
      <div>
        <GrapheSpectre titre="Réflectances des deux surfaces" series={[{ valeurs: A, couleur: '#c0392b' }, { valeurs: B, couleur: '#2f7bf0', tirets: true }]} ymax={1} />
        <GrapheSpectre titre={`Éclairage : ${noms[illum]}`} series={[{ valeurs: E, couleur: 'var(--ambre)', remplir: true }]} hauteur={110} />
      </div>
      <div class="echant">
        <div class="duo">
          <span style={`background:${cssAdapte(A, E)}`}>A</span>
          <span style={`background:${cssAdapte(B, E)}`}>B</span>
        </div>
        <p class="de" class:visible={dE > 2}>ΔE = {dE.toFixed(1)} · {dE > 2 ? 'les deux surfaces ne se ressemblent plus' : 'indiscernables'}</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Éclairage" bind:value={illum} options={[{ valeur: 'D65', texte: 'Jour' }, { valeur: 'A', texte: 'Incandescence' }, { valeur: 'F', texte: 'Fluorescent' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 0.8rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  .duo { display: grid; grid-template-columns: 1fr 1fr; border-radius: 12px; overflow: hidden; border: 1px solid var(--filet); }
  .duo span { height: 8rem; display: grid; place-items: end center; padding-bottom: 0.4rem; font-weight: 700; color: rgb(255 255 255 / 0.75); text-shadow: 0 1px 2px rgb(0 0 0 / 0.4); transition: background 0.4s; }
  .de { margin: 0.6rem 0 0; font-size: 0.9rem; color: var(--encre-2); text-align: center; }
  .de.visible { color: var(--ambre); font-weight: 600; }
</style>
