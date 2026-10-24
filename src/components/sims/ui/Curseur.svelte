<script lang="ts">
  // Curseur accessible : libellé, valeur formatée, unité. Échelle logarithmique optionnelle.
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unite?: string;
    log?: boolean;
    format?: (v: number) => string;
    oninput?: (v: number) => void;
  }
  let { label, value = $bindable(), min, max, step, unite = '', log = false, format, oninput }: Props = $props();
  const uid = $props.id();
  const id = `c-${uid}`;
  const N = 1000;
  const versInterne = (v: number) =>
    log ? (Math.log(v / min) / Math.log(max / min)) * N : v;
  const depuisInterne = (x: number) => {
    if (!log) return x;
    const v = min * Math.pow(max / min, x / N);
    return step ? Math.round(v / step) * step : v;
  };
  const affiche = $derived(
    format ? format(value) : Math.abs(value) >= 100 || Number.isInteger(value) ? String(Math.round(value * 100) / 100) : value.toPrecision(3),
  );
  const pct = $derived(((versInterne(value) - (log ? 0 : min)) / ((log ? N : max) - (log ? 0 : min))) * 100);
  function changer(e: Event) {
    const x = Number((e.target as HTMLInputElement).value);
    value = depuisInterne(x);
    oninput?.(value);
  }
</script>

<div class="curseur">
  <label for={id}>
    <span class="l">{label}</span>
    <output for={id}>{affiche}{unite ? ' ' + unite : ''}</output>
  </label>
  <input
    {id}
    type="range"
    min={log ? 0 : min}
    max={log ? N : max}
    step={log ? 1 : (step ?? 'any')}
    value={versInterne(value)}
    oninput={changer}
    style={`--pct:${pct}%`}
    aria-valuetext={`${affiche} ${unite}`}
  />
</div>

<style>
  .curseur {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }
  label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    font-size: 0.85rem;
  }
  .l {
    color: var(--c-encre-2, var(--encre-2));
  }
  output {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--c-encre, var(--encre));
    white-space: nowrap;
  }
  input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 22px;
    background: transparent;
    cursor: pointer;
    margin: 0;
  }
  input::-webkit-slider-runnable-track {
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent) var(--pct), var(--c-filet, var(--filet-fort)) var(--pct));
  }
  input::-moz-range-track {
    height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent) var(--pct), var(--c-filet, var(--filet-fort)) var(--pct));
  }
  input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6.5px;
    border-radius: 50%;
    background: var(--c-fond, var(--papier));
    border: 2px solid var(--accent);
    transition: transform 0.15s var(--ease);
  }
  input::-moz-range-thumb {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--c-fond, var(--papier));
    border: 2px solid var(--accent);
  }
  input:hover::-webkit-slider-thumb,
  input:focus-visible::-webkit-slider-thumb {
    transform: scale(1.2);
  }
  input:focus-visible {
    outline: none;
  }
  input:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 30%, transparent);
  }
</style>
