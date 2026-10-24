<script lang="ts">
  // Ouverture, temps de pose, gain (ISO) : trois façons d'obtenir la même luminosité, avec trois effets secondaires.
  //   photons ∝ T / N²   ·   flou de bougé ∝ T   ·   profondeur de champ ↓ quand N ↓   ·   bruit relatif ∝ 1/√photons
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { flouGauss } from '@/lib/sim/conv';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { creerAlea, gauss, poisson } from '@/lib/sim/rng';

  let N = $state(4);
  let T = $state(1 / 60);
  let iso = $state(400);
  let fond: Img | undefined;
  let rendu: Img | undefined = $state();
  const L = 220, H = 165;

  const ev = $derived(Math.log2((T / (N * N)) * (iso / 400) / (1 / 60 / 16)));
  const etat = $derived(ev > 0.7 ? `surexposée de ${ev.toFixed(1)} IL` : ev < -0.7 ? `sous-exposée de ${(-ev).toFixed(1)} IL` : 'exposition correcte');

  function calculer() {
    if (!fond) return;
    // profondeur de champ : la balle est nette, le fond se floute quand on ouvre
    const bg = flouGauss(fond, Math.max(0, 7 / N - 0.6));
    const img = creerImg(L, H, 3);
    img.d.set(bg.d);
    // balle en mouvement (vitesse 900 px/s) : on moyenne ses positions pendant T
    const K = 32;
    const v = 900;
    const cy = H * 0.73, r = 13;
    const couv = new Float32Array(L * H);
    for (let k = 0; k < K; k++) {
      const cx = L * 0.5 + v * T * (k / (K - 1) - 0.5);
      for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
        for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
          if (x < 0 || y < 0 || x >= L || y >= H) continue;
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          couv[y * L + x] += Math.min(1, Math.max(0, r + 0.5 - d)) / K;
        }
    }
    const balle = [0.85, 0.28, 0.05];
    for (let i = 0; i < L * H; i++) for (let c = 0; c < 3; c++) img.d[3 * i + c] = img.d[3 * i + c] * (1 - couv[i]) + balle[c] * couv[i];
    // capteur : électrons ∝ T/N², gain ∝ ISO
    const alea = creerAlea(7);
    const k = 900 * ((T * 60) / ((N * N) / 16));
    const gain = iso / 400 / 900;
    const puits = 4000;
    for (let i = 0; i < img.d.length; i++) {
      const e = Math.min(puits, poisson(alea, img.d[i] * k));
      img.d[i] = Math.min(1, Math.max(0, gain * (e + 2.5 * gauss(alea))));
    }
    rendu = img;
  }
  onMount(() => {
    fond = scenePaysage(L, H);
    calculer();
  });
  let attente = 0;
  $effect(() => {
    void N, T, iso;
    cancelAnimationFrame(attente);
    attente = requestAnimationFrame(calculer);
  });
  const fmtT = (t: number) => (t >= 0.5 ? `${t.toFixed(1)} s` : `1/${Math.round(1 / t)} s`);
</script>

<Panneau note="Référence : f/4, 1/60 s, ISO 400. Chaque « IL » (indice de lumination) double ou divise par deux la lumière.">
  {#snippet figure()}
    <div class="g">
      <Toile image={rendu} lisse />
      <div class="lecture">
        <p class="etat" class:alerte={Math.abs(ev) > 0.7}>Image {etat}</p>
        <dl>
          <div><dt>Photons reçus</dt><dd>× {((T * 60) / ((N * N) / 16)).toFixed(2)}</dd></div>
          <div><dt>Gain (ISO)</dt><dd>× {(iso / 400).toFixed(2)}</dd></div>
          <div><dt>Flou de bougé</dt><dd>{(900 * T).toFixed(0)} px</dd></div>
          <div><dt>Profondeur de champ</dt><dd>{N >= 8 ? 'grande' : N >= 3.5 ? 'moyenne' : 'faible'}</dd></div>
        </dl>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Ouverture N" bind:value={N} min={1.4} max={16} log step={0.1} format={(v) => 'f/' + v.toFixed(1)} />
    <Curseur label="Temps de pose T" bind:value={T} min={1 / 2000} max={1 / 4} log format={fmtT} />
    <Curseur label="ISO" bind:value={iso} min={100} max={12800} log step={1} format={(v) => String(Math.round(v / 50) * 50)} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 1.2rem; align-items: center; padding: 1rem 1.1rem 0.4rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  .etat { margin: 0 0 0.6rem; font-family: var(--f-titre); font-size: 1.15rem; }
  .etat.alerte { color: var(--ambre); }
  dl { margin: 0; display: grid; gap: 0.35rem; }
  dl div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.9rem; border-bottom: 1px solid var(--filet); padding-bottom: 0.25rem; }
  dt { color: var(--encre-3); }
  dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; }
</style>
