<script lang="ts">
  // Débrumage par canal sombre (He, Sun & Tang 2009). Brume simulée : I = J·t + A(1 − t), t = e^{−β d}
  // (d : profondeur). Canal sombre d(p) = min sur une fenêtre, min sur RGB ; A = pixel le plus brillant parmi
  // les 0,1 % de canal sombre le plus élevé ; t̃ = 1 − ω·dark(I/A) ; Ĵ = (I − A)/max(t̃, 0,1) + A.
  import Panneau from '../ui/Panneau.svelte';
  import Curseur from '../ui/Curseur.svelte';
  import Bascule from '../ui/Bascule.svelte';
  import Toile from '../ui/Toile.svelte';
  import { paysageProfondeur } from '@/lib/sim/scenes';
  import { canalSombre, debrumer } from '@/lib/sim/priors';
  import { creerImg, type Img } from '@/lib/sim/image';
  import { encoderSrgb } from '@/lib/sim/couleur';

  const l = 256, h = 128;
  const { rgb: J, profondeur } = paysageProfondeur(l, h);
  const AIR: [number, number, number] = [0.8, 0.84, 0.9];
  let beta = $state(0.25);
  let rayon = $state(7);
  let omega = $state(0.95);
  let derniere = $state<'estime' | 'vrai'>('estime');
  const I = $derived.by(() => {
    const d = new Float64Array(3 * l * h);
    for (let k = 0; k < l * h; k++) {
      const t = Math.exp(-beta * profondeur[k]);
      for (let c = 0; c < 3; c++) d[3 * k + c] = J.d[3 * k + c] * t + AIR[c] * (1 - t);
    }
    return d;
  });
  const res = $derived(debrumer(I, l, h, { r: rayon, omega }));
  const sombreClair = canalSombre(J.d, l, h, 7);
  const enImg = (d: ArrayLike<number>, c: 1 | 3): Img => {
    const im = creerImg(l, h, c);
    for (let i = 0; i < im.d.length; i++) im.d[i] = Math.min(1, Math.max(0, d[i]));
    return im;
  };
  const vueI = $derived(enImg(I, 3));
  const vueSombre = $derived(enImg(res.sombre, 1));
  const vueT = $derived(derniere === 'vrai' ? enImg(Float64Array.from(profondeur, (d) => Math.exp(-beta * d)), 1) : enImg(res.t, 1));
  const vueJ = $derived(enImg(res.J, 3));
  // PSNR en sRGB (comme on regarde l'image), sur les pixels à moins de 6 m : au-delà, t ≈ e^(−6β) devient
  // si petit que la division par t̃ amplifie la moindre erreur (et le ciel n'a pas de « vraie » couleur)
  const qualite = $derived.by(() => {
    let sI = 0, sJ = 0, n = 0;
    for (let k = 0; k < l * h; k++) {
      if (!(profondeur[k] < 6)) continue;
      for (let c = 0; c < 3; c++) {
        const ref = encoderSrgb(J.d[3 * k + c]);
        sI += (encoderSrgb(Math.min(1, I[3 * k + c])) - ref) ** 2;
        sJ += (encoderSrgb(Math.min(1, Math.max(0, res.J[3 * k + c]))) - ref) ** 2;
        n++;
      }
    }
    return { I: 10 * Math.log10(n / sI), J: 10 * Math.log10(n / sJ) };
  });
  const moyClair = sombreClair.reduce((s, v, k) => (Number.isFinite(profondeur[k]) ? s + v : s), 0) / profondeur.filter(Number.isFinite).length;
  const f2 = (v: number) => v.toFixed(2).replace('.', ',');
</script>

<Panneau note={`A estimée = (${res.A.map(f2).join(' ; ')}), vraie (${AIR.map(f2).join(' ; ')}). PSNR sur les objets à moins de 6 m : brumeuse ${qualite.I.toFixed(1)} dB → débrumée ${qualite.J.toFixed(1)} dB (au loin, t̃ minuscule amplifie les erreurs). Sur l’image sans brume, le canal sombre moyen (hors ciel) vaut ${moyClair.toFixed(3).replace('.', ',')} : c’est l’a priori. Le mur rouge est clair dans un canal mais sombre dans les deux autres ; le prior échoue sur les objets blancs ou gris clair, pris pour de la brume.`}>
  {#snippet figure()}
    <div class="g">
      <Toile image={vueI} etiquette={`Observation brumeuse I (β = ${f2(beta)})`} lisse />
      <Toile image={vueSombre} affichage="lineaire" etiquette={`Canal sombre de I, fenêtre ${2 * rayon + 1} × ${2 * rayon + 1}`} />
      <Toile image={vueT} affichage="lineaire" etiquette={derniere === 'vrai' ? 'Transmission vraie t = e^(−βd)' : 'Transmission estimée t̃ = 1 − ω·dark(I/A)'} />
      <Toile image={vueJ} etiquette="Image débrumée Ĵ" lisse />
    </div>
  {/snippet}
  {#snippet controles()}
    <Curseur label="Densité de brume β" bind:value={beta} min={0.02} max={0.6} step={0.01} unite="m⁻¹" format={(v) => v.toFixed(2)} />
    <Curseur label="Rayon de la fenêtre r" bind:value={rayon} min={0} max={12} step={1} format={(v) => `${v} (${2 * v + 1} × ${2 * v + 1})`} />
    <Curseur label="ω (garder un peu de brume)" bind:value={omega} min={0.5} max={1} step={0.01} format={(v) => v.toFixed(2)} />
    <Bascule label="Transmission" bind:value={derniere} options={[{ valeur: 'estime', texte: 'Estimée' }, { valeur: 'vrai', texte: 'Vraie' }]} />
  {/snippet}
</Panneau>

<style>
  .g { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; padding: 1rem 1.1rem 0.3rem; }
  @media (max-width: 560px) { .g { grid-template-columns: 1fr; } }
</style>
