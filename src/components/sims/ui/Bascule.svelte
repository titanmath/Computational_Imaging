<script lang="ts" generics="T extends string | number | boolean">
  // Choix exclusif parmi quelques options (boutons segmentés, pas de menu déroulant).
  interface Props {
    label?: string;
    options: { valeur: T; texte: string }[];
    value: T;
    onchange?: (v: T) => void;
  }
  let { label, options, value = $bindable(), onchange }: Props = $props();
</script>

<div class="bascule" role="radiogroup" aria-label={label}>
  {#if label}<span class="l">{label}</span>{/if}
  <div class="opts">
    {#each options as o (o.valeur)}
      <button
        type="button"
        role="radio"
        aria-checked={value === o.valeur}
        class:actif={value === o.valeur}
        onclick={() => {
          value = o.valeur;
          onchange?.(o.valeur);
        }}>{o.texte}</button
      >
    {/each}
  </div>
</div>

<style>
  .bascule {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }
  .l {
    font-size: 0.85rem;
    color: var(--c-encre-2, var(--encre-2));
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 2px;
    border-radius: 9px;
    background: var(--c-fond-2, var(--papier-2));
    border: 1px solid var(--c-filet, var(--filet));
    width: fit-content;
    max-width: 100%;
  }
  button {
    border: 0;
    background: transparent;
    padding: 0.3rem 0.7rem;
    border-radius: 7px;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--c-encre-2, var(--encre-2));
    transition: background 0.2s var(--ease), color 0.2s var(--ease);
  }
  button:hover {
    color: var(--c-encre, var(--encre));
  }
  button.actif {
    background: var(--c-fond, var(--papier));
    color: var(--c-encre, var(--encre));
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
  }
</style>
