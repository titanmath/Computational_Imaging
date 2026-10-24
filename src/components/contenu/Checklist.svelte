<script lang="ts">
  // « À maîtriser absolument » : liste cochable, mémorisée dans ce navigateur (localStorage, try/catch :
  // le site fonctionne aussi sans). C'est le seul état persistant du site.
  import { onMount } from 'svelte';
  import { lienLecon } from '@/lib/chemins';
  /** une case : un texte, ou un texte et la leçon à revoir ("06-hdr/05-courbe-de-reponse") */
  type Item = string | { texte: string; voir: string };
  interface Props {
    /** identifiant stable (ex. "a2-crf") : clé de stockage */
    id: string;
    titre?: string;
    items: Item[];
  }
  let { id, titre = 'À maîtriser absolument', items }: Props = $props();
  const cle = `checklist:${id}`;
  let coches = $state<boolean[]>(items.map(() => false));
  onMount(() => {
    try {
      const v = JSON.parse(localStorage.getItem(cle) ?? '[]');
      if (Array.isArray(v)) coches = items.map((_, i) => !!v[i]);
    } catch {
      /* stockage indisponible : on garde l'état en mémoire */
    }
  });
  function basculer(i: number) {
    coches[i] = !coches[i];
    try {
      localStorage.setItem(cle, JSON.stringify(coches));
    } catch {
      /* idem */
    }
  }
  const fait = $derived(coches.filter(Boolean).length);
  const uid = $props.id();
</script>

<section class="checklist" aria-labelledby={`cl-${uid}`}>
  <header>
    <h3 id={`cl-${uid}`}>{titre}</h3>
    <span class="compte" aria-live="polite">{fait} / {items.length}</span>
  </header>
  <div class="barre" aria-hidden="true"><span style={`width:${(fait / items.length) * 100}%`}></span></div>
  <ul>
    {#each items as item, i}
      <li class:fait={coches[i]}>
        <label>
          <input type="checkbox" checked={coches[i]} onchange={() => basculer(i)} />
          <span class="case" aria-hidden="true"></span>
          <span class="texte">{typeof item === 'string' ? item : item.texte}</span>
        </label>
        {#if typeof item !== 'string'}<a class="revoir" href={lienLecon(item.voir)}>revoir&nbsp;→</a>{/if}
      </li>
    {/each}
  </ul>
  <p class="note">Coche ce que tu sais refaire sans aide. C’est mémorisé dans ce navigateur uniquement.</p>
</section>

<style>
  .checklist {
    margin: 2rem 0;
    border: 1px solid var(--filet);
    border-left: 3px solid var(--accent);
    border-radius: var(--rayon, 10px);
    padding: 1rem 1.2rem 0.9rem;
    background: var(--papier-2);
  }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
  h3 { margin: 0; font-size: 1.05rem; font-family: var(--f-titre); font-weight: 500; }
  .compte { font-variant-numeric: tabular-nums; color: var(--accent); font-weight: 600; font-size: 0.9rem; }
  .barre { height: 3px; border-radius: 2px; background: var(--filet); margin: 0.6rem 0 0.7rem; overflow: hidden; }
  .barre span { display: block; height: 100%; background: var(--accent); transition: width 0.3s var(--ease); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.15rem; }
  li { display: flex; align-items: flex-start; gap: 0.5rem; }
  li label { flex: 1; }
  .revoir { flex: none; margin-top: 0.4rem; font-size: 0.78rem; color: var(--accent); text-decoration: none; white-space: nowrap; opacity: 0.8; }
  .revoir:hover { opacity: 1; text-decoration: underline; }
  label { display: grid; grid-template-columns: 1.4rem 1fr; gap: 0.5rem; align-items: start; padding: 0.35rem 0.2rem; border-radius: 6px; cursor: pointer; }
  label:hover { background: color-mix(in oklch, var(--accent) 7%, transparent); }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .case { width: 1.05rem; height: 1.05rem; margin-top: 0.2rem; border: 1.5px solid var(--encre-3); border-radius: 4px; display: grid; place-items: center; transition: background 0.2s, border-color 0.2s; }
  input:focus-visible + .case { outline: 2px solid var(--accent); outline-offset: 2px; }
  .fait .case { background: var(--accent); border-color: var(--accent); }
  .fait .case::after { content: ''; width: 0.3rem; height: 0.55rem; border: solid var(--papier); border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-1px, -1px); }
  .texte { line-height: 1.45; }
  .fait .texte { color: var(--encre-3); }
  .note { margin: 0.6rem 0 0; font-size: 0.78rem; color: var(--encre-3); }
</style>
