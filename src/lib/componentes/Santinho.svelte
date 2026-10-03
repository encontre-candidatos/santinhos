<!--
  Santinho de um candidato (research.md R7; amostra research/amostra-santinho-urna.html).
  De apresentação: não sabe de filtro nem de lista de partidos. `marcado` vem de partidos.json
  (extrema_direita) via $lib/regras; quando true, a faixa do partido vira a marca vermelha
  "EXTREMA DIREITA" (Carimbo), o cartão ganha moldura vermelha e a foto fica em cinza
  (FR-006, 02/10/2026). `corPartido` vem do WP05; "Indicar" sai por `onindicar`.
  Patrimônio declarado (FR-014, WP08): só o total, formatado em $lib/formatar/patrimonio.
  Crescimento de 2022 para 2026 (FR-015, WP09): CarimboPatrimonio, absoluto dentro de `.foto`;
  quem leva esse carimbo também fica com a foto em cinza, como os de extrema direita (02/10/2026).
  Também em cinza: quem tem o selo 6x1 "APOIOU MUDANÇAS PARA ENFRAQUECER" (02/10/2026).
  Participação nas votações de 2026 (FR-031, WP12): bloco logo depois do selo da 6x1.
  Todos os candidatos (FR-038, FR-039, WP13): quem tenta a reeleição traz "Deputado federal, tenta
  a reeleição" e os blocos de antes; quem não é deputado traz o último cargo (JaFoi) e não traz
  selo da 6x1, participação nem link da Câmara. `transparente` (FR-037): oculto achado pelo
  número; a opacidade vai só na foto e na faixa, o texto fica com o contraste de sempre.
  Versão 4310 (03/10/2026, docs/eleitor-indeciso.md): carimbo da PEC da Blindagem no topo da foto
  (absoluto, não cresce o cartão), linha "lado no governo" em cor neutra (é lado, não defeito) e,
  com cidade escolhida, a posição dele nela em 2022. Cada linha nova tem o "?" de "O que é isso?".
  A foto não fica em cinza pela Blindagem: 36 dos 48 levam o carimbo, e o cinza apagaria a mesa.
  Ex-deputado federal fora do mandato (FR-070, WP18): o bloco de participação do último mandato,
  com o período no rótulo, no lugar onde o deputado tem o de 2026.
-->
<script lang="ts">
  import type { Candidato, Municipio } from '$lib/tipos';
  import { votouBlindagem } from '$lib/formatar/blindagem';
  import { EXPLICA_GOVERNO, FONTE_GOVERNO, fraseGovernoExata, governoDe10 } from '$lib/formatar/governo';
  import { EXPLICA_REGIAO, FONTE_REGIAO, fraseRegiao } from '$lib/formatar/regiao';
  import CarimboBlindagem from './CarimboBlindagem.svelte';
  import Explica from './Explica.svelte';
  import { marcaCrescimento } from '$lib/formatar/crescimento';
  import { formatarPatrimonio } from '$lib/formatar/patrimonio';
  import { selo6x1 } from '$lib/formatar/selo6x1';
  import Carimbo from './Carimbo.svelte';
  import CarimboPatrimonio from './CarimboPatrimonio.svelte';
  import Selo6x1 from './Selo6x1.svelte';
  import Participacao from './Participacao.svelte';
  import JaFoi from './JaFoi.svelte';

  interface Props {
    candidato: Candidato;
    marcado: boolean;
    corPartido: string;
    base: string;
    indice: number;
    transparente?: boolean;
    /** Saindo da mesa: escondido até ser desmontado (NFR-020). */
    fora?: boolean;
    onindicar: (c: Candidato) => void;
    /** Cidade escolhida no guia ou no painel: liga a linha "é da sua região". */
    cidade?: Municipio | null;
  }

  let { candidato, marcado, corPartido, base, indice, transparente = false, fora = false, onindicar, cidade = null }: Props = $props();

  const blindou = $derived(votouBlindagem(candidato.blindagem));
  const gov = $derived(governoDe10(candidato.governo_2026));
  const regiao = $derived(fraseRegiao(candidato, cidade));

  const ROTACOES = [-1.2, 0.8, -0.4, 1.3, -0.9, 0.5];
  const uid = $props.id();

  const cresceu = $derived(marcaCrescimento(candidato));
  const deputado = $derived(candidato.reeleicao);
  const enfraqueceu = $derived(candidato.voto_6x1 !== null && selo6x1(candidato.voto_6x1).situacao === 'enfraquecer');
  const rotacao = $derived(ROTACOES[((indice % 6) + 6) % 6]);
  const src = $derived(
    candidato.foto ? `${base.replace(/\/$/, '')}/${candidato.foto.replace(/^\//, '')}` : null
  );
  // Foto que falhou ao carregar, guardada pelo endereço: se o candidato mudar, tenta de novo.
  let falhou = $state<string | null>(null);
  const mostraFoto = $derived(src !== null && falhou !== src);

  const iniciais = $derived.by(() => {
    const palavras = candidato.nome_urna.trim().split(/\s+/).filter(Boolean);
    const fortes = palavras.filter((w) => w.length > 2 && !/^(do|da|de|dos|das)$/i.test(w));
    const escolhidas = (fortes.length ? fortes : palavras).slice(0, 2);
    return escolhidas.map((w) => w[0]).join('').toUpperCase();
  });

  // DEFERIDO é o caso comum e não diz nada ao eleitor: o selo só aparece na exceção (FR-002).
  const alerta = $derived(candidato.situacao_candidatura.trim().toUpperCase() !== 'DEFERIDO');
  const trocou = $derived(candidato.partido_posse !== null && candidato.partido !== candidato.partido_posse);
  const digitos = $derived([...candidato.numero_urna]);
  const patrimonio = $derived(formatarPatrimonio(candidato.patrimonio_total));
</script>

<article
  class="santinho"
  class:marcado
  class:cresceu
  class:enfraqueceu
  class:transparente
  hidden={fora}
  aria-labelledby="{uid}-nome"
  style:--r="{rotacao}deg"
  style:--cor={corPartido}
>
  {#if marcado}<Carimbo />{:else}<div class="faixa"></div>{/if}

  {#if transparente}
    <p class="achado">Nunca teve cargo eletivo. Aparece porque você buscou o número.</p>
  {/if}
  <div class="foto" class:pequena={candidato.foto?.startsWith('fotos/tse/')}>
    {#if mostraFoto}
      <img
        {src}
        alt="Foto de {candidato.nome_urna}"
        loading="lazy"
        decoding="async"
        width="400"
        height="360"
        onerror={() => (falhou = src)}
      />
    {:else}
      <div class="iniciais" role="img" aria-label="Sem foto; iniciais de {candidato.nome_urna}">
        <span aria-hidden="true">{iniciais}</span>
      </div>
    {/if}
    <!-- Só monta com carimbo: cada instância liga dois ouvintes no document (NFR-020, 756 cartões). -->
    {#if cresceu}<CarimboPatrimonio {candidato} />{/if}
    {#if blindou && candidato.blindagem}<CarimboBlindagem voto={candidato.blindagem} />{/if}
  </div>

  <div class="corpo">
    {#if deputado}<p class="papel">Deputado federal, tenta a reeleição</p>{/if}
    <h3 class="nome" id="{uid}-nome">{candidato.nome_urna}</h3>
    <div class="meta">
      <span><b>{candidato.partido}</b></span>
      {#if deputado}
        <span>{candidato.mandatos} {candidato.mandatos === 1 ? 'mandato' : 'mandatos'}</span>
      {/if}
      {#if candidato.condicao === 'suplente_em_exercicio'}<span>suplente em exercício</span>{/if}
    </div>
    {#if !deputado && !transparente}<JaFoi cargos={candidato.cargos_anteriores} />{/if}
    {#if trocou}
      <div class="troca">Tomou posse pelo {candidato.partido_posse}</div>
    {/if}
    {#if regiao}
      <p class="regiao">
        <span>{regiao}</span>
        <Explica titulo="Sua cidade em 2022" texto={EXPLICA_REGIAO} fonte={FONTE_REGIAO} />
      </p>
    {/if}
    <div class="num">
      <span class="rot" aria-hidden="true">Número</span>
      <div class="digitos" role="img" aria-label="Número {candidato.numero_urna}">
        {#each digitos as d, i (i)}<i aria-hidden="true">{d}</i>{/each}
      </div>
    </div>
    <dl class="patrimonio">
      <dt>Patrimônio declarado</dt>
      <dd class:nenhum={candidato.patrimonio_total === null}>{patrimonio}</dd>
    </dl>
    {#if candidato.voto_6x1}
      <Selo6x1 voto={candidato.voto_6x1} />
      <Participacao votacoes={candidato.votacoes_2026} />
    {:else if candidato.votacoes_mandato_anterior}
      {@const m = candidato.votacoes_mandato_anterior}
      <Participacao votacoes={'sem_dados' in m ? null : m} periodo={m} />
    {/if}
    {#if gov !== null && candidato.governo_2026}
      <div class="governo">
        <p class="sr">{fraseGovernoExata(candidato.governo_2026)}</p>
        <span class="g-rot" aria-hidden="true">Com o governo em 2026</span>
        <span class="g-val" aria-hidden="true">{gov} de cada 10</span>
        <Explica titulo="Lado no governo Lula" texto={EXPLICA_GOVERNO} fonte={FONTE_GOVERNO} />
      </div>
    {/if}
    {#if alerta}
      <span class="situacao alerta">{candidato.situacao_candidatura}</span>
    {/if}
    <div class="acoes">
      {#if candidato.url_camara}
        <a href={candidato.url_camara} target="_blank" rel="noopener"
          >Câmara<span class="sr">: página de {candidato.nome_urna} (abre em nova aba)</span></a
        >
      {/if}
      <a href={candidato.url_divulgacand} target="_blank" rel="noopener"
        >DivulgaCand<span class="sr">: candidatura de {candidato.nome_urna} (abre em nova aba)</span
        ></a
      >
      {#if candidato.instagram}
        <a class="ig" href={candidato.instagram} target="_blank" rel="noopener" title="Instagram"
          ><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"
            ><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle
              class="ponto"
              cx="17.4"
              cy="6.6"
              r="1.1"
            /></svg
          ><span class="sr">Instagram de {candidato.nome_urna} (abre em nova aba)</span></a
        >
      {/if}
      <button type="button" onclick={() => onindicar(candidato)}
        >Indicar<span class="sr"> {candidato.nome_urna}</span></button
      >
    </div>
  </div>
</article>

<style>
  .santinho {
    break-inside: avoid;
    display: inline-block;
    width: 100%;
    margin: 0 0 24px;
    background: var(--papel);
    color: var(--tinta);
    position: relative;
    transform: rotate(var(--r, 0deg));
    /* Sombra dura de papel sobre a mesa, sem desfoque. */
    box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.18);
    transition: transform 0.18s ease;
  }
  .santinho[hidden] {
    display: none;
  }
  .santinho:hover {
    transform: rotate(0deg) translateY(-2px);
  }

  .faixa {
    height: 8px;
    background: var(--cor);
  }

  /* Oculto achado pelo número (FR-037): só foto e faixa esmaecem (o carimbo de patrimônio, não); o texto mantém o contraste (NFR-004). */
  .transparente {
    outline: 2px dashed var(--tinta-2);
    outline-offset: 0;
  }
  .transparente .faixa,
  .transparente .foto img {
    opacity: 0.4;
  }
  .achado {
    margin: 10px 14px 0;
    font: 700 13px/1.3 var(--texto);
    color: var(--tinta);
    border: 1.5px dashed var(--tinta);
    padding: 6px 8px;
  }
  .papel {
    margin: 0;
    font: 700 10.5px var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tinta-2);
  }

  .foto {
    aspect-ratio: 4 / 3.6;
    max-width: 100%;
    position: relative;
    overflow: hidden;
    /* Retícula de pontos sobre o tom claro do partido (caso "sem foto"). */
    background:
      radial-gradient(circle, rgba(0, 0, 0, 0.2) 1.1px, transparent 1.3px) 0 0 / 6px 6px,
      color-mix(in srgb, var(--cor) 45%, #fff);
  }
  /* Fotos do TSE (quem não é deputado) vêm em 161×225 px: no tamanho original, sem ampliar e
     borrar, de pé na base da foto sobre a retícula do partido (03/10/2026). */
  .foto.pequena img {
    position: absolute;
    left: 50%;
    bottom: 0;
    translate: -50% 0;
    width: auto;
    height: auto;
    max-width: 161px;
    max-height: 225px;
    box-shadow: 3px 0 0 rgba(0, 0, 0, 0.15);
  }
  .foto img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 22%;
  }
  .iniciais {
    position: absolute;
    inset: 0;
    /* Mesmo fundo de .foto: o filtro de cinza do cartão marcado age aqui, não no carimbo. */
    background: inherit;
  }
  .iniciais span {
    position: absolute;
    inset: auto 0 0 0;
    font-family: var(--display);
    font-weight: 900;
    font-size: 92px;
    line-height: 0.78;
    color: var(--papel);
    letter-spacing: -0.02em;
    padding: 0 10px;
    text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.25);
  }
  /* Partido marcado: moldura vermelha dura e foto em cinza, para a marca mandar no cartão. */
  .marcado {
    outline: 4px solid var(--carimbo);
    outline-offset: 0;
  }
  /* Na foto e nas iniciais, não em .foto: o carimbo de patrimônio, dentro dela, fica em cor. */
  .marcado .foto img,
  .marcado .foto .iniciais,
  .cresceu .foto img,
  .cresceu .foto .iniciais,
  .enfraqueceu .foto img,
  .enfraqueceu .foto .iniciais {
    filter: grayscale(1) contrast(0.9);
  }

  .corpo {
    padding: 12px 14px 14px;
    display: grid;
    gap: 8px;
  }
  .nome {
    font-family: var(--display);
    font-weight: 900;
    font-size: 30px;
    line-height: 0.92;
    text-transform: uppercase;
    text-wrap: balance;
    margin: 0;
  }
  .meta {
    font-size: 12.5px;
    color: var(--tinta-2);
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
  }
  .meta b {
    color: var(--tinta);
    font-weight: 700;
  }
  .troca {
    font-size: 12px;
    color: var(--tinta-2);
  }
  /* "É da sua região": fio do partido à esquerda, texto em tinta, sem cor de alerta. */
  .regiao {
    position: relative;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font: 700 13px/1.25 var(--texto);
    border-left: 5px solid var(--cor);
    padding: 2px 0 2px 8px;
  }
  .regiao span {
    flex: 1;
    min-width: 0;
  }
  /* Lado no governo: mesma linha de extrato do patrimônio, em tinta (é lado, não defeito). */
  .governo {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: -4px;
    padding-top: 4px;
    border-top: 1.5px dotted var(--tinta-2);
  }
  .g-rot {
    flex: 1 1 0;
    min-width: 0;
    font: 500 10.5px/1.2 var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tinta-2);
  }
  .g-val {
    flex: none;
    font: 800 22px/1 var(--display);
    white-space: nowrap;
  }
  .governo :global(.q) {
    align-self: center;
  }

  .num {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    margin-top: 2px;
  }
  .num .rot {
    font: 500 9px var(--mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tinta-2);
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
  .digitos {
    display: flex;
    gap: 4px;
  }
  .digitos i {
    font-style: normal;
    font-family: var(--display);
    font-weight: 800;
    font-size: 40px;
    line-height: 1;
    width: 34px;
    height: 48px;
    display: grid;
    place-items: center;
    border: 2px solid var(--tinta);
    font-variant-numeric: tabular-nums;
  }

  /* Linha de "extrato": rótulo em mono à esquerda, valor em display à direita, fio pontilhado. */
  /* Valor longo (milhões) não desce de linha: quem quebra é o rótulo, e o valor fica ao lado. */
  .patrimonio {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
    margin: 2px 0 0;
    padding-top: 7px;
    border-top: 1.5px dotted var(--tinta-2);
  }
  .patrimonio dt {
    flex: 1 1 0;
    min-width: 0;
    font: 500 10.5px var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tinta-2);
  }
  .patrimonio dd {
    flex: none;
    margin: 0;
    font-family: var(--display);
    font-weight: 800;
    font-size: 24px;
    line-height: 1;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .patrimonio dd.nenhum {
    font: 600 12.5px var(--texto);
    white-space: normal;
    flex: 0 1 auto;
    text-align: right;
  }

  .situacao {
    font: 500 10.5px var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 6px;
    border: 1.5px solid var(--tinta);
    justify-self: start;
  }
  .situacao.alerta {
    border-style: dashed;
    color: var(--carimbo);
    border-color: var(--carimbo);
  }

  /* Os quatro botões numa linha só em qualquer largura de cartão (02/10/2026): a fila não
     quebra; fonte, folga e espaço encolhem com a largura da própria fila (unidade cqi). */
  .acoes {
    container-type: inline-size;
    display: flex;
    gap: clamp(3px, 1.6cqi, 5px);
    flex-wrap: nowrap;
    border-top: 1.5px dashed var(--tinta-2);
    padding-top: 10px;
  }
  .acoes a,
  .acoes button {
    font: 600 clamp(10px, 4.4cqi, 11.5px) var(--texto);
    white-space: nowrap;
    flex: 0 1 auto;
    min-width: 0;
    color: var(--tinta);
    background: none;
    border: 1.5px solid var(--tinta);
    padding: 5px clamp(4px, 2.4cqi, 7px);
    margin: 0;
    text-decoration: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
  }
  .acoes .ig {
    padding-inline: clamp(4px, 2cqi, 6px);
  }
  .ig svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }
  .ig .ponto {
    fill: currentColor;
    stroke: none;
  }
  .acoes button {
    background: var(--tinta);
    color: var(--papel);
  }
  /* Área de toque de pelo menos 44 px no celular. */
  @media (max-width: 860px), (pointer: coarse) {
    .acoes a,
    .acoes button {
      min-height: 44px;
      padding-inline: clamp(4px, 3.6cqi, 12px);
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

  @media (prefers-reduced-motion: reduce) {
    .santinho,
    .santinho:hover {
      transition: none;
      transform: none;
    }
  }
</style>
