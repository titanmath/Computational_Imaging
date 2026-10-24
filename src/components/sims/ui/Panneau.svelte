<script lang="ts">
  // Conteneur standard d'une simulation : la figure, puis les contrôles dessous (jamais par-dessus).
  // `sombre` = table optique (fond ardoise) pour les scènes lumineuses.
  import type { Snippet } from 'svelte';
  interface Props {
    sombre?: boolean;
    figure: Snippet;
    controles?: Snippet;
    lecture?: Snippet;
    note?: string;
  }
  let { sombre = false, figure, controles, lecture, note }: Props = $props();
</script>

<div class="sim panneau" class:sombre>
  <div class="figure">{@render figure()}</div>
  {#if controles || lecture}
    <div class="bas">
      {#if controles}<div class="controles">{@render controles()}</div>{/if}
      {#if lecture}<div class="lecture">{@render lecture()}</div>{/if}
    </div>
  {/if}
  {#if note}<p class="note">{note}</p>{/if}
</div>

<style>
  .panneau {
    border: 1px solid var(--filet);
    border-radius: 14px;
    background: var(--papier);
    overflow: hidden;
  }
  .sombre {
    --c-fond: var(--table);
    --c-fond-2: var(--table-2);
    --c-encre: var(--table-encre);
    --c-encre-2: var(--table-encre-2);
    --c-filet: var(--table-filet);
    --accent: var(--accent-sombre);
    background: var(--table);
    border-color: var(--table-filet);
    color: var(--table-encre);
  }
  .figure {
    position: relative;
  }
  .bas {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    align-items: end;
    padding: 1rem 1.1rem 1.1rem;
    border-top: 1px solid var(--c-filet, var(--filet));
  }
  .controles {
    flex: 1 1 18rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12.5rem, 1fr));
    gap: 0.9rem 1.5rem;
  }
  .lecture {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .note {
    margin: 0;
    padding: 0 1.1rem 0.9rem;
    font-size: 0.82rem;
    color: var(--c-encre-2, var(--encre-3));
  }
</style>
