<!--
  "O que é isso?" (versão 4310, 03/10/2026; melhoria 5 de docs/eleitor-indeciso.md): um "?" que
  abre um balão com uma ou duas frases simples, a fonte oficial e a data. Mesmo padrão dos
  balões do selo da 6x1 e do carimbo de patrimônio: fecha no ×, com Esc ou com clique fora.
  Sem caixa própria (display: contents): o balão se posiciona contra o primeiro ancestral
  posicionado, que é a linha do cartão; `para = 'baixo'` abre para baixo (marca do topo do cartão).
-->
<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    titulo: string;
    texto: string;
    fonte: string;
    link?: string | null;
    para?: 'cima' | 'baixo';
    /** Cor do "?" quando fica sobre fundo escuro (marca vermelha). */
    claro?: boolean;
  }

  let { titulo, texto, fonte, link = null, para = 'cima', claro = false }: Props = $props();

  const uid = $props.id();
  let aberto = $state(false);
  let raiz = $state<HTMLElement>();
  let botao = $state<HTMLButtonElement>();
  let cabeca = $state<HTMLElement>();

  async function abrir() {
    aberto = true;
    await tick();
    cabeca?.focus();
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

<span class="raiz" bind:this={raiz}>
  <button
    type="button"
    class="q"
    class:claro
    bind:this={botao}
    aria-expanded={aberto}
    aria-controls={aberto ? `${uid}-balao` : undefined}
    onclick={(e) => {
      e.stopPropagation();
      if (aberto) fechar(true);
      else abrir();
    }}
    ><span aria-hidden="true">?</span><span class="sr">O que é isso? {titulo}</span></button
  >
  {#if aberto}
    <span class="balao {para}" id="{uid}-balao" role="dialog" aria-labelledby="{uid}-titulo">
      <span class="h" id="{uid}-titulo" tabindex="-1" bind:this={cabeca}>{titulo}</span>
      <span class="p">{texto}</span>
      <span class="p fonte">Fonte: {fonte}</span>
      {#if link}
        <a href={link} target="_blank" rel="noopener">Ver na fonte<span class="sr"> (abre em nova aba)</span></a>
      {/if}
      <button type="button" class="fechar" aria-label="Fechar" onclick={() => fechar(true)}>×</button>
    </span>
  {/if}
</span>

<style>
  .raiz {
    display: contents;
  }
  /* "?" pequeno à vista, área de toque maior por fora (44 px no celular, sem empurrar a linha). */
  .q {
    position: relative;
    flex: none;
    width: 18px;
    height: 18px;
    margin: 0;
    padding: 0;
    display: inline-grid;
    place-items: center;
    vertical-align: middle;
    font: 700 11px/1 var(--mono);
    color: var(--tinta);
    background: var(--papel);
    border: 1.5px solid currentColor;
    border-radius: 50%;
    cursor: pointer;
  }
  .q::after {
    content: '';
    position: absolute;
    inset: -13px;
  }
  .q.claro {
    color: var(--carimbo-tx);
    background: transparent;
  }
  .q:focus-visible {
    outline: 3px solid var(--tinta);
    outline-offset: 2px;
  }

  .balao {
    position: absolute;
    left: -4px;
    right: -4px;
    z-index: 4;
    display: grid;
    gap: 7px;
    background: var(--papel);
    color: var(--tinta);
    border: 2px solid var(--tinta);
    box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.28);
    padding: 12px 14px;
    font: 400 14px/1.4 var(--texto);
    text-align: left;
    text-transform: none;
    letter-spacing: 0;
    white-space: normal;
  }
  .balao.cima {
    bottom: calc(100% + 6px);
  }
  .balao.baixo {
    top: calc(100% + 6px);
  }
  .h {
    font: 800 15px/1.05 var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding-right: 40px;
  }
  .h:focus {
    outline: none;
  }
  .fonte {
    font-size: 12.5px;
    color: var(--tinta-2);
  }
  a {
    color: var(--tinta);
    font-weight: 600;
    font-size: 13px;
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
