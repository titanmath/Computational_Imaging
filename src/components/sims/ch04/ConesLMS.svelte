<script lang="ts">
  // q_c = ∫ L(λ) s_c(λ) dλ : un spectre « vu » par trois cônes aux sensibilités larges et chevauchantes.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import GrapheSpectre from '../ui/GrapheSpectre.svelte';
  import { cssDeSpectre, lms, spectre, versLMS } from '@/lib/sim/spectres';

  let centre = $state(560);
  let largeur = $state(40);
  const stim = $derived(spectre((l) => Math.exp(-((l - centre) ** 2) / (2 * largeur ** 2))));
  const sL = spectre((l) => lms(l)[0]);
  const sM = spectre((l) => lms(l)[1]);
  const sS = spectre((l) => lms(l)[2]);
  const q = $derived(versLMS(stim));
  const qmax = $derived(Math.max(...q, 1e-9));
  const couleur = $derived(cssDeSpectre(stim, stim, 0.5));
</script>

<Panneau note="Fondamentales des cônes approchées (transformation de Hunt-Pointer-Estevez appliquée aux fonctions colorimétriques CIE 1931). La pastille montre la couleur perçue, luminosité normalisée.">
  {#snippet figure()}
    <div class="g">
      <GrapheSpectre titre="Sensibilités L, M, S et stimulus" series={[
        { valeurs: stim, couleur: 'var(--encre)', remplir: true },
        { valeurs: sL, couleur: '#e0453a', tirets: true },
        { valeurs: sM, couleur: '#2fa35a', tirets: true },
        { valeurs: sS, couleur: '#3a63d8', tirets: true },
      ]} ymax={1.05} />
      <div class="reponses">
        {#each [['L', '#e0453a'], ['M', '#2fa35a'], ['S', '#3a63d8']] as [n, c], k}
          <div class="barre"><span class="n">{n}</span><span class="b" style={`width:${(q[k] / qmax) * 100}%;background:${c}`}></span><span class="v">{(q[k] / qmax).toFixed(2)}</span></div>
        {/each}
        <div class="pastille" style={`background:${couleur}`}></div>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Longueur d’onde centrale" bind:value={centre} min={400} max={700} step={2} unite="nm" />
    <Curseur label="Largeur du spectre" bind:value={largeur} min={4} max={140} step={2} unite="nm" />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 1rem; align-items: center; padding: 0.9rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  .reponses { display: grid; gap: 0.5rem; }
  .barre { display: grid; grid-template-columns: 1.2rem 1fr 2.4rem; align-items: center; gap: 0.5rem; }
  .barre .n { font-weight: 700; font-size: 0.9rem; }
  .barre .b { height: 12px; border-radius: 3px; transition: width 0.2s; }
  .barre .v { font-size: 0.8rem; font-variant-numeric: tabular-nums; color: var(--encre-2); }
  .pastille { height: 4rem; border-radius: 10px; margin-top: 0.4rem; border: 1px solid var(--filet); }
</style>
