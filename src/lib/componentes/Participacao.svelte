<!--
  Participação nas votações nominais do Plenário em 2026 (FR-031 a FR-035, T060; opção A da
  amostra aprovada em 02/10/2026). Dez bolinhas, N cheias, e a frase "De cada 10, votou em N";
  de 0 a 4 em 10, tudo no vermelho do carimbo. Sem mandato em nenhuma votação: só a frase, em
  cinza. Bolinhas e frase visível são decorativas: o leitor de tela ouve a frase com os números.
  Acrescenta no máximo 56 px ao cartão (NFR-018): por isso a entrelinha justa e a margem
  negativa, que encurtam o vão de 8 px da grade do cartão.
  Versão 4310 (03/10/2026): de 9 a 10 em 10, o bloco fica no verde do selo "votou a favor" e
  ganha a etiqueta "Vota muito" ao lado do rótulo (mesma linha: não cresce o cartão), e o rótulo
  ganha o "?" de "O que é isso?".
  Mandato anterior de ex-deputado federal (FR-070 a FR-074, WP18): `periodo` troca o rótulo para
  "Votações na Câmara em 2019–2022" e o "?" para o texto do mandato anterior; sem dados para o
  período, só a frase em cinza, que já o diz.
-->
<script lang="ts">
  import type { Periodo, Votacoes2026 } from '$lib/tipos';
  import {
    CORTE_VOTA_MUITO,
    EXPLICA_PARTICIPACAO,
    EXPLICA_PARTICIPACAO_ANTERIOR,
    FONTE_PARTICIPACAO,
    FONTE_PARTICIPACAO_ANTERIOR,
    fraseParticipacao,
    fraseParticipacaoSr,
    participacao,
    rotuloParticipacao
  } from '$lib/formatar/participacao';
  import Explica from './Explica.svelte';

  let { votacoes, periodo = null }: { votacoes: Votacoes2026 | null; periodo?: Periodo | null } = $props();

  const p = $derived(participacao(votacoes));
  const cheias = $derived(p.sem ? 0 : p.n);
  const muito = $derived(!p.sem && p.n >= CORTE_VOTA_MUITO);
</script>

<div class="participacao" class:vermelho={!p.sem && p.vermelho} class:verde={muito} class:sem={p.sem}>
  <p class="sr">{fraseParticipacaoSr(p, periodo)}</p>
  {#if !(p.sem && periodo)}
    <div class="topo">
      <small aria-hidden="true">Votações<span class="longo">{' na Câmara'}</span>{periodo ? ` em ${periodo.de}–${periodo.ate}` : ' em 2026'}</small>
      {#if muito}<span class="muito">Vota muito</span>{/if}
      <Explica
        titulo={rotuloParticipacao(periodo)}
        texto={periodo ? EXPLICA_PARTICIPACAO_ANTERIOR : EXPLICA_PARTICIPACAO}
        fonte={periodo ? FONTE_PARTICIPACAO_ANTERIOR : FONTE_PARTICIPACAO}
      />
    </div>
  {/if}
  {#if !p.sem}
    <div class="bol" aria-hidden="true">
      {#each Array.from({ length: 10 }, (_, i) => i < cheias) as cheia, i (i)}<i class:cheia></i>{/each}
    </div>
  {/if}
  <b aria-hidden="true">{fraseParticipacao(p, periodo)}</b>
</div>

<style>
  .participacao {
    position: relative;
    container-type: inline-size;
    min-width: 0;
    display: grid;
    gap: 2px;
    /* -6 e não -3: a linha do rótulo passou de 11 para 14 px com a etiqueta e o "?" (versão
       4310), e o bloco continua com a mesma altura (NFR-018). */
    margin-top: -6px;
    color: var(--tinta);
  }
  .topo {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 14px;
  }
  small {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 600 11px/1 var(--texto);
    color: var(--tinta-2);
  }
  /* Coluna estreita: "Votações em 2026", para caber a etiqueta e o "?" na mesma linha. */
  @container (max-width: 250px) {
    .longo {
      display: none;
    }
  }
  .muito {
    flex: none;
    font: 700 9px/1 var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--favor);
    background: var(--favor-fundo);
    border: 1.5px solid var(--favor);
    padding: 1px 4px;
  }
  .topo :global(.q) {
    margin-left: auto;
    width: 16px;
    height: 16px;
    font-size: 10px;
  }
  .verde {
    color: var(--favor);
  }
  .bol {
    min-width: 0;
    display: flex;
    gap: 5px;
  }
  /* 18 px, encolhendo só quando a coluna da vitrine é mais estreita que as 10 (perto de 768 px). */
  .bol i {
    flex: 0 1 18px;
    min-width: 0;
    aspect-ratio: 1;
    box-sizing: border-box;
    border-radius: 50%;
    border: 2px solid currentColor;
  }
  .bol i.cheia {
    background: currentColor;
  }
  b {
    font: 800 20px/0.9 var(--display);
  }
  .vermelho {
    color: var(--carimbo);
  }
  .sem b {
    font: 600 14px/1.2 var(--texto);
    color: var(--tinta-2);
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
