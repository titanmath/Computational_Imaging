<script lang="ts">
  // Banc d'aberrations 3D + diagramme de points (impacts de ~2000 rayons sur le capteur).
  import Scene3D from '../ui/Scene3D.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { impacts, type Aberration } from '@/lib/optique/banc';
  import { foyerParaxial } from '@/lib/optique/banc';
  import { hexSpectral } from '@/lib/sim/couleur';

  let type = $state<Aberration>('spherique');
  let decalage = $state(0);
  let canvas: HTMLCanvasElement;

  const textes: Record<Aberration, string> = {
    spherique: 'Les zones de la pupille ne focalisent pas au même endroit : les rayons du bord (magenta) se croisent avant ceux du centre (bleu). Au foyer paraxial, la tache montre un cœur entouré d’un halo.',
    coma: 'Pour un point hors axe, chaque anneau de la pupille forme son image à un endroit légèrement différent : la tache prend une forme de comète.',
    chromatique: 'L’indice du verre dépend de λ : le bleu est plus dévié que le rouge et focalise plus près de la lentille (aberration chromatique longitudinale).',
  };

  $effect(() => {
    if (!canvas) return;
    const t = type, d = decalage;
    const pts = impacts(t, foyerParaxial(t === 'chromatique') + d);
    const W = 300;
    canvas.width = W;
    canvas.height = W;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#0b0c0f';
    c.fillRect(0, 0, W, W);
    const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const mz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const etendue = 1.2; // ± mm affichés
    c.strokeStyle = '#2a2e35';
    c.beginPath();
    c.moveTo(W / 2, 0); c.lineTo(W / 2, W); c.moveTo(0, W / 2); c.lineTo(W, W / 2);
    c.stroke();
    c.globalCompositeOperation = 'lighter';
    for (const p of pts) {
      const x = W / 2 + ((p.z - mz) / etendue) * (W / 2);
      const y = W / 2 - ((p.y - my) / etendue) * (W / 2);
      c.fillStyle = t === 'chromatique' ? hexSpectral(p.lambda) + '88' : 'rgba(255,190,140,0.55)';
      c.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#9d998e';
    c.font = '11px system-ui';
    c.fillText('±1,2 mm', 8, W - 10);
  });
</script>

<Scene3D
  titre="Banc optique : un singulet réel tracé rayon par rayon (loi de Snell sur chaque dioptre)"
  charger={() => import('@/lib/gl/scenes/aberrations')}
  params={{ type, decalage }}
  ratio={2}
  ratioMobile={1.3}
  indice="Glisser pour tourner"
>
  {#snippet annexe()}
    <div class="annexe-int">
      <figure>
        <canvas bind:this={canvas}></canvas>
        <figcaption>Diagramme de points sur le capteur</figcaption>
      </figure>
      <p>{textes[type]}</p>
    </div>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Aberration" bind:value={type} options={[{ valeur: 'spherique', texte: 'Sphérique' }, { valeur: 'coma', texte: 'Coma (hors axe)' }, { valeur: 'chromatique', texte: 'Chromatique' }]} />
    <Curseur label="Capteur / foyer paraxial" bind:value={decalage} min={-8} max={4} step={0.25} unite="mm" />
  {/snippet}
</Scene3D>

<style>
  .annexe-int {
    display: grid;
    grid-template-columns: 9.5rem 1fr;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1.1rem;
  }
  figure {
    margin: 0;
  }
  canvas {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    display: block;
  }
  figcaption {
    font-size: 0.75rem;
    color: var(--table-encre-2);
    text-align: center;
    margin-top: 0.3rem;
  }
  p {
    margin: 0;
    font-size: 0.92rem;
    color: var(--table-encre);
    line-height: 1.5;
  }
</style>
