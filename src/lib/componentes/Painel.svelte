<!--
  A urna: visor com a contagem e o teclado de filtros (amostra research/amostra-santinho-urna.html).
  Não filtra nada: mostra `contagem` (vinda de $lib/regras) e devolve mudanças por `onmudar`.
  Celular (≤ 860 px): busca e teclas grandes à vista; partido em "Mais filtros".
  02/10/2026: não há mais corte por partido (FR-005). O visor conta quantos levam a marca
  (FR-007); a lista dos partidos marcados fica só no rodapé, junto da explicação. BRANCO e
  CORRIGE saíram: no lugar, "Limpar filtros" aparece só com busca ou partido ativo e, ao
  limpar, devolve o foco à busca (o botão some e o foco não pode se perder).
  Todos os candidatos (WP13): o visor conta à mostra, total e ocultos (FR-040), e o botão
  "Mostrar quem nunca teve cargo" alterna os ocultos (FR-036); com busca ativa, diz quantos
  ocultos casam com ela (FR-037).
  Versão 4310 (03/10/2026): "Sua cidade" logo depois da busca. Escolhida aqui ou no guia, os
  cartões dizem quem ficou entre os 10 mais votados dela em 2022; não filtra nem reordena.
-->
<script lang="ts">
  import type { Contagem, EstadoFiltro, Municipio } from '$lib/tipos';
  import EscolherCidade from './EscolherCidade.svelte';
  import Tecla from './Tecla.svelte';
  import EsconderMarcas from './EsconderMarcas.svelte';
  import type { Marca } from '$lib/marcas';

  interface Props {
    contagem: Contagem;
    estado: EstadoFiltro;
    siglas: string[];
    chavesMarcas: { marca: Marca; n: number }[];
    onmudar: (e: Partial<EstadoFiltro>) => void;
    ontodos: () => void;
    cidade?: Municipio | null;
    municipios?: readonly Municipio[];
    oncidade?: (m: Municipio | null) => void;
  }

  let { contagem, estado, siglas, chavesMarcas, onmudar, ontodos, cidade = null, municipios = [], oncidade = () => {} }: Props = $props();

  const buscando = $derived(estado.busca.trim() !== '' || estado.partido !== null);
  // Com busca ou partido, o visor conta os ocultos que casam; sem, todos os ocultos da base.
  const nOcultos = $derived(buscando ? contagem.ocultosNaBusca : contagem.ocultos);
  const filtroDito = $derived(estado.busca.trim() !== '' ? 'com a busca' : 'com o partido');

  // No desktop o <details> fica sempre aberto (o resumo some por CSS); no celular começa fechado.
  let maisAberto = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(min-width: 861px)');
    const ajustar = () => {
      if (mq.matches) maisAberto = true;
    };
    ajustar();
    mq.addEventListener('change', ajustar);
    return () => mq.removeEventListener('change', ajustar);
  });

  // Chave de marca ligada também conta como filtro ativo: "Limpar filtros" desliga as chaves (FR-053).
  const ativo = $derived(estado.busca.trim() !== '' || estado.partido !== null || estado.esconder.length > 0);

  function trocarMarca(id: string) {
    onmudar({ esconder: estado.esconder.includes(id) ? estado.esconder.filter((x) => x !== id) : [...estado.esconder, id] });
  }

  function limpar() {
    ontodos();
    // preventScroll: rolar até a busca forçava o layout da mesa inteira no mesmo quadro (NFR-002).
    document.getElementById('busca')?.focus({ preventScroll: true });
  }

  const resumoMais = $derived(
    [estado.partido, estado.esconder.length ? `${estado.esconder.length} ${estado.esconder.length === 1 ? 'marca' : 'marcas'}` : null]
      .filter(Boolean)
      .join(' · ')
  );
</script>

<aside class="urna" aria-label="Filtros">
  <h1 class="marca">Santinhos MG 2026<small>Candidatos a deputado federal</small></h1>

  <div class="visor" aria-live="polite">
    <div class="rot">Candidatos na mesa</div>
    <div class="cont">{contagem.exibidos} <span>de {contagem.total}</span></div>
    <div class="marcados">
      {contagem.marcados}
      {contagem.marcados === 1 ? 'marcado' : 'marcados'} como extrema direita
    </div>
    {#if contagem.escondidosPorMarca > 0}
      <div class="ocultos">
        {contagem.escondidosPorMarca} {contagem.escondidosPorMarca === 1 ? 'escondido' : 'escondidos'} pelas marcas
      </div>
    {/if}
    {#if !estado.mostrarOcultos && nOcultos > 0}
      <div class="ocultos">
        {#if buscando}
          {nOcultos} {nOcultos === 1 ? 'oculto casa' : 'ocultos casam'} {filtroDito}
        {:else}
          {nOcultos} nunca {nOcultos === 1 ? 'teve' : 'tiveram'} cargo eletivo e {nOcultos === 1 ? 'está oculto' : 'estão ocultos'}
        {/if}
      </div>
    {/if}
  </div>

  {#if contagem.ocultos > 0}
    <div class="botao-ocultos">
      <Tecla
        rotulo={`Mostrar quem nunca teve cargo (${contagem.ocultos})`}
        pressionada={estado.mostrarOcultos}
        onclick={() => onmudar({ mostrarOcultos: !estado.mostrarOcultos })}
      />
    </div>
  {/if}

  <label class="rot2" for="busca">Nome de urna ou número</label>
  <input
    id="busca"
    type="search"
    placeholder="nome ou número, ex.: 1312"
    autocomplete="off"
    spellcheck="false"
    value={estado.busca}
    oninput={(e) => onmudar({ busca: e.currentTarget.value })}
  />

  <div class="sua-cidade">
    {#if cidade}
      <span class="rot2">Sua cidade</span>
      <div class="cidade-escolhida">
        <b>{cidade.nome}</b>
        <button type="button" onclick={() => oncidade(null)}>Trocar<span class="sr"> a cidade</span></button>
      </div>
      <p class="dica-cidade">Os cartões mostram quem ficou entre os 10 mais votados aqui em 2022.</p>
    {:else}
      <EscolherCidade {municipios} id="painel-cidade" rotulo="Sua cidade" variante="painel" onescolher={(m) => oncidade(m)} />
    {/if}
  </div>

  <details class="mais" bind:open={maisAberto}>
    <summary>
      Mais filtros{#if resumoMais}<span class="resumo">{resumoMais}</span>{/if}
    </summary>

    <span class="rot2" id="rot-partido">Partido</span>
    <div class="teclas" role="group" aria-labelledby="rot-partido">
      {#each siglas as s (s)}
        <div class:largo={s.length > 6}>
          <Tecla
            rotulo={s}
            pressionada={estado.partido === s}
            onclick={() => onmudar({ partido: estado.partido === s ? null : s })}
          />
        </div>
      {/each}
    </div>

    <EsconderMarcas chaves={chavesMarcas} ligadas={estado.esconder} ontrocar={trocarMarca} />
  </details>

  {#if ativo}
    <div class="limpar">
      <Tecla variante="branco" rotulo="Limpar filtros" onclick={limpar} />
    </div>
  {/if}
</aside>

<style>
  .urna {
    background: var(--urna);
    border: 2px solid var(--urna-borda);
    padding: 18px 16px 20px;
    position: sticky;
    top: calc(env(safe-area-inset-top, 0px) + 16px);
    /* Com 27 partidos e as chaves de marca (WP14) o painel passa da altura da tela: rola por dentro,
       senão a parte de baixo ficava fora de alcance enquanto ele está grudado no topo. */
    max-height: calc(100vh - 32px - env(safe-area-inset-top, 0px));
    overflow-y: auto;
    overscroll-behavior: contain;
    box-shadow:
      0 1px 0 var(--urna-borda),
      0 10px 0 -4px var(--urna-borda);
    min-width: 0;
  }
  @media (max-width: 860px) {
    .urna {
      position: static;
      max-height: none;
      overflow: visible;
    }
  }

  .marca {
    font-family: var(--display);
    font-weight: 900;
    font-size: 30px;
    line-height: 0.95;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    color: var(--fg);
    text-wrap: balance;
    margin: 0;
  }
  .marca small {
    display: block;
    font-family: var(--mono);
    font-weight: 500;
    font-size: 11px;
    letter-spacing: 0.14em;
    color: var(--muted);
    margin-top: 6px;
  }

  .visor {
    background: var(--visor);
    color: var(--tinta);
    border: 3px solid var(--tecla);
    margin: 16px 0 18px;
    padding: 10px 12px;
    font-family: var(--mono);
  }
  .visor .rot {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tinta-2);
  }
  .visor .cont {
    font-family: var(--display);
    font-weight: 800;
    font-size: 44px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .visor .cont span {
    font-size: 20px;
    font-weight: 600;
    color: var(--tinta-2);
  }
  .visor .marcados {
    font-size: 12px;
    font-weight: 700;
    margin-top: 6px;
    /* Texto em tinta (o vermelho sobre o visor escuro dá 4,01:1); o vermelho fica no fio. */
    border-left: 5px solid var(--carimbo);
    padding-left: 6px;
  }

  .visor .ocultos {
    font-size: 12px;
    font-weight: 700;
    margin-top: 4px;
    border-left: 5px dashed var(--tinta-2);
    padding-left: 6px;
  }
  .botao-ocultos {
    display: grid;
    margin: -8px 0 4px;
  }
  .botao-ocultos :global(button) {
    min-height: 40px;
    white-space: normal;
    text-align: center;
  }

  .rot2 {
    display: block;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 14px 0 6px;
  }

  #busca {
    width: 100%;
    font: 600 15px var(--texto);
    padding: 10px 12px;
    border: 2px solid var(--tecla);
    border-radius: 0;
    background: var(--visor);
    color: var(--tinta);
    margin: 0;
  }
  /* 16 px no celular: abaixo disso o Safari do iOS dá zoom ao focar. */
  @media (max-width: 860px) {
    #busca {
      font-size: 16px;
      min-height: 44px;
    }
  }

  .mais summary {
    font: 700 11px var(--mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg);
    cursor: pointer;
    margin-top: 14px;
    padding: 12px 0;
    min-height: 44px;
    border-bottom: 1.5px dashed var(--urna-borda);
  }
  .mais summary .resumo {
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-left: 8px;
    text-transform: none;
  }
  @media (min-width: 861px) {
    .mais summary {
      display: none;
    }
  }

  .teclas {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  /* Siglas longas (REPUBLICANOS) ocupam duas casas para caber sem cortar. */
  .teclas .largo {
    grid-column: span 2;
  }
  .limpar {
    display: grid;
    margin-top: 20px;
  }
  .sua-cidade {
    margin-top: 14px;
  }
  .sua-cidade .rot2 {
    margin-top: 0;
  }
  .cidade-escolhida {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: var(--visor);
    color: var(--tinta);
    border: 2px solid var(--tecla);
    padding: 4px 4px 4px 12px;
    font: 700 15px var(--texto);
  }
  .cidade-escolhida button {
    min-height: 40px;
    padding: 0 12px;
    font: 700 12px var(--mono);
    background: var(--tecla);
    color: var(--tecla-tx);
    border: 0;
    cursor: pointer;
  }
  .dica-cidade {
    margin: 6px 0 0;
    font: 500 12px/1.3 var(--texto);
    color: var(--muted);
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
