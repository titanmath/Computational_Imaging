<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    onclick: () => void;
    titre?: string;
    principal?: boolean;
    children: Snippet;
  }
  let { onclick, titre, principal = false, children }: Props = $props();
</script>

<button type="button" class:principal {onclick} title={titre} aria-label={titre}>{@render children()}</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--c-filet, var(--filet-fort));
    background: var(--c-fond, var(--papier));
    color: var(--c-encre, var(--encre));
    border-radius: 999px;
    padding: 0.32rem 0.85rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.2s var(--ease), background 0.2s var(--ease);
    white-space: nowrap;
  }
  button:hover {
    border-color: var(--accent);
  }
  .principal {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--c-fond, var(--papier));
    font-weight: 600;
  }
</style>
