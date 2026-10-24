<script lang="ts">
  // Loi de Snell-Descartes à une interface plane, avec réflexion partielle (Fresnel),
  // réflexion totale interne et dispersion (l'indice dépend de la longueur d'onde).
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import { indiceCauchy } from '@/lib/optique/lentille';

  let theta1 = $state(40);
  let milieux = $state<'air-verre' | 'verre-air' | 'air-eau'>('air-verre');
  let dispersion = $state(false);

  const indices = $derived(
    milieux === 'air-verre'
      ? { n1: () => 1.0003, n2: (l: number) => indiceCauchy(l), h: 'air', b: 'verre' }
      : milieux === 'verre-air'
        ? { n1: (l: number) => indiceCauchy(l), n2: () => 1.0003, h: 'verre', b: 'air' }
        : { n1: () => 1.0003, n2: (l: number) => 1.324 + 3300 / (l * l), h: 'air', b: 'eau' },
  );
  const OX = 330;
  const OY = 170;
  const R = 150;
  const rad = (d: number) => (d * Math.PI) / 180;
  const t1 = $derived(rad(theta1));
  const lambdas = $derived(dispersion ? [450, 550, 650] : [550]);
  const couleurs: Record<number, string> = { 450: '#3d6bff', 550: '#2fb36a', 650: '#ff4a3d' };
  const refractes = $derived(
    lambdas.map((l) => {
      const n1 = indices.n1(l);
      const n2 = indices.n2(l);
      const s = (n1 / n2) * Math.sin(t1);
      return { l, n1, n2, t2: Math.abs(s) <= 1 ? Math.asin(s) : null };
    }),
  );
  // Réflectance de Fresnel (moyenne des polarisations s et p) à 550 nm
  const fresnel = $derived.by(() => {
    const r = refractes[Math.floor(refractes.length / 2)];
    if (r.t2 === null) return 1;
    const c1 = Math.cos(t1), c2 = Math.cos(r.t2);
    const rs = ((r.n1 * c1 - r.n2 * c2) / (r.n1 * c1 + r.n2 * c2)) ** 2;
    const rp = ((r.n1 * c2 - r.n2 * c1) / (r.n1 * c2 + r.n2 * c1)) ** 2;
    return (rs + rp) / 2;
  });
  const critique = $derived.by(() => {
    const n1 = indices.n1(550), n2 = indices.n2(550);
    return n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;
  });
  const arc = (a0: number, a1: number, r: number) => {
    const p = (a: number) => `${OX + r * Math.sin(a)},${OY + r * Math.cos(a)}`;
    return `M${p(a0)} A${r},${r} 0 0 ${a1 > a0 ? 0 : 1} ${p(a1)}`;
  };
</script>

<Panneau note={critique ? `Du verre vers l’air, au-delà de l’angle critique θc = arcsin(n₂/n₁) ≈ ${critique.toFixed(1)}°, aucune lumière ne sort : réflexion totale interne (c’est le principe des fibres optiques).` : undefined}>
  {#snippet figure()}
    <svg viewBox="0 0 660 340" role="img" aria-label={`Rayon incident à ${theta1}°`}>
      <rect x="0" y={OY} width="660" height={340 - OY} class="bas" />
      <text x="20" y={OY - 12} class="milieu">{indices.h} · n₁ = {indices.n1(550).toFixed(3)}</text>
      <text x="20" y={OY + 26} class="milieu">{indices.b} · n₂ = {indices.n2(550).toFixed(3)}</text>
      <line x1={OX} x2={OX} y1="10" y2="330" class="normale" />
      <text x={OX + 6} y="22" class="petit">normale</text>
      <!-- incident -->
      <line x1={OX - R * Math.sin(t1)} y1={OY - R * Math.cos(t1)} x2={OX} y2={OY} class="incident" />
      <path d={arc(Math.PI, Math.PI + t1, 46)} class="arc" />
      <!-- réfléchi -->
      <line x1={OX} y1={OY} x2={OX + R * Math.sin(t1)} y2={OY - R * Math.cos(t1)} class="reflechi" style={`opacity:${0.15 + 0.85 * fresnel}`} />
      <!-- réfractés -->
      {#each refractes as r}
        {#if r.t2 !== null}
          <line x1={OX} y1={OY} x2={OX + R * Math.sin(r.t2)} y2={OY + R * Math.cos(r.t2)} stroke={dispersion ? couleurs[r.l] : 'var(--accent)'} class="refracte" />
        {/if}
      {/each}
      <text x={OX - 70} y={OY - 60} class="angle">θ₁ = {theta1.toFixed(0)}°</text>
      {#if refractes[Math.floor(refractes.length / 2)].t2 !== null}
        <text x={OX + 20} y={OY + 90} class="angle">θ₂ = {((refractes[Math.floor(refractes.length / 2)].t2! * 180) / Math.PI).toFixed(1)}°</text>
      {:else}
        <text x={OX + 20} y={OY + 90} class="angle tir">réflexion totale interne</text>
      {/if}
      <text x={OX + 70} y={OY - 60} class="petit">réfléchi ({(fresnel * 100).toFixed(0)} %)</text>
    </svg>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Angle d’incidence θ₁" bind:value={theta1} min={0} max={89} step={1} unite="°" />
    <Bascule label="Milieux" bind:value={milieux} options={[{ valeur: 'air-verre', texte: 'air → verre' }, { valeur: 'air-eau', texte: 'air → eau' }, { valeur: 'verre-air', texte: 'verre → air' }]} />
    <Bascule label="Dispersion" bind:value={dispersion} options={[{ valeur: false, texte: '550 nm' }, { valeur: true, texte: 'Bleu / vert / rouge' }]} />
  {/snippet}
</Panneau>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .bas {
    fill: color-mix(in oklab, #7fb0e0 16%, var(--papier));
  }
  .milieu {
    font-size: 13px;
    fill: var(--encre-2);
    font-family: var(--f-texte);
  }
  .normale {
    stroke: var(--encre-3);
    stroke-dasharray: 4 4;
  }
  .incident {
    stroke: var(--encre);
    stroke-width: 2.5;
  }
  .reflechi {
    stroke: var(--encre-2);
    stroke-width: 2;
    stroke-dasharray: 6 3;
  }
  .refracte {
    stroke-width: 2.5;
  }
  .arc {
    fill: none;
    stroke: var(--encre-3);
  }
  .angle {
    font-family: var(--f-titre);
    font-size: 17px;
    fill: var(--encre);
  }
  .angle.tir {
    fill: var(--ambre);
  }
  .petit {
    font-size: 12px;
    fill: var(--encre-3);
    font-family: var(--f-texte);
  }
</style>
