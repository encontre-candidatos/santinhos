<!--
  A vitrine inteira: urna (Painel) + mesa de santinhos + rodapé + dica de instalação + aviso.
  Filtro, contagem e marca vêm de $lib/regras; aqui só se guarda o estado dos controles.
  Desde 02/10/2026 ninguém é ocultado por partido (FR-005): todos aparecem, e os de partido
  marcado em partidos.json levam a marca "EXTREMA DIREITA" (FR-006).
  Versão 4310 (03/10/2026, docs/eleitor-indeciso.md): no topo, antes de tudo, o botão "Me ajude a
  escolher" (Guia) e, com número guardado, a etiqueta da colinha. A cidade (do guia ou do painel)
  vive só no estado da página e liga a linha "é da sua região" dos cartões.
-->
<script lang="ts">
  import '$lib/estilo/global.css';
  import { base as basePath } from '$app/paths';
  import { afterNavigate } from '$app/navigation';
  import { onMount, untrack } from 'svelte';
  import { candidatos, base, siglasMarcadas, municipios } from '$lib/dados';
  import { apagarColinha, colinhaDe, gravarColinha, lerColinha, type Colinha as TipoColinha } from '$lib/colinha';
  import { filtrar, marcadoExtremaDireita, ordenar } from '$lib/regras/filtros';
  import { embaralhar } from '$lib/regras/sorteio';
  import { indicar, textoIndicacao, numeroDoLink } from '$lib/regras/indicar';
  import { transparente } from '$lib/regras/ocultos';
  import { contarPorMarca, indexarMarcas, MARCAS } from '$lib/marcas';
  import type { Candidato, EstadoFiltro, Municipio } from '$lib/tipos';
  import Guia from './Guia.svelte';
  import Colinha from './Colinha.svelte';
  import Painel from './Painel.svelte';
  import Santinho from './Santinho.svelte';
  import Tecla from './Tecla.svelte';
  import Rodape from './Rodape.svelte';
  import DicaInstalar from './DicaInstalar.svelte';
  import Aviso, { type MensagemAviso } from './Aviso.svelte';
  import { corPartido } from './cores-partidos';

  // Os ocultos começam escondidos a cada visita; a escolha não é guardada (FR-036).
  // Chaves de "Esconder quem tem" também começam desligadas e não são guardadas (FR-054, C-020).
  const inicial: EstadoFiltro = { busca: '', partido: null, mostrarOcultos: false, esconder: [] };
  let estado = $state<EstadoFiltro>({ ...inicial });

  // Ordem sorteada (FR-060, WP15): a base vem em ordem de nome no HTML pré-renderizado e é
  // sorteada uma vez, no navegador, logo depois da hidratação; filtros só tiram e põem cartões.
  // Até o sorteio a mesa fica invisível (sem salto); sem JavaScript, o <noscript> a mostra.
  // A ordem não é guardada nem transmitida (FR-061).
  let ordemBase = $state.raw<readonly Candidato[]>(ordenar(candidatos));
  let sorteada = $state(false);
  onMount(() => {
    ordemBase = embaralhar(candidatos);
    sorteada = true;
    colinha = lerColinha();
  });
  // Link de indicação (`?n=1234`): abre com o número na busca, que acha até quem está oculto (FR-037).
  // Em afterNavigate, e não só ao montar: com a vitrine já aberta (link clicado dentro dela ou
  // aberto no app instalado), o SvelteKit navega sem remontar a página (correção de 03/10/2026).
  afterNavigate(({ to }) => {
    const n = numeroDoLink(to?.url.search ?? location.search);
    if (!n) return;
    guiaAberto = false;
    colinhaAberta = false;
    estado = { ...inicial, busca: n };
    scrollTo({ top: 0 });
  });

  // Guia, cidade e colinha (versão 4310).
  let cidade = $state<Municipio | null>(null);
  let guiaAberto = $state(false);
  let colinha = $state<TipoColinha | null>(null);
  let colinhaAberta = $state(false);
  let botaoGuia = $state<HTMLButtonElement>();
  // Com o guia ou a colinha abertos, a vitrine por baixo fica inerte (nem foco nem leitor de tela).
  const sobreposto = $derived(guiaAberto || colinhaAberta);

  function fecharGuia(c: Municipio | null) {
    cidade = c;
    guiaAberto = false;
    botaoGuia?.focus({ preventScroll: true });
  }
  function votar(c: Candidato, cid: Municipio | null = cidade) {
    cidade = cid;
    colinha = colinhaDe(c);
    gravarColinha(colinha);
    guiaAberto = false;
    colinhaAberta = true;
  }
  function trocarColinha() {
    apagarColinha();
    colinha = null;
    colinhaAberta = false;
  }
  function compartilharColinha() {
    if (!colinha) return;
    const sq = colinha.sq_candidato;
    const c = candidatos.find((x) => x.sq_candidato === sq);
    if (c) aoIndicar(c);
  }
  // Tudo o que só depende dos dados é calculado uma vez, ao abrir: as marcas de cada candidato.
  // A cada mudança de filtro, uma passada só dá a lista (na ordem sorteada) e o visor (NFR-030).
  const ctxMarcas = { siglasMarcadas };
  const indiceMarcas = indexarMarcas(candidatos, ctxMarcas);
  const chavesMarcas = contarPorMarca(candidatos, ctxMarcas, MARCAS, indiceMarcas);
  const filtro = $derived(filtrar(ordemBase, estado, ctxMarcas, indiceMarcas));
  const lista = $derived(filtro.lista);
  const contagem = $derived(filtro.contagem);

  // Mesa em lotes (NFR-020, WP13). Medido em 02/10/2026 com a CPU 4× mais lenta: montar os 756
  // de uma vez levava 2,8 s, e tirar centenas de cartões da mesa, ~230 ms só de remoção no DOM.
  // Por isso, a cada mudança de filtro:
  // - entra um lote dos primeiros da lista, e o resto completa aos poucos entre um quadro e outro;
  // - cartão já montado que continua na lista fica (ao mostrar os ocultos, os 221 não remontam);
  // - cartão que sai fica escondido e é desmontado aos poucos, fora do quadro da mudança.
  // A busca e a contagem valem sempre para a lista toda; a ordem é a do sorteio.
  // 12 enchem a primeira tela (3 colunas no computador, 1 no celular); cada cartão novo custa ~5 ms.
  const LOTE = 12;
  const ordemTotal = $derived(ordemBase);
  let limite = $state(LOTE);
  let montados = new Set<string>(); // o que está no DOM; não reativo de propósito
  let saindo = $state(new Set<string>());
  $effect.pre(() => {
    void lista;
    limite = LOTE;
  });
  // Só fica à mostra de imediato quem já estava à mostra; quem estava escondido (saindo) volta no
  // seu lote, como um cartão novo: reexibir centenas de uma vez custava 100 a 160 ms de layout.
  let aMostraAntes = new Set<string>(); // não reativo de propósito
  const aMostra = $derived.by(() => {
    const r = limite >= lista.length ? lista : lista.filter((c, i) => i < limite || aMostraAntes.has(c.sq_candidato));
    aMostraAntes = new Set(r.map((c) => c.sq_candidato));
    return aMostraAntes;
  });
  $effect.pre(() => {
    const v = aMostra;
    saindo = new Set(untrack(() => [...montados]).filter((sq) => !v.has(sq)));
  });
  const naMesa = $derived.by(() => {
    const r = ordemTotal.filter((c) => aMostra.has(c.sq_candidato) || saindo.has(c.sq_candidato));
    montados = new Set(r.map((c) => c.sq_candidato));
    return r;
  });
  // Inclinação do cartão pela posição na base inteira, fixa por candidato. Antes vinha da posição na
  // lista filtrada: esconder 34 cartões mudava a inclinação (--r) de todos os seguintes, e só o
  // recálculo de estilo de ~200 cartões custava 140 a 210 ms no celular (NFR-030, revisão do WP14).
  // O mapa sai da ordem sorteada e só muda quando ela muda (uma vez por visita, no sorteio).
  const posicao = $derived(new Map(ordemBase.map((c, i) => [c.sq_candidato, i])));
  $effect(() => {
    // Ler os dois antes de decidir: com && em curto-circuito, o efeito deixava de depender de
    // `saindo` e parava no meio (mesa presa em 12 depois de "Limpar filtros").
    const faltam = lista.length - limite;
    const sobram = saindo.size;
    if (faltam <= 0 && sobram === 0) return;
    // Um lote por quadro, depois da pintura: não disputa o quadro da mudança de filtro.
    let t = 0;
    const q = requestAnimationFrame(() => {
      t = window.setTimeout(() => {
        if (saindo.size) saindo = new Set([...saindo].slice(LOTE * 6));
        else limite = Math.min(limite + LOTE * 2, lista.length);
      }, 0);
    });
    return () => {
      cancelAnimationFrame(q);
      clearTimeout(t);
    };
  });

  // Teclas de partido: todas as siglas presentes entre os candidatos (marcadas ou não), em ordem alfabética.
  const colacao = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  const siglas = [...new Set(candidatos.map((c) => c.partido))].sort(colacao.compare);

  function mudar(e: Partial<EstadoFiltro>) {
    Object.assign(estado, e);
  }
  /** "Limpar filtros": volta ao início (sem busca, sem partido). */
  function todos() {
    mudar({ ...inicial, esconder: [] });
  }

  let aviso = $state<MensagemAviso | null>(null);
  let proximoId = 0;

  const raiz = () => location.origin + basePath;
  async function aoIndicar(c: Candidato) {
    const r = await indicar(c, raiz());
    if (r === 'copiado') {
      aviso = { id: ++proximoId, texto: `Copiado: ${c.nome_urna}. Cole na conversa.` };
    } else if (r === 'falhou') {
      aviso = { id: ++proximoId, texto: 'Selecione e copie', copiar: textoIndicacao(c, raiz()) };
    }
  }
</script>

<svelte:head>
  <!-- Sem JavaScript não há sorteio: a mesa aparece em ordem de nome (Decisão aceita, 02/10/2026). -->
  {@html '<noscript><style>.mesa{visibility:visible!important}</style></noscript>'}
</svelte:head>

{#if colinha}
  <div class="chip-colinha" inert={sobreposto}>
    <button type="button" class="chip" onclick={() => (colinhaAberta = true)}
      >Sua colinha: <b>{colinha.numero_urna}</b><span class="sr"> ({colinha.nome_urna}). Abrir</span></button
    >
    <button type="button" class="chip-trocar" onclick={trocarColinha}>Trocar</button>
  </div>
{/if}

<div class="app" inert={sobreposto}>
  <section class="inicio" aria-label="Ajuda para escolher">
    <button type="button" class="me-ajude" bind:this={botaoGuia} onclick={() => (guiaAberto = true)}>
      <span class="grande">Me ajude a escolher</span>
      <span class="sub">4 perguntas, um toque cada. Suas respostas não saem do celular.</span>
    </button>
  </section>

  <Painel
    {cidade}
    {municipios}
    oncidade={(m) => (cidade = m)}
    {contagem}
    {estado}
    {siglas}
    {chavesMarcas}
    onmudar={mudar}
    ontodos={todos}
  />

  <main>
    <DicaInstalar />
    <h2 class="sr">Candidatos</h2>
    <!-- A mesa existe sempre, mesmo vazia: assim `naMesa` (e o registro do que está montado) segue
         em dia durante uma busca sem resultado, e a volta não remonta a mesa velha (revisão do WP13). -->
    {#if lista.length === 0}
      <div class="vazio">
        <p>Nenhum candidato com esses filtros.</p>
        {#if !estado.mostrarOcultos && contagem.ocultosNaBusca > 0}
          <p>
            {contagem.ocultosNaBusca}
            {contagem.ocultosNaBusca === 1 ? 'candidato que nunca teve cargo casa' : 'candidatos que nunca tiveram cargo casam'}
            com a busca.
          </p>
          <div class="limpar">
            <Tecla rotulo="Mostrar quem nunca teve cargo" onclick={() => mudar({ mostrarOcultos: true })} />
          </div>
        {/if}
        <div class="limpar"><Tecla rotulo="Limpar filtros" onclick={todos} /></div>
      </div>
    {/if}
      <div class="mesa" class:sorteando={!sorteada}>
        {#each naMesa as c, i (c.sq_candidato)}
          <Santinho
            candidato={c}
            marcado={marcadoExtremaDireita(c, siglasMarcadas)}
            corPartido={corPartido(c.partido)}
            base={basePath}
            indice={posicao.get(c.sq_candidato) ?? i}
            fora={!aMostra.has(c.sq_candidato)}
            transparente={transparente(c, estado.mostrarOcultos)}
            onindicar={aoIndicar}
            {cidade}
          />
        {/each}
      </div>
  </main>
</div>

<div inert={sobreposto}><Rodape {base} {siglasMarcadas} /></div>

{#if guiaAberto}
  <Guia
    {candidatos}
    {siglasMarcadas}
    {municipios}
    base={basePath}
    cidadeInicial={cidade}
    onfechar={fecharGuia}
    onvotar={votar}
  />
{/if}

{#if colinhaAberta && colinha}
  <Colinha
    {colinha}
    onfechar={() => {
      colinhaAberta = false;
      botaoGuia?.focus({ preventScroll: true });
    }}
    ontrocar={trocarColinha}
    oncompartilhar={compartilharColinha}
  />
{/if}

<Aviso {aviso} onfechar={() => (aviso = null)} />

<style>
  .app {
    max-width: 1240px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }
  @media (max-width: 860px) {
    .app {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  main {
    min-width: 0;
  }

  /* "Me ajude a escolher": a primeira coisa da página, nas duas colunas; tecla CONFIRMA grande. */
  .inicio {
    grid-column: 1 / -1;
  }
  .me-ajude {
    width: 100%;
    display: grid;
    gap: 4px;
    justify-items: start;
    text-align: left;
    margin: 0;
    padding: 16px 18px 18px;
    border: 3px solid var(--tecla);
    background: var(--confirma);
    color: #111;
    box-shadow:
      inset 0 -6px 0 rgba(0, 0, 0, 0.25),
      4px 5px 0 rgba(0, 0, 0, 0.2);
    cursor: pointer;
  }
  .me-ajude:active {
    transform: translateY(2px);
  }
  .grande {
    font: 900 38px/0.95 var(--display);
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  .sub {
    font: 600 15px/1.3 var(--texto);
  }
  @media (min-width: 861px) {
    .me-ajude {
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 20px;
    }
  }

  /* Etiqueta da colinha: grudada no topo enquanto rola, pequena. */
  .chip-colinha {
    position: sticky;
    top: calc(env(safe-area-inset-top, 0px) + 6px);
    z-index: 20;
    max-width: 1240px;
    margin: -8px auto 12px;
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    pointer-events: none;
  }
  .chip,
  .chip-trocar {
    pointer-events: auto;
    min-height: 44px;
    margin: 0;
    padding: 6px 12px;
    font: 600 14px var(--texto);
    border: 2px solid var(--tecla);
    cursor: pointer;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
  }
  .chip {
    background: var(--visor);
    color: var(--tinta);
  }
  .chip b {
    font: 800 22px/1 var(--display);
    letter-spacing: 0.08em;
    vertical-align: -2px;
  }
  .chip-trocar {
    background: var(--papel);
    color: var(--tinta);
  }
  @media (prefers-reduced-motion: reduce) {
    .me-ajude:active {
      transform: none;
    }
  }

  /* Colunas irregulares da amostra: santinhos espalhados na mesa. */
  .sorteando {
    visibility: hidden;
  }
  .mesa {
    columns: 3 230px;
    column-gap: 22px;
  }

  .vazio {
    border: 2px dashed var(--linha);
    padding: 40px 20px;
    text-align: center;
    color: var(--muted);
  }
  .vazio p {
    margin: 0 0 4px;
  }
  .limpar {
    display: inline-block;
    margin-top: 10px;
    padding: 0;
  }
  .limpar :global(button) {
    padding-inline: 14px;
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
