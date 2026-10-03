<!--
  Selo do fim da escala 6x1 (FR-016 a FR-022, T052; amostra aprovada em 02/10/2026, versão 5).
  Verde só para "votou a favor"; as outras situações usam o vermelho do carimbo "EXTREMA
  DIREITA" e "não era deputado" fica em cinza tracejado (C-011). O ícone é decorativo: o leitor
  de tela ouve a frase completa de `frase6x1` (C-012). Altura máxima: 72 px, mais 22 px da
  linha "e faltou" (NFR-012).
  É um botão, como o carimbo de patrimônio (pedido da usuária, 02/10/2026): abre um balão por
  cima do santinho, ancorado no topo do selo e aberto para cima (sobre foto e número, dentro do
  cartão), com os votos nos dois turnos, a assinatura das emendas e o link da votação.
  Fecha no ×, com Esc ou com clique fora.
-->
<script lang="ts">
  import type { Voto6x1 } from '$lib/tipos';
  import {
    DATA_6X1,
    EMENDAS_6X1,
    frase6x1,
    LINHA_FALTOU,
    LINK_6X1,
    ROTULO_6X1,
    selo6x1,
    TEXTO_6X1,
    textoEmendas,
    textoVoto
  } from '$lib/formatar/selo6x1';
  import { tick } from 'svelte';

  let { voto }: { voto: Voto6x1 } = $props();

  const uid = $props.id();
  const selo = $derived(selo6x1(voto));
  const t = $derived(TEXTO_6X1[selo.situacao]);
  const cor = $derived(
    selo.situacao === 'sem_mandato' ? 'cinza' : selo.situacao === 'favor' ? 'verde' : 'vermelho'
  );

  let aberto = $state(false);
  let raiz = $state<HTMLElement>();
  let botao = $state<HTMLButtonElement>();
  let titulo = $state<HTMLElement>();

  async function abrir() {
    aberto = true;
    // O título recebe o foco depois de o balão existir no DOM.
    await tick();
    titulo?.focus();
  }
  function fechar(devolverFoco: boolean) {
    if (!aberto) return;
    aberto = false;
    if (devolverFoco) botao?.focus();
  }

  // Clique fora e Esc: ouvintes no documento só enquanto o balão está aberto.
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

<div class="selo6x1" bind:this={raiz}>
  <button
    type="button"
    class="faixa {cor}"
    bind:this={botao}
    aria-expanded={aberto}
    aria-controls={aberto ? `${uid}-balao` : undefined}
    onclick={() => (aberto ? fechar(true) : abrir())}
  >
    <span class="sr">{frase6x1(selo)}</span><span class="sr"> Ver detalhes</span>
    {#if selo.situacao !== 'sem_mandato'}<span class="ic" aria-hidden="true">{t.icone}</span>{/if}
    <span class="txt" aria-hidden="true"
      ><small>{ROTULO_6X1}</small><b class:miudo={selo.situacao === 'sem_mandato'}>{t.texto}</b></span
    >
    <span class="q" aria-hidden="true">?</span>
  </button>
  {#if selo.faltou}<p class="faltou" aria-hidden="true">{LINHA_FALTOU}</p>{/if}

  {#if aberto}
    <div class="balao" id="{uid}-balao" role="dialog" aria-labelledby="{uid}-titulo">
      <h4 id="{uid}-titulo" tabindex="-1" bind:this={titulo}>{ROTULO_6X1}</h4>
      <p>PEC 221/2019, votada no Plenário da Câmara em {DATA_6X1}.</p>
      {#if selo.situacao === 'sem_mandato'}
        <p>Não estava no mandato no dia da votação.</p>
      {:else}
        <dl>
          <dt>1º turno</dt>
          <dd>{textoVoto(voto.primeiro_turno)}</dd>
          <dt>Votação final</dt>
          <dd>{textoVoto(voto.final)}</dd>
          <dt>Emendas 1 e 2</dt>
          <dd>{textoEmendas(voto.emendas)}</dd>
        </dl>
        {#if voto.emendas.length > 0}<p>{EMENDAS_6X1}</p>{/if}
      {/if}
      <a href={LINK_6X1} target="_blank" rel="noopener"
        >Ver a votação na Câmara<span class="sr"> (abre em nova aba)</span></a
      >
      <button type="button" class="fechar" aria-label="Fechar" onclick={() => fechar(true)}>×</button>
    </div>
  {/if}
</div>

<style>
  .selo6x1 {
    position: relative;
    display: grid;
    gap: 3px;
  }
  .faixa {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin: 0;
    padding: 5px 8px;
    border: 2px solid;
    max-height: 72px;
    box-sizing: border-box;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .faixa:focus-visible {
    outline: 3px solid var(--tinta);
    outline-offset: 2px;
  }
  .txt {
    flex: 1;
    min-width: 0;
  }
  .ic {
    flex: none;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    font: 900 20px/1 var(--display);
  }
  small {
    display: block;
    font: 600 11px/1.15 var(--texto);
  }
  b {
    display: block;
    font: 800 20px/0.95 var(--display);
    letter-spacing: 0.02em;
    text-wrap: balance;
  }
  b.miudo {
    font: 600 14px/1.2 var(--texto);
    letter-spacing: 0;
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

  .verde {
    background: var(--favor-fundo);
    border-color: var(--favor);
    color: var(--favor);
  }
  .verde .ic {
    background: var(--favor);
    color: var(--favor-fundo);
  }
  .vermelho {
    background: var(--carimbo);
    border-color: var(--carimbo);
    color: var(--carimbo-tx);
  }
  .vermelho .ic {
    background: var(--carimbo-tx);
    color: var(--carimbo);
  }
  .cinza {
    background: none;
    border-style: dashed;
    border-color: var(--tinta-2);
    color: var(--tinta-2);
  }
  .faixa:hover {
    filter: brightness(1.06);
  }

  .faltou {
    margin: 0;
    font: 700 14px/1.2 var(--texto);
    color: var(--carimbo);
  }

  /* Balão: aberto para cima, sobre foto e número, para não passar da base do cartão. */
  .balao {
    position: absolute;
    left: -4px;
    right: -4px;
    bottom: calc(100% + 6px);
    z-index: 3;
    max-height: 340px;
    overflow-y: auto;
    background: var(--papel);
    color: var(--tinta);
    border: 2px solid var(--tinta);
    box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.28);
    padding: 12px 14px;
    display: grid;
    align-content: start;
    gap: 9px;
    font-size: 13px;
    line-height: 1.4;
  }
  h4 {
    font: 800 15px/1 var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
    padding-right: 34px;
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
