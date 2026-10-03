<!--
  Carimbo "VOTOU PARA DIFICULTAR PROCESSO CONTRA DEPUTADO" (PEC 3/2021, a PEC da Blindagem;
  versão 4310, 03/10/2026). Sim em algum dos dois turnos de 16/09/2025; quem não era deputado na
  data (null) não leva. No topo da foto, absoluto dentro de `.foto`, como o carimbo de patrimônio
  na base: não ocupa espaço no fluxo, então o cartão não cresce. Vermelho da família das marcas de
  alerta, com o contorno interno de carimbo de borracha.
  É um botão: abre um balão por cima da foto com a explicação simples, os votos nos dois turnos,
  a fonte e o link. Fecha no ×, com Esc ou com clique fora.
-->
<script lang="ts">
  import type { Blindagem } from '$lib/tipos';
  import {
    EXPLICA_BLINDAGEM,
    FONTE_BLINDAGEM,
    LINK_BLINDAGEM,
    ROTULO_BLINDAGEM,
    textoTurno
  } from '$lib/formatar/blindagem';
  import { tick } from 'svelte';

  let { voto }: { voto: Blindagem } = $props();

  const uid = $props.id();
  let aberto = $state(false);
  let raiz = $state<HTMLElement>();
  let botao = $state<HTMLButtonElement>();
  let titulo = $state<HTMLElement>();

  async function abrir() {
    aberto = true;
    await tick();
    titulo?.focus();
  }
  function fechar(devolverFoco: boolean) {
    if (!aberto) return;
    aberto = false;
    if (devolverFoco) botao?.focus();
  }

  $effect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      if (raiz && !raiz.contains(e.target as Node)) fechar(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar(true);
    };
    document.addEventListener('click', clique);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('click', clique);
      document.removeEventListener('keydown', tecla);
    };
  });
</script>

<div class="raiz" bind:this={raiz}>
  <button
    type="button"
    class="selo-blindagem"
    bind:this={botao}
    aria-expanded={aberto}
    aria-controls={aberto ? `${uid}-balao` : undefined}
    onclick={() => (aberto ? fechar(true) : abrir())}
  >
    <span class="txt">{ROTULO_BLINDAGEM}</span>
    <span class="q" aria-hidden="true">?</span><span class="sr">. O que é isso?</span>
  </button>

  {#if aberto}
    <div class="balao" id="{uid}-balao" role="dialog" aria-labelledby="{uid}-titulo">
      <h4 id="{uid}-titulo" tabindex="-1" bind:this={titulo}>PEC da Blindagem</h4>
      <p>{EXPLICA_BLINDAGEM}</p>
      <dl>
        <dt>1º turno</dt>
        <dd>{textoTurno(voto.t1)}</dd>
        <dt>2º turno</dt>
        <dd>{textoTurno(voto.t2)}</dd>
      </dl>
      <p class="fonte">Fonte: {FONTE_BLINDAGEM}</p>
      <a href={LINK_BLINDAGEM} target="_blank" rel="noopener">Ver a proposta na Câmara<span class="sr"> (abre em nova aba)</span></a>
      <button type="button" class="fechar" aria-label="Fechar" onclick={() => fechar(true)}>×</button>
    </div>
  {/if}
</div>

<style>
  .raiz {
    display: contents;
  }
  .selo-blindagem {
    position: absolute;
    /* Recuado da borda: lê como carimbo batido na foto, separado da marca do partido acima. */
    left: 8px;
    right: 8px;
    top: 8px;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    border: 0;
    text-align: left;
    cursor: pointer;
    background: var(--carimbo);
    color: var(--carimbo-tx);
    padding: 7px 10px 7px 12px;
    outline: 2px solid var(--carimbo-tx);
    outline-offset: -5px;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
  }
  .selo-blindagem:hover {
    background: color-mix(in srgb, var(--carimbo) 90%, #fff);
  }
  .selo-blindagem:focus-visible {
    outline: 3px solid var(--tinta);
    outline-offset: -3px;
    box-shadow: inset 0 0 0 5px var(--papel);
  }
  .txt {
    flex: 1;
    min-width: 0;
    font: 800 15px/1 var(--display);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-wrap: balance;
  }
  .q {
    flex: none;
    font: 700 10px/1 var(--mono);
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    border: 1.5px solid currentColor;
    border-radius: 50%;
  }

  .balao {
    position: absolute;
    inset: 8px;
    z-index: 2;
    overflow-y: auto;
    background: var(--papel);
    color: var(--tinta);
    border: 2px solid var(--tinta);
    box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.28);
    padding: 12px 14px;
    display: grid;
    align-content: start;
    gap: 8px;
    font-size: 13.5px;
    line-height: 1.4;
  }
  h4 {
    font: 800 15px/1 var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
    padding-right: 40px;
  }
  h4:focus {
    outline: none;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 12px;
    margin: 0;
  }
  dt {
    font: 500 10.5px var(--mono);
    letter-spacing: 0.06em;
    color: var(--tinta-2);
    align-self: baseline;
  }
  dd {
    margin: 0;
    text-align: right;
    font: 800 16px/1.1 var(--display);
  }
  p {
    margin: 0;
  }
  .fonte {
    font-size: 12.5px;
    color: var(--tinta-2);
  }
  a {
    color: var(--tinta);
    font-weight: 600;
  }
  .fechar {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    border: 1.5px solid var(--tinta);
    background: none;
    color: var(--tinta);
    font: 700 16px var(--mono);
    cursor: pointer;
  }
  @media (pointer: coarse) {
    .fechar {
      width: 44px;
      height: 44px;
      top: 2px;
      right: 2px;
    }
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>
