<script lang="ts">
  // Capteur nu vs sténopé : chaque point de l'objet éclaire le capteur ; sans ouverture,
  // les contributions se superposent. Profil d'intensité mesuré à droite.
  import Panneau from '../ui/Panneau.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Curseur from '../ui/Curseur.svelte';

  let mode = $state<'nu' | 'stenope'>('nu');
  let ouverture = $state(10); // largeur du trou (unités du schéma)

  const XO = 70; // objet
  const XB = 300; // barrière
  const XC = 470; // capteur
  const Y0 = 40;
  const Y1 = 280;
  const points = [
    { y: 80, c: '#e0359b' },
    { y: 220, c: '#2f7bf0' },
  ];
  const NB = 48; // cases du capteur

  // Rayons : pour chaque point, éventail de directions ; on garde ceux qui passent l'ouverture.
  const rayons = $derived.by(() => {
    const out: { y0: number; yb: number | null; yc: number; c: string }[] = [];
    for (const p of points)
      for (let k = 0; k <= 60; k++) {
        const yc = Y0 - 60 + ((Y1 - Y0 + 120) * k) / 60;
        const yb = p.y + ((yc - p.y) * (XB - XO)) / (XC - XO);
        if (mode === 'stenope' && Math.abs(yb - 160) > ouverture / 2) continue;
        if (yc < Y0 || yc > Y1) continue;
        out.push({ y0: p.y, yb: mode === 'stenope' ? yb : null, yc, c: p.c });
      }
    return out;
  });

  // Profil exact : fraction de chaque case du capteur éclairée par chaque point (à travers l'ouverture).
  const profil = $derived.by(() =>
    points.map((p) => {
      // yb = p.y + (yc − p.y)·k  ⇒  condition |yb − 160| ≤ w/2  ⇔  yc ∈ [lo, hi]
      const k = (XB - XO) / (XC - XO);
      const lo = mode === 'stenope' ? p.y + (160 - ouverture / 2 - p.y) / k : -Infinity;
      const hi = mode === 'stenope' ? p.y + (160 + ouverture / 2 - p.y) / k : Infinity;
      return Array.from({ length: NB }, (_, i) => {
        const a = Y0 + ((Y1 - Y0) * i) / NB;
        const b = Y0 + ((Y1 - Y0) * (i + 1)) / NB;
        return Math.max(0, Math.min(b, hi) - Math.max(a, lo)) / (b - a);
      });
    }),
  );
</script>

<Panneau>
  {#snippet figure()}
    <svg viewBox="0 0 640 320" role="img" aria-label={mode === 'nu' ? 'Capteur nu : les lumières des deux points se mélangent sur tout le capteur' : 'Sténopé : chaque point éclaire une seule zone du capteur'}>
      <!-- objet -->
      <line x1={XO} x2={XO} y1="70" y2="232" class="objet" />
      {#each points as p}<circle cx={XO} cy={p.y} r="6" fill={p.c} />{/each}
      <text x={XO} y="300" class="leg">objet</text>
      <!-- rayons -->
      {#each rayons as r}
        <polyline
          points={r.yb === null ? `${XO},${r.y0} ${XC},${r.yc}` : `${XO},${r.y0} ${XB},${r.yb} ${XC},${r.yc}`}
          stroke={r.c}
          class="ray"
        />
      {/each}
      <!-- barrière -->
      {#if mode === 'stenope'}
        <rect x={XB - 3} y="20" width="6" height={160 - ouverture / 2 - 20} class="barriere" />
        <rect x={XB - 3} y={160 + ouverture / 2} width="6" height={300 - 160 - ouverture / 2} class="barriere" />
        <text x={XB} y="314" class="leg">sténopé</text>
      {/if}
      <!-- capteur -->
      <rect x={XC} y={Y0} width="8" height={Y1 - Y0} class="capteur" />
      <text x={XC + 4} y="300" class="leg">capteur</text>
      <!-- profil d'intensité -->
      {#each profil as b, i}
        <polyline
          class="profil"
          stroke-dasharray={i === 0 ? '5 4' : undefined}
          stroke={points[i].c}
          points={b.map((v, k) => `${XC + 20 + v * (125 - i * 6)},${Y0 + ((k + 0.5) * (Y1 - Y0)) / NB}`).join(' ')}
        />
      {/each}
      <text x={XC + 85} y="300" class="leg">intensité mesurée</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Bascule label="Système" bind:value={mode} options={[{ valeur: 'nu', texte: 'Capteur nu' }, { valeur: 'stenope', texte: 'Avec un sténopé' }]} />
    {#if mode === 'stenope'}
      <Curseur label="Diamètre du trou" bind:value={ouverture} min={2} max={90} step={1} unite="u" />
    {/if}
  {/snippet}
</Panneau>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .objet {
    stroke: var(--encre-3);
    stroke-width: 2;
  }
  .ray {
    stroke-width: 0.7;
    stroke-opacity: 0.45;
    fill: none;
  }
  .barriere {
    fill: var(--encre);
  }
  .capteur {
    fill: var(--papier-3);
    stroke: var(--encre-2);
  }
  .profil {
    fill: none;
    stroke-width: 2;
  }
  .leg {
    text-anchor: middle;
    font-size: 12px;
    fill: var(--encre-3);
    font-family: var(--f-texte);
  }
</style>
