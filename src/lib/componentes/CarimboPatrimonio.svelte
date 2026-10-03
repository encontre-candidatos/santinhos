<!--
  Carimbo "PATRIMÔNIO DECLARADO N× MAIOR QUE EM <ANO>" (FR-015, 02/10/2026), sobre a foto do
  santinho. Desde 03/10/2026 (FR-062 a FR-064) compara com a declaração mais recente antes de
  2026, de qualquer cargo, com o valor antigo corrigido pelo IPCA; N é a razão corrigida. Vai dentro de `.foto` (position: relative, altura fixa por aspect-ratio) e é
  absoluto: não ocupa espaço no fluxo, então o cartão não cresce (NFR-010).
  Mesma família do Carimbo "EXTREMA DIREITA" (contorno interno de carimbo de borracha), em
  açafrão e não em vermelho, para as duas marcas não se confundirem. Faixa reta na base da foto,
  de ponta a ponta (decisão de 02/10/2026): no canto, girado, cobria o queixo de quem tem o rosto
  mais baixo no enquadramento; na base fica sobre a roupa.
  É um botão (protótipo aprovado em 02/10/2026): abre um balão por cima da foto, também absoluto
  dentro de `.foto`, com o total do ano antigo (nominal e corrigido) e o de 2026, a frase do
  crescimento e o link do DivulgaCand.
  Fecha no ×, com Esc ou com clique fora.
  Texto descritivo da declaração, nunca de conduta (C-009).
  Contraste (--selo-tx sobre --selo, cores fixas, nos dois temas e sobre a foto em cinza): 10,55:1.
-->
<script lang="ts">
  import type { Candidato } from '$lib/tipos';
  import {
    anoComparacao,
    crescimentoPatrimonio,
    fraseCrescimento,
    marcaCrescimento,
    nomeEmFrase,
    textoLeitorCrescimento,
    textoMultiplicador
  } from '$lib/formatar/crescimento';
  import { ANO_REFERENCIA_IPCA, valorCorrigido } from '$lib/formatar/inflacao';
  import { formatarPatrimonio } from '$lib/formatar/patrimonio';
  import { tick } from 'svelte';

  interface Props {
    candidato: Pick<Candidato, 'patrimonio_total' | 'patrimonio_anterior' | 'nome_urna' | 'url_divulgacand'>;
  }

  let { candidato }: Props = $props();

  const uid = $props.id();
  const razao = $derived(crescimentoPatrimonio(candidato));
  const ano = $derived(anoComparacao(candidato));
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

{#if marcaCrescimento(candidato) && razao !== null}
  <div class="raiz" bind:this={raiz}>
    <button
      type="button"
      class="selo-patrimonio"
      bind:this={botao}
      aria-expanded={aberto}
      aria-controls={aberto ? `${uid}-balao` : undefined}
      aria-label="{textoLeitorCrescimento(candidato)}. Ver detalhes"
      onclick={() => (aberto ? fechar(true) : abrir())}
    >
      <span class="linha" aria-hidden="true">PATRIMÔNIO DECLARADO</span>
      <span class="bloco" aria-hidden="true">
        <span class="vezes"><b>{textoMultiplicador(razao)}</b> MAIOR</span>
        <span class="linha">QUE EM {ano}</span>
      </span>
      <span class="q" aria-hidden="true">?</span>
    </button>

    {#if aberto}
      <div class="balao" id="{uid}-balao" role="dialog" aria-labelledby="{uid}-titulo">
        <h4 id="{uid}-titulo" tabindex="-1" bind:this={titulo}>Patrimônio declarado ao TSE</h4>
        <dl>
          <dt>{ano}</dt>
          <dd>{formatarPatrimonio(candidato.patrimonio_anterior?.valor ?? null)}</dd>
          <dt>{ano} corrigido</dt>
          <dd>{formatarPatrimonio(valorCorrigido(candidato.patrimonio_anterior))}</dd>
          <dt>{ANO_REFERENCIA_IPCA}</dt>
          <dd>{formatarPatrimonio(candidato.patrimonio_total)}</dd>
        </dl>
        <p>{fraseCrescimento(candidato, nomeEmFrase(candidato.nome_urna))}</p>
        <a href={candidato.url_divulgacand} target="_blank" rel="noopener"
          >Ver as declarações no DivulgaCand<span class="sr"> (abre em nova aba)</span></a
        >
        <button type="button" class="fechar" aria-label="Fechar" onclick={() => fechar(true)}>×</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Sem caixa própria: botão e balão se posicionam contra `.foto`. */
  .raiz {
    display: contents;
  }

  .selo-patrimonio {
    /* Cores fixas: o carimbo fica sobre a foto, que não muda com o tema. */
    --selo: #f2c12e;
    --selo-tx: #16181a;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 8px;
    text-align: left;
    margin: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
    background: var(--selo);
    color: var(--selo-tx);
    /* À direita, espaço para o "?". */
    padding: 6px 36px 6px 10px;
    outline: 2px solid var(--selo-tx);
    outline-offset: -4px;
    box-shadow: 0 -2px 0 rgba(0, 0, 0, 0.25);
    line-height: 1;
  }
  .selo-patrimonio:hover {
    background: color-mix(in srgb, var(--selo) 88%, #fff);
  }
  .selo-patrimonio:focus-visible {
    outline: 3px solid var(--tinta);
    outline-offset: -3px;
    box-shadow: inset 0 0 0 5px var(--papel);
  }
  .linha {
    font: 700 9px/1.15 var(--mono);
    letter-spacing: 0.08em;
    padding-inline: 2px;
  }
  /* "QUE EM <ANO>" logo abaixo do número (pedido da usuária, 02/10/2026). */
  .bloco {
    display: grid;
    justify-items: start;
    gap: 1px;
  }
  .vezes {
    font: 900 18px/0.95 var(--display);
    letter-spacing: 0.02em;
  }
  .vezes b {
    font-size: 22px;
    font-weight: 900;
  }
  .q {
    position: absolute;
    right: 10px;
    top: 50%;
    translate: 0 -50%;
    font: 700 10px/1 var(--mono);
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    border: 1.5px solid var(--selo-tx);
    border-radius: 50%;
  }

  /* Balão: absoluto dentro de `.foto`, por cima dela; rola por dentro se a foto for baixa. */
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
    margin: 8px 0 0;
    font-variant-numeric: tabular-nums;
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
    font: 800 18px/1.1 var(--display);
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
