<script lang="ts">
  // Balance des blancs : l'illuminant teinte toute la scène ; des gains par canal la neutralisent.
  // Manuelle : on clique sur une surface neutre. Automatique : hypothèse du « monde gris ».
  import { onMount } from 'svelte';
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { scenePaysage } from '@/lib/sim/scenes';
  import { appliquerGains, gainsBalance, neutreMondeGris } from '@/lib/sim/isp';
  import type { Img } from '@/lib/sim/image';
  import { decoderSrgb } from '@/lib/sim/couleur';

  let kelvin = $state(3000);
  let mode = $state<'aucune' | 'manuelle' | 'auto'>('aucune');
  let scene: Img | undefined;
  let capture: Img | undefined = $state();
  let corrigee: Img | undefined = $state();
  let point = $state<[number, number]>([226, 79]); // coin blanc du panneau
  let gains = $state<[number, number, number]>([1, 1, 1]);

  /** Couleur (RGB linéaire, vert = 1) d'un corps noir à T kelvins — approximation de Tanner Helland. */
  function illuminant(T: number): [number, number, number] {
    const t = T / 100;
    const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    const g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755);
    const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305.0;
    const lin = [r, g, b].map((v) => decoderSrgb(Math.min(255, Math.max(0, v)) / 255));
    return [lin[0] / lin[1], 1, lin[2] / lin[1]];
  }

  function calculer() {
    if (!scene) return;
    const ill = illuminant(kelvin);
    const cap = appliquerGains(scene, ill.map((v) => v * 0.9) as [number, number, number]);
    capture = cap;
    let g: [number, number, number] = [1, 1, 1];
    if (mode === 'auto') g = gainsBalance(neutreMondeGris(cap), neutreMondeGris(cap)[1]);
    if (mode === 'manuelle') {
      const i = (point[1] * cap.l + point[0]) * 3;
      const n: [number, number, number] = [cap.d[i], cap.d[i + 1], cap.d[i + 2]];
      g = gainsBalance(n, n[1]);
    }
    gains = g;
    corrigee = appliquerGains(cap, g);
  }
  onMount(() => {
    scene = scenePaysage(240, 180);
    calculer();
  });
  $effect(() => {
    void kelvin, mode, point;
    calculer();
  });
  function viser(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    point = [Math.round(((e.clientX - r.left) / r.width) * 239), Math.round(((e.clientY - r.top) / r.height) * 179)];
    mode = 'manuelle';
  }
</script>

<Panneau note="Mode manuel : clique sur une surface qui devrait être neutre (blanc ou gris) dans l’image de gauche. Le monde gris suppose que la moyenne de la scène est grise : il échoue sur des scènes très colorées (ici, beaucoup de vert et de ciel).">
  {#snippet figure()}
    <div class="g">
      <div>
        <div class="vise" role="button" tabindex="0" onclick={viser} onkeydown={() => {}} aria-label="Cliquer sur une surface neutre">
          <Toile image={capture} lisse />
          {#if mode === 'manuelle'}<span class="mire" style={`left:${(point[0] / 240) * 100}%;top:${(point[1] / 180) * 100}%`}></span>{/if}
        </div>
        <p class="leg">Avant : RGB caméra sous {kelvin} K</p>
      </div>
      <div>
        <Toile image={mode === 'aucune' ? capture : corrigee} lisse />
        <p class="leg">Après : gains (a_R, a_G, a_B) = ({gains.map((g) => g.toFixed(2)).join(' ; ')})</p>
      </div>
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Température de l’éclairage" bind:value={kelvin} min={2000} max={10000} step={100} unite="K" format={(v) => v.toFixed(0)} />
    <Bascule label="Balance des blancs" bind:value={mode} options={[{ valeur: 'aucune', texte: 'Aucune' }, { valeur: 'manuelle', texte: 'Manuelle (clic)' }, { valeur: 'auto', texte: 'Auto (monde gris)' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
  .vise { position: relative; cursor: crosshair; }
  .mire { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #000; pointer-events: none; }
  .leg { margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--encre-3); text-align: center; font-variant-numeric: tabular-nums; }
</style>
