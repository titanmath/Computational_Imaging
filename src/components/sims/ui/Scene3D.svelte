<script lang="ts">
  // Enveloppe commune des scènes 3D : chargement différé de three.js, boucle de rendu
  // qui ne tourne que si la scène est visible, qualité adaptative, plein écran, repli.
  import { onMount, type Snippet } from 'svelte';
  import type { InstanceScene, ModuleScene } from '@/lib/gl/types';
  import { Qualite, webgl2Disponible } from '@/lib/gl/qualite';
  import Panneau from './Panneau.svelte';
  import Bouton from './Bouton.svelte';

  interface Props {
    charger: () => Promise<ModuleScene>;
    params?: Record<string, unknown>;
    titre: string;
    /** Rapport largeur / hauteur du canvas. */
    ratio?: number;
    /** Rapport utilisé sous 640 px de large (plus haut pour garder de la place). */
    ratioMobile?: number;
    indice?: string;
    poster?: string;
    controles?: Snippet;
    /** Contenu affiché sous le canvas, dans la figure (ex. un diagramme 2D associé). */
    annexe?: Snippet;
    note?: string;
  }
  let {
    charger,
    params = {},
    titre,
    ratio = 16 / 9,
    ratioMobile = 4 / 3,
    indice,
    poster,
    controles: controlesSnippet,
    annexe,
    note,
  }: Props = $props();

  type Etat = 'attente' | 'chargement' | 'pret' | 'repli' | 'erreur';
  let etat = $state<Etat>('attente');
  let texteEtat = $state('');
  let cadre: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let instance: InstanceScene | undefined;
  let renderer: import('three').WebGLRenderer | undefined;
  let qualite = new Qualite();
  let visible = false;
  let raf = 0;
  let dernier = 0;
  let forcer = false;
  let detruit = false;

  function actif() {
    return visible && !document.hidden && instance && !detruit;
  }

  function demanderRendu() {
    if (!raf && actif()) {
      dernier = performance.now();
      raf = requestAnimationFrame(boucle);
    }
  }

  let dernierEtat = 0;
  function boucle(maintenant: number) {
    raf = 0;
    if (!actif()) return;
    const dt = maintenant - dernier;
    dernier = maintenant;
    qualite.observer(dt, maintenant);
    const encore = instance!.frame(maintenant / 1000, Math.min(dt, 100) / 1000);
    if (instance!.etat && maintenant - dernierEtat > 250) {
      texteEtat = instance!.etat();
      dernierEtat = maintenant;
    }
    if (encore && !raf) raf = requestAnimationFrame(boucle);
  }

  function taille() {
    if (!renderer || !canvas) return;
    const r = cadre.getBoundingClientRect();
    renderer.setPixelRatio(qualite.ratioPixels);
    renderer.setSize(r.width, r.height, false);
    instance?.redimensionner?.(r.width, r.height);
    demanderRendu();
  }

  async function demarrer() {
    if (etat !== 'attente' && etat !== 'repli') return;
    etat = 'chargement';
    try {
      const [THREE, mod] = await Promise.all([import('three'), charger()]);
      if (detruit) return;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const r = cadre.getBoundingClientRect();
      renderer.setPixelRatio(qualite.ratioPixels);
      renderer.setSize(r.width, r.height, false);
      instance = await mod.default({
        THREE,
        renderer,
        canvas,
        qualite,
        largeur: r.width,
        hauteur: r.height,
        params: { ...params },
        demanderRendu,
      });
      if (detruit) {
        instance.detruire();
        return;
      }
      qualite.surChangement(taille);
      etat = 'pret';
      taille();
    } catch (e) {
      console.error(e);
      etat = 'erreur';
    }
  }

  onMount(() => {
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!webgl2Disponible() || (reduit && !forcer)) etat = 'repli';

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && etat === 'attente') demarrer();
        if (visible) demanderRendu();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(cadre);
    const ro = new ResizeObserver(() => taille());
    ro.observe(cadre);
    const surVisibilite = () => demanderRendu();
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      detruit = true;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', surVisibilite);
      if (raf) cancelAnimationFrame(raf);
      instance?.detruire();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  });

  // Les paramètres des curseurs sont transmis à la scène à chaque changement.
  $effect(() => {
    const p = { ...params };
    if (instance) {
      instance.maj?.(p);
      demanderRendu();
    }
  });

  function pleinEcran() {
    if (document.fullscreenElement) document.exitFullscreen();
    else cadre.requestFullscreen?.();
  }
  function lancerQuandMeme() {
    forcer = true;
    if (webgl2Disponible()) {
      etat = 'attente';
      demarrer();
    }
  }
</script>

<Panneau sombre {note}>
  {#snippet figure()}
    <div
      class="cadre"
      bind:this={cadre}
      style={`--ratio:${ratio};--ratio-m:${ratioMobile}`}
      role="img"
      aria-label={titre}
    >
      <canvas bind:this={canvas} class:visible={etat === 'pret'}></canvas>
      {#if etat === 'chargement' || etat === 'attente'}
        <div class="message chargement"><span class="lueur"></span>Préparation de la scène 3D…</div>
      {:else if etat === 'repli'}
        <div class="message repli" style={poster ? `background-image:url(${poster})` : ''}>
          <p>{titre}</p>
          <Bouton principal onclick={lancerQuandMeme}>Lancer la scène 3D</Bouton>
        </div>
      {:else if etat === 'erreur'}
        <div class="message"><p>La scène 3D n’a pas pu démarrer sur cet appareil.</p></div>
      {/if}
    </div>
    {#if annexe}<div class="annexe">{@render annexe()}</div>{/if}
  {/snippet}
  {#snippet controles()}
    {#if controlesSnippet}{@render controlesSnippet()}{/if}
  {/snippet}
  {#snippet lecture()}
    <div class="outils">
      {#if indice && etat === 'pret'}<span class="indice">{indice}</span>{/if}
      {#if texteEtat}<span class="etat">{texteEtat}</span>{/if}
      <Bouton onclick={pleinEcran} titre="Plein écran">
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"
          ><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" /></svg
        >
        Plein écran
      </Bouton>
    </div>
  {/snippet}
</Panneau>

<style>
  .cadre {
    position: relative;
    width: 100%;
    aspect-ratio: var(--ratio);
    background: radial-gradient(120% 90% at 50% 30%, #181c22 0%, var(--table) 70%);
    touch-action: pan-y;
  }
  @media (max-width: 640px) {
    .cadre {
      aspect-ratio: var(--ratio-m);
    }
  }
  .cadre:fullscreen {
    aspect-ratio: auto;
    width: 100vw;
    height: 100vh;
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.6s var(--ease);
  }
  canvas.visible {
    opacity: 1;
  }
  .message {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 0.9rem;
    padding: 1.5rem;
    text-align: center;
    color: var(--table-encre-2);
    font-size: 0.9rem;
    background-size: cover;
    background-position: center;
  }
  .message p {
    margin: 0;
    max-width: 28rem;
    color: var(--table-encre);
  }
  .chargement {
    grid-auto-flow: column;
    align-items: center;
    gap: 0.6rem;
  }
  .lueur {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-sombre);
    box-shadow: 0 0 12px var(--accent-sombre);
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
      transform: scale(0.7);
    }
  }
  .annexe {
    border-top: 1px solid var(--table-filet);
  }
  .outils {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .indice,
  .etat {
    font-size: 0.78rem;
    color: var(--table-encre-2);
    font-variant-numeric: tabular-nums;
  }
</style>
