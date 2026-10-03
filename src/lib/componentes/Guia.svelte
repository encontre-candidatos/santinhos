<!--
  "Me ajude a escolher" (versão 4310, 03/10/2026; melhoria 1 de docs/eleitor-indeciso.md).
  Tela cheia, por cima da vitrine, com 4 perguntas de um toque e o resultado. A regra de pontos e
  os motivos moram em $lib/guia; aqui só se pergunta e se mostra. Navegação com as teclas da urna:
  CORRIGE (laranja) volta, BRANCO (branca) pula, CONFIRMA (verde) segue.
  Nada do que a pessoa responde sai do aparelho nem é guardado (C-004): fechou, esqueceu; só a
  cidade volta para a vitrine, para os cartões dizerem quem é da região.
-->
<script lang="ts">
  import type { Candidato, Municipio } from '$lib/tipos';
  import {
    MAX_PRIORIDADES,
    NOTA_LEGENDA,
    NOTA_NEUTRA,
    PRIORIDADES,
    recomendar,
    REGRA_GUIA,
    RESPOSTAS_VAZIAS,
    type Lado,
    type Prioridade,
    type Respostas
  } from '$lib/guia';
  import { MARCAS } from '$lib/marcas';
  import { onMount, tick } from 'svelte';
  import EscolherCidade from './EscolherCidade.svelte';

  interface Props {
    candidatos: readonly Candidato[];
    siglasMarcadas: readonly string[];
    municipios: readonly Municipio[];
    base: string;
    cidadeInicial: Municipio | null;
    onfechar: (cidade: Municipio | null) => void;
    onvotar: (c: Candidato, cidade: Municipio | null) => void;
  }

  let { candidatos, siglasMarcadas, municipios, base, cidadeInicial, onfechar, onvotar }: Props = $props();

  const TOTAL = 4;
  const nDeputados = $derived(candidatos.filter((c) => c.reeleicao).length);
  let passo = $state(0);
  // svelte-ignore state_referenced_locally
  let cidade = $state<Municipio | null>(cidadeInicial);
  let resp = $state<Respostas>({ ...RESPOSTAS_VAZIAS, prioridades: [], desistir: [] });
  const respostas = $derived<Respostas>({ ...resp, cidade: cidade?.cd ?? null });

  const DESCRICAO: Record<string, string> = {
    'extrema-direita': 'Partido classificado como extrema direita',
    patrimonio: 'O patrimônio declarado pelo menos dobrou desde 2022, com meio milhão a mais',
    'enfraquecer-6x1': 'Assinou mudanças para enfraquecer o fim da escala 6x1',
    'faltou-6x1': 'Não votou no fim da escala 6x1',
    'votou-pouco': 'Votou em menos da metade das votações de 2026',
    blindagem: 'Votou Sim na PEC da Blindagem, em 2025'
  };

  const resultado = $derived(passo === TOTAL ? recomendar(candidatos, respostas, { siglasMarcadas }) : null);

  let titulo = $state<HTMLElement>();
  let painel = $state<HTMLElement>();
  async function irPara(n: number) {
    passo = n;
    await tick();
    painel?.scrollTo({ top: 0 });
    titulo?.focus({ preventScroll: true });
  }

  function escolherLado(l: Lado) {
    resp.lado = l;
    irPara(2);
  }
  function trocarPrioridade(p: Prioridade) {
    const tem = resp.prioridades.includes(p);
    if (tem) resp.prioridades = resp.prioridades.filter((x) => x !== p);
    else if (resp.prioridades.length < MAX_PRIORIDADES) resp.prioridades = [...resp.prioridades, p];
  }
  function trocarDesistir(id: string) {
    resp.desistir = resp.desistir.includes(id) ? resp.desistir.filter((x) => x !== id) : [...resp.desistir, id];
  }

  const foto = (c: Candidato) => (c.foto ? `${base.replace(/\/$/, '')}/${c.foto.replace(/^\//, '')}` : null);

  onMount(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    titulo?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      // Esc fecha o guia, a não ser que um balão ou campo esteja tratando a tecla.
      if (e.key === 'Escape' && !e.defaultPrevented) onfechar(cidade);
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.body.style.overflow = antes;
      document.removeEventListener('keydown', tecla);
    };
  });
</script>

<div class="guia" role="dialog" aria-modal="true" aria-labelledby="guia-titulo" bind:this={painel}>
  <div class="caixa">
    <header class="topo">
      <p class="marca">Me ajude a escolher</p>
      <button type="button" class="fechar" onclick={() => onfechar(cidade)}>Fechar<span class="sr"> o guia</span></button>
    </header>

    <div class="visor">
      {#if passo < TOTAL}
        <div class="progresso">
          <span class="conta" aria-label="Pergunta {passo + 1} de {TOTAL}">{passo + 1} de {TOTAL}</span>
          <span class="barra" aria-hidden="true">
            {#each Array.from({ length: TOTAL }, (_, i) => i) as i (i)}<i class:feito={i <= passo}></i>{/each}
          </span>
        </div>
      {/if}

      {#if passo === 0}
        <h2 id="guia-titulo" tabindex="-1" bind:this={titulo}>Em que cidade você vota?</h2>
        <p class="ajuda">Serve para mostrar quem foi bem votado na sua cidade na última eleição.</p>
        {#if cidade}
          <p class="escolhida">Sua cidade: <b>{cidade.nome}</b></p>
        {/if}
        <EscolherCidade
          {municipios}
          id="guia-cidade"
          rotulo={cidade ? 'Trocar a cidade' : 'Sua cidade'}
          onescolher={(m) => {
            cidade = m;
            irPara(1);
          }}
        />
      {:else if passo === 1}
        <h2 id="guia-titulo" tabindex="-1" bind:this={titulo}>Para deputado, você prefere alguém que…</h2>
        <div class="opcoes" role="group" aria-labelledby="guia-titulo">
          {#each [['com', 'vote com o governo Lula'], ['contra', 'vote contra o governo Lula'], ['tanto-faz', 'tanto faz']] as [id, rot] (id)}
            <button type="button" class="opcao" aria-pressed={resp.lado === id} onclick={() => escolherLado(id as Lado)}>
              <span class="x" aria-hidden="true">{resp.lado === id ? 'X' : ''}</span><span>{rot}</span>
            </button>
          {/each}
        </div>
        <p class="ajuda">Medimos pelo voto de cada deputado nas votações de 2026, não pelo partido.</p>
      {:else if passo === 2}
        <h2 id="guia-titulo" tabindex="-1" bind:this={titulo}>O que mais pesa para você?</h2>
        <p class="ajuda" id="guia-ate2">Marque até 2. {resp.prioridades.length}/{MAX_PRIORIDADES} marcadas.</p>
        <div class="opcoes" role="group" aria-labelledby="guia-titulo" aria-describedby="guia-ate2">
          {#each PRIORIDADES as p (p.id)}
            {@const marcada = resp.prioridades.includes(p.id)}
            <button
              type="button"
              class="opcao"
              aria-pressed={marcada}
              aria-disabled={!marcada && resp.prioridades.length >= MAX_PRIORIDADES}
              onclick={() => trocarPrioridade(p.id)}
            >
              <span class="x" aria-hidden="true">{marcada ? 'X' : ''}</span>
              <span>{p.rotulo}<small>{p.detalhe}</small></span>
            </button>
          {/each}
        </div>
      {:else if passo === 3}
        <h2 id="guia-titulo" tabindex="-1" bind:this={titulo}>O que te faz desistir de alguém?</h2>
        <p class="ajuda">Marque quantos quiser. Quem tiver algum desses sai da lista.</p>
        <div class="opcoes" role="group" aria-labelledby="guia-titulo">
          {#each MARCAS as m (m.id)}
            {@const marcada = resp.desistir.includes(m.id)}
            <button type="button" class="opcao" aria-pressed={marcada} onclick={() => trocarDesistir(m.id)}>
              <span class="x" aria-hidden="true">{marcada ? 'X' : ''}</span>
              <span>{m.rotulo}{#if DESCRICAO[m.id]}<small>{DESCRICAO[m.id]}</small>{/if}</span>
            </button>
          {/each}
        </div>
      {:else if resultado}
        <h2 id="guia-titulo" tabindex="-1" bind:this={titulo}>
          {resultado.lista.length === 0 ? 'Ninguém combinou com tudo' : resultado.lista.length === 1 ? 'Um nome para você' : `${resultado.lista.length} nomes para você`}
        </h2>
        <p class="nota-neutra">{NOTA_NEUTRA}</p>
        {#if resultado.qualificados === 0}
          <p class="aviso">
            Nenhum candidato passou por todas as suas respostas.
            {#if resp.desistir.length}Tente sem descartar ninguém.{/if}
          </p>
        {:else if resultado.qualificados < 5}
          <p class="aviso">
            Só {resultado.qualificados}
            {resultado.qualificados === 1 ? 'candidato combina' : 'candidatos combinam'} com tudo o que você respondeu.
          </p>
        {/if}
        {#if resultado.empate}
          <p class="aviso">Suas respostas não separam esses candidatos: a ordem é sorteio.</p>
        {/if}
        {#if resultado.regiaoSemCidade}
          <p class="aviso">Você não disse a cidade, então "Que seja da minha região" não contou.</p>
        {/if}

        {#if resultado.lista.length}
          <ol class="resultado">
            {#each resultado.lista as { candidato: c, motivos } (c.sq_candidato)}
              {@const f = foto(c)}
              <li>
                <div class="nome-foto">
                  {#if f}<img src={f} alt="" width="64" height="80" loading="lazy" />{:else}<span class="sem-foto" aria-hidden="true"></span>{/if}
                  <div>
                    <h3>{c.nome_urna}</h3>
                    <p class="meta"><b>{c.partido}</b> · número <b class="num">{c.numero_urna}</b></p>
                  </div>
                </div>
                <ul class="motivos" aria-label="Por que aparece">
                  {#each motivos as m (m)}<li>{m}</li>{/each}
                </ul>
                <button type="button" class="votar" onclick={() => onvotar(c, cidade)}
                  >Vou votar neste<span class="sr">: {c.nome_urna}, {c.numero_urna}</span></button
                >
              </li>
            {/each}
          </ol>
        {/if}

        <div class="fim">
          {#if resultado.qualificados === 0 && resp.desistir.length}
            <button type="button" class="tecla-g branco" onclick={() => (resp.desistir = [])}>Não descartar ninguém</button>
          {/if}
          <button type="button" class="tecla-g confirma" onclick={() => onfechar(cidade)}>Ver todos os candidatos</button>
          <button type="button" class="tecla-g corrige" onclick={() => irPara(0)}>Refazer as perguntas</button>
        </div>
        <details class="regra">
          <summary>Como a ordem é feita</summary>
          <p>{REGRA_GUIA}</p>
          <p>
            Entram os {nDeputados} deputados que tentam a reeleição. Quem ainda não é deputado só entra se você disse a cidade, se
            ficou entre os 10 mais votados nela em 2022 e se você respondeu "tanto faz" para o lado: sem votos na Câmara, não
            dá para medir o lado dele.
          </p>
        </details>
        <p class="legenda">{NOTA_LEGENDA}</p>
      {/if}
    </div>

    {#if passo < TOTAL}
      <nav class="teclas" aria-label="Navegação do guia">
        {#if passo > 0}
          <button type="button" class="tecla-g corrige" onclick={() => irPara(passo - 1)}>Voltar</button>
        {:else}
          <span></span>
        {/if}
        {#if passo === 0}
          <button type="button" class="tecla-g {cidade ? 'confirma' : 'branco'}" onclick={() => irPara(1)}>{cidade ? 'Continuar' : 'Pular'}</button>
        {:else if passo === 1}
          <button type="button" class="tecla-g branco" onclick={() => irPara(2)}>Pular</button>
        {:else if passo === 2}
          <button type="button" class="tecla-g {resp.prioridades.length ? 'confirma' : 'branco'}" onclick={() => irPara(3)}
            >{resp.prioridades.length ? 'Continuar' : 'Pular'}</button
          >
        {:else}
          <button type="button" class="tecla-g confirma" onclick={() => irPara(4)}>Ver resultado</button>
        {/if}
      </nav>
    {/if}
  </div>
</div>

<style>
  .guia {
    position: fixed;
    inset: 0;
    z-index: 50;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--urna);
    color: var(--fg);
    padding: calc(env(safe-area-inset-top, 0px) + 12px) max(16px, env(safe-area-inset-right, 0px))
      calc(env(safe-area-inset-bottom, 0px) + 24px) max(16px, env(safe-area-inset-left, 0px));
  }
  .caixa {
    max-width: 560px;
    margin: 0 auto;
    display: grid;
    gap: 14px;
  }
  .topo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .marca {
    margin: 0;
    font: 900 22px/1 var(--display);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .fechar {
    min-height: 44px;
    padding: 0 14px;
    font: 700 13px var(--mono);
    color: var(--tecla-tx);
    background: var(--tecla);
    border: 0;
    box-shadow: inset 0 -3px 0 #000;
    cursor: pointer;
  }

  .visor {
    background: var(--visor);
    color: var(--tinta);
    border: 3px solid var(--tecla);
    padding: 14px 14px 18px;
    display: grid;
    gap: 12px;
  }
  .progresso {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .conta {
    font: 700 13px var(--mono);
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .barra {
    flex: 1;
    display: flex;
    gap: 4px;
  }
  .barra i {
    flex: 1;
    height: 8px;
    border: 2px solid var(--tinta);
  }
  .barra i.feito {
    background: var(--tinta);
  }
  h2 {
    margin: 0;
    font: 900 32px/0.98 var(--display);
    text-transform: uppercase;
    text-wrap: balance;
  }
  h2:focus {
    outline: none;
  }
  .ajuda {
    margin: 0;
    font: 400 15px/1.4 var(--texto);
    color: var(--tinta-2);
  }
  .escolhida {
    margin: 0;
    font: 400 16px/1.3 var(--texto);
  }

  .opcoes {
    display: grid;
    gap: 8px;
  }
  /* Opção = quadradinho de cédula: marcada leva um X e fica preta, como tecla apertada. */
  .opcao {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    margin: 0;
    padding: 10px 12px;
    text-align: left;
    font: 700 18px/1.2 var(--texto);
    color: var(--tinta);
    background: var(--papel);
    border: 2px solid var(--tecla);
    border-radius: 0;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.18);
    cursor: pointer;
  }
  .opcao small {
    display: block;
    font: 400 13.5px/1.3 var(--texto);
    color: var(--tinta-2);
    margin-top: 2px;
  }
  .opcao[aria-pressed='true'] {
    background: var(--tecla);
    color: var(--tecla-tx);
  }
  .opcao[aria-pressed='true'] small {
    color: var(--tecla-tx);
  }
  /* Já há 2 marcadas: a opção fica tracejada, sem perder o contraste do texto. */
  .opcao[aria-disabled='true'] {
    border-style: dashed;
    box-shadow: none;
  }
  .x {
    flex: none;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border: 2px solid currentColor;
    font: 900 20px/1 var(--display);
  }

  .teclas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .tecla-g {
    min-height: 54px;
    padding: 10px 8px;
    border: 0;
    font: 800 18px/1 var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #111;
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }
  .tecla-g:active {
    transform: translateY(1px);
    box-shadow: none;
  }
  .branco {
    background: var(--branco);
  }
  .corrige {
    background: var(--corrige);
  }
  .confirma {
    background: var(--confirma);
  }

  .nota-neutra {
    margin: 0;
    font: 700 14px/1.35 var(--texto);
    border-left: 5px solid var(--tinta);
    padding-left: 8px;
  }
  .aviso {
    margin: 0;
    font: 600 15px/1.35 var(--texto);
    border: 2px dashed var(--tinta-2);
    padding: 8px 10px;
  }

  .resultado {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
    counter-reset: r;
  }
  .resultado > li {
    background: var(--papel);
    border: 2px solid var(--tecla);
    box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.18);
    padding: 10px 12px 12px;
    display: grid;
    gap: 8px;
  }
  .nome-foto {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .nome-foto img,
  .sem-foto {
    flex: none;
    width: 64px;
    height: 80px;
    object-fit: cover;
    object-position: center 22%;
    background: var(--linha);
    border: 2px solid var(--tecla);
  }
  h3 {
    margin: 0;
    font: 900 26px/0.95 var(--display);
    text-transform: uppercase;
    text-wrap: balance;
  }
  .meta {
    margin: 4px 0 0;
    font: 400 15px/1.3 var(--texto);
  }
  .meta .num {
    font: 800 22px/1 var(--display);
    letter-spacing: 0.08em;
  }
  .motivos {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
  }
  .motivos li {
    font: 600 15px/1.3 var(--texto);
    padding-left: 18px;
    position: relative;
  }
  .motivos li::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0.45em;
    width: 8px;
    height: 8px;
    background: var(--favor);
  }
  .votar {
    min-height: 48px;
    border: 0;
    background: var(--confirma);
    color: #111;
    font: 800 18px/1 var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }

  .fim {
    display: grid;
    gap: 8px;
  }
  .regra summary {
    cursor: pointer;
    font: 700 14px var(--texto);
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .regra p,
  .legenda {
    margin: 0 0 6px;
    font: 400 14px/1.4 var(--texto);
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
  @media (prefers-reduced-motion: reduce) {
    .tecla-g:active {
      transform: none;
    }
  }
</style>
