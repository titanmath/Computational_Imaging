<script lang="ts">
  // Calibration par optimisation : on cherche (fₓ, k₁) qui minimisent l'erreur de reprojection d'une mire connue.
  // Carte d'erreur (clic = point de départ), itérations de Gauss-Newton animées, et vue image des coins.
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Bouton from '../ui/Bouton.svelte';
  import { dessinerCarte } from '@/lib/sim/colormaps';
  import { creerAlea, gauss } from '@/lib/sim/rng';

  const VRAI = { f: 800, k1: -0.18 };
  const CX = 320, CY = 240;
  const F0 = 560, F1 = 1040, K0 = -0.5, K1 = 0.2;
  // mire plane connue (pose connue : face à la caméra, Z = 1 m)
  const mire: [number, number][] = [];
  for (let j = -3; j <= 3; j++) for (let i = -4; i <= 4; i++) mire.push([i * 0.09, j * 0.075]);
  function projeter(f: number, k1: number, [X, Y]: [number, number]): [number, number] {
    const x = X, y = Y; // Z = 1
    const g = 1 + k1 * (x * x + y * y);
    return [f * x * g + CX, f * y * g + CY];
  }
  const alea = creerAlea(3);
  const observes = mire.map((p) => {
    const [u, v] = projeter(VRAI.f, VRAI.k1, p);
    return [u + 0.6 * gauss(alea), v + 0.6 * gauss(alea)] as [number, number];
  });
  function erreur(f: number, k1: number) {
    let s = 0;
    mire.forEach((p, i) => {
      const [u, v] = projeter(f, k1, p);
      s += (u - observes[i][0]) ** 2 + (v - observes[i][1]) ** 2;
    });
    return Math.sqrt(s / mire.length); // RMS en pixels
  }
  function pasGaussNewton(f: number, k1: number): [number, number] {
    // Jacobien numérique des résidus (2N × 2), puis (JᵀJ) δ = −Jᵀr
    const r0: number[] = [], Jf: number[] = [], Jk: number[] = [];
    const ef = 1e-3, ek = 1e-6;
    mire.forEach((p, i) => {
      const [u, v] = projeter(f, k1, p);
      const [uf, vf] = projeter(f + ef, k1, p);
      const [uk, vk] = projeter(f, k1 + ek, p);
      r0.push(u - observes[i][0], v - observes[i][1]);
      Jf.push((uf - u) / ef, (vf - v) / ef);
      Jk.push((uk - u) / ek, (vk - v) / ek);
    });
    let a = 0, b = 0, c = 0, ga = 0, gb = 0;
    for (let i = 0; i < r0.length; i++) {
      a += Jf[i] * Jf[i];
      b += Jf[i] * Jk[i];
      c += Jk[i] * Jk[i];
      ga += Jf[i] * r0[i];
      gb += Jk[i] * r0[i];
    }
    const det = a * c - b * b;
    return [f - (c * ga - b * gb) / det, k1 - (a * gb - b * ga) / det];
  }

  let carte: HTMLCanvasElement;
  let chemin = $state<[number, number][]>([[640, 0.1]]);
  let timer: ReturnType<typeof setInterval> | undefined;
  const courant = $derived(chemin[chemin.length - 1]);
  const err = $derived(erreur(courant[0], courant[1]));

  onMount(() => {
    const N = 90;
    const v = new Float64Array(N * N);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) v[j * N + i] = Math.log10(erreur(F0 + ((F1 - F0) * i) / (N - 1), K1 - ((K1 - K0) * j) / (N - 1)) + 0.3);
    const mn = Math.min(...v), mx = Math.max(...v);
    dessinerCarte(carte, v, N, N, undefined, (x) => 1 - (x - mn) / (mx - mn));
    return () => timer && clearInterval(timer);
  });
  const PX = (f: number) => ((f - F0) / (F1 - F0)) * 300;
  const PY = (k: number) => ((K1 - k) / (K1 - K0)) * 300;
  function depart(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const f = F0 + ((e.clientX - r.left) / r.width) * (F1 - F0);
    const k = K1 - ((e.clientY - r.top) / r.height) * (K1 - K0);
    if (timer) clearInterval(timer);
    chemin = [[f, k]];
  }
  function optimiser() {
    if (timer) clearInterval(timer);
    let n = 0;
    timer = setInterval(() => {
      const [f, k] = chemin[chemin.length - 1];
      chemin = [...chemin, pasGaussNewton(f, k)];
      if (++n >= 6) clearInterval(timer);
    }, 450);
  }
  const predits = $derived(mire.map((p) => projeter(courant[0], courant[1], p)));
</script>

<Panneau note="Mire de 9 × 7 coins à pose connue, image 640 × 480 px, bruit de détection 0,6 px. Valeurs vraies : fₓ = 800 px, k₁ = −0,18.">
  {#snippet figure()}
    <div class="g">
      <div>
        <div class="carte" role="button" tabindex="0" onclick={depart} onkeydown={() => {}} aria-label="Cliquer pour choisir le point de départ">
          <canvas bind:this={carte}></canvas>
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <polyline points={chemin.map(([f, k]) => `${PX(f)},${PY(k)}`).join(' ')} class="ch" />
            {#each chemin as [f, k], i}<circle cx={PX(f)} cy={PY(k)} r={i === chemin.length - 1 ? 5 : 3} class="pt" />{/each}
            <circle cx={PX(VRAI.f)} cy={PY(VRAI.k1)} r="6" class="vrai" />
          </svg>
        </div>
        <p class="leg">Erreur de reprojection en fonction de (fₓ →, k₁ ↑). Clique pour choisir le départ.</p>
      </div>
      <div>
        <svg viewBox="0 0 640 480" class="image" role="img" aria-label="Coins observés et prédits">
          <rect width="640" height="480" class="fond" />
          {#each observes as [u, v], i}
            <line x1={u} y1={v} x2={predits[i][0]} y2={predits[i][1]} class="res" />
            <circle cx={u} cy={v} r="5" class="obs" />
            <path d={`M${predits[i][0] - 5} ${predits[i][1]} h10 M${predits[i][0]} ${predits[i][1] - 5} v10`} class="pred" />
          {/each}
        </svg>
        <p class="leg">● observés · + prédits avec θ courant · résidus</p>
        <p class="val">fₓ = {courant[0].toFixed(1)} px · k₁ = {courant[1].toFixed(4)} · <b>RMS = {err.toFixed(2)} px</b> · itération {chemin.length - 1}</p>
      </div>
    </div>
  {/snippet}
  {#snippet lecture()}
    <Bouton principal onclick={optimiser}>Optimiser (Gauss-Newton)</Bouton>
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: 1rem; padding: 1rem 1.1rem 0.3rem; align-items: start; }
  @media (max-width: 620px) { .g { grid-template-columns: 1fr; } }
  .carte { position: relative; cursor: crosshair; }
  .carte canvas, .carte svg { width: 100%; aspect-ratio: 1; display: block; border-radius: 6px; }
  .carte svg { position: absolute; inset: 0; }
  .ch { fill: none; stroke: #fff; stroke-width: 2; }
  .pt { fill: #fff; stroke: #000; }
  .vrai { fill: none; stroke: #3cffc0; stroke-width: 2.5; }
  .image { width: 100%; height: auto; border-radius: 6px; }
  .fond { fill: var(--papier-2); }
  .obs { fill: var(--encre); }
  .pred { stroke: var(--accent); stroke-width: 2.5; }
  .res { stroke: var(--ambre); stroke-width: 2; }
  .leg { margin: 0.35rem 0 0; font-size: 0.78rem; color: var(--encre-3); text-align: center; }
  .val { margin: 0.3rem 0 0; font-size: 0.85rem; text-align: center; font-variant-numeric: tabular-nums; }
</style>
