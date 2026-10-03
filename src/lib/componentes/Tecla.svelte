<!--
  Tecla da urna (research.md R7). De apresentação: rótulo e estado entram por props, o clique sai por `onclick`.
  - `tecla`: preta, texto branco em mono; pressionada vira visor com contorno.
  - `branco` / `corrige`: teclas grandes em display maiúsculo, `detalhe` em mono 9 px.
    (A variante `confirma` saiu em 02/10/2026 com o fim do corte por partido.)
  `aria-pressed` só é emitido quando `pressionada` vem definido.
-->
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Variante = 'tecla' | 'branco' | 'corrige';

  interface Props extends Omit<HTMLButtonAttributes, 'onclick' | 'type' | 'id'> {
    variante?: Variante;
    pressionada?: boolean;
    rotulo: string;
    detalhe?: string;
    onclick: () => void;
    id?: string;
  }

  let {
    variante = 'tecla',
    pressionada = undefined,
    rotulo,
    detalhe = undefined,
    onclick,
    id = undefined,
    ...resto
  }: Props = $props();
</script>

<button
  {...resto}
  type="button"
  {id}
  class={variante === 'tecla' ? 'tecla' : `g ${variante}`}
  aria-pressed={pressionada === undefined ? undefined : pressionada}
  onclick={() => onclick()}
>
  {rotulo}{#if detalhe}<small>{detalhe}</small>{/if}
</button>

<style>
  button {
    width: 100%;
    border: 0;
    cursor: pointer;
    margin: 0;
  }

  .tecla {
    font: 700 13px var(--mono);
    background: var(--tecla);
    color: var(--tecla-tx);
    padding: 9px 0 8px;
    box-shadow: inset 0 -3px 0 #000;
    letter-spacing: 0.02em;
  }
  .tecla[aria-pressed='true'] {
    background: var(--visor);
    color: var(--tinta);
    box-shadow: inset 0 0 0 2px var(--tecla);
  }
  .tecla:active {
    transform: translateY(1px);
    box-shadow: none;
  }

  .g {
    font: 800 15px var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 14px 4px 12px;
    color: #111;
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.28);
  }
  .g:active {
    transform: translateY(1px);
    box-shadow: none;
  }
  .branco {
    background: var(--branco);
  }
  .corrige {
    background: var(--corrige);
  }
  small {
    display: block;
    font: 500 9px var(--mono);
    letter-spacing: 0.1em;
    margin-top: 3px;
  }

  /* Área de toque de pelo menos 44 px no celular. */
  @media (max-width: 860px), (pointer: coarse) {
    button {
      min-height: 44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tecla:active,
    .g:active {
      transform: none;
    }
  }
</style>
