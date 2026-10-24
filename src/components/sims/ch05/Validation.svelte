<script lang="ts">
  // Valider hors des données d'ajustement : un modèle de distorsion ajusté seulement au centre
  // peut sembler parfait… et se tromper sur les bords.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  let bruit = $state(0.3); // px
  const VRAI = { k1: -0.2, k2: 0.09 };
  const f = 1000;
  // points : rayon normalisé r, et déplacement radial mesuré Δ = f·r·(k1 r² + k2 r⁴) + bruit
  const deplacement = (r: number, k1: number, k2: number) => f * r * (k1 * r * r + k2 * r ** 4);
  const ajuster = (pts: { r: number; d: number }[]) => {
    // moindres carrés linéaires sur (k1, k2) : d = f r³ k1 + f r⁵ k2
    let a = 0, b = 0, c = 0, g1 = 0, g2 = 0;
    for (const { r, d } of pts) {
      const u = f * r ** 3, v = f * r ** 5;
      a += u * u; b += u * v; c += v * v; g1 += u * d; g2 += v * d;
    }
    const det = a * c - b * b;
    return { k1: (c * g1 - b * g2) / det, k2: (a * g2 - b * g1) / det };
  };
  const rms = (pts: { r: number; d: number }[], k: { k1: number; k2: number }) =>
    Math.sqrt(pts.reduce((s, p) => s + (deplacement(p.r, k.k1, k.k2) - p.d) ** 2, 0) / pts.length);
  const res = $derived.by(() => {
    const a = creerAlea(8);
    const tirer = (r0: number, r1: number, n: number) => Array.from({ length: n }, () => {
      const r = r0 + (r1 - r0) * a();
      return { r, d: deplacement(r, VRAI.k1, VRAI.k2) + bruit * gauss(a) };
    });
    const centre = tirer(0, 0.35, 40), large = tirer(0, 0.8, 40);
    const neufCentre = tirer(0, 0.35, 40), neufBord = tirer(0.6, 0.8, 40);
    const kc = ajuster(centre), kl = ajuster(large);
    return {
      kc, kl,
      lignes: [
        { nom: 'Ajusté au centre seul', fit: rms(centre, kc), c: rms(neufCentre, kc), b: rms(neufBord, kc) },
        { nom: 'Ajusté sur tout le champ', fit: rms(large, kl), c: rms(neufCentre, kl), b: rms(neufBord, kl) },
      ],
    };
  });
  const max = $derived(Math.max(...res.lignes.flatMap((l) => [l.fit, l.c, l.b]), 1));
</script>

<Panneau note={`Distorsion vraie : k₁ = ${VRAI.k1}, k₂ = ${VRAI.k2} ; fₓ = 1 000 px. Le centre seul ne contraint presque pas k₂ (terme en r⁵).`}>
  {#snippet figure()}
    <div class="tab">
      {#each res.lignes as l}
        <div class="ligne">
          <p class="nom">{l.nom}</p>
          {#each [['données d’ajustement', l.fit], ['nouveaux points au centre', l.c], ['nouveaux points au bord', l.b]] as [n, v]}
            <div class="barre"><span class="n">{n}</span><span class="b" style={`width:${Math.min(100, (Number(v) / max) * 100)}%`}></span><span class="v">{Number(v).toFixed(2)} px</span></div>
          {/each}
        </div>
      {/each}
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Bruit de détection des coins" bind:value={bruit} min={0.05} max={1.5} step={0.05} unite="px" />
    <p class="info">k estimés : centre ({res.kc.k1.toFixed(3)} ; {res.kc.k2.toFixed(3)}) · champ ({res.kl.k1.toFixed(3)} ; {res.kl.k2.toFixed(3)})</p>
  {/snippet}
</Panneau>

<style>
  .tab { display: grid; gap: 1rem; padding: 1rem 1.1rem 0.4rem; }
  .nom { margin: 0 0 0.35rem; font-family: var(--f-titre); font-size: 1.05rem; }
  .barre { display: grid; grid-template-columns: 12rem 1fr 4.5rem; gap: 0.6rem; align-items: center; font-size: 0.85rem; margin-bottom: 0.25rem; }
  @media (max-width: 520px) { .barre { grid-template-columns: 8rem 1fr 4rem; font-size: 0.78rem; } }
  .n { color: var(--encre-2); }
  .b { height: 10px; border-radius: 3px; background: var(--accent); transition: width 0.3s; }
  .v { font-variant-numeric: tabular-nums; text-align: right; }
  .info { margin: 0; font-size: 0.82rem; color: var(--encre-3); align-self: center; font-variant-numeric: tabular-nums; }
</style>
