<!--
  Raio-X da reeleição no cartão de quem tenta a reeleição (03/10/2026): o extrato (governo,
  presença, patrimônio, mandatos) e as quatro votações-chave, cada uma uma linha inteira que abre
  a explicação em linguagem simples. Desenho, regras e textos da página "Raio-X da reeleição"
  (static/raio-x/index.html, branch raio-x-publicar); as regras moram em $lib/formatar/raio-x.
  A explicação abre num <dialog> modal montado só enquanto aberto (756 cartões na mesa, NFR-020).
  Diferença da página: "Votou com o governo" vem de governo_2026 (votações nominais de 2026, com a
  orientação do Governo na API da Câmara). A página usa 2025 a setembro de 2026 de uma fonte que a
  API não reproduz (conferido em 03/10/2026: 7 de 48 iguais com a mesma conta de 2025 a 09/2026),
  por isso o rótulo diz "em 2026". Presença é a mesma conta da página (votacoes_2026, 48 de 48).
-->
<script lang="ts">
  import type { Candidato } from '$lib/tipos';
  import { brlCurto, EXPLICA, linhasRaioX, pct, presenca, presencaAlerta, type ChaveVoto } from '$lib/formatar/raio-x';

  interface Props {
    candidato: Candidato;
    /** Alinhamento ao governo de 0 a 1, ou null. */
    governo: number | null;
  }

  let { candidato, governo }: Props = $props();

  const linhas = $derived(linhasRaioX(candidato));
  const pres = $derived(presenca(candidato.votacoes_2026));
  const presBad = $derived(presencaAlerta(candidato.votacoes_2026));
  const ICONE = { ok: '✔', bad: '✖', na: '–' } as const;
  const uid = $props.id();

  let aberta = $state<ChaveVoto | null>(null);
  let dlg = $state<HTMLDialogElement>();
  let origem: HTMLButtonElement | null = null;
  const tituloAberta = $derived(aberta ? linhas.find((l) => l.chave === aberta)?.rotulo ?? '' : '');

  function abrir(chave: ChaveVoto, e: MouseEvent) {
    origem = e.currentTarget as HTMLButtonElement;
    aberta = chave;
  }
  $effect(() => {
    if (!dlg) return;
    try {
      dlg.showModal();
    } catch {
      dlg.setAttribute('open', '');
    }
  });
  function fechou() {
    aberta = null;
    origem?.focus();
  }
</script>

<dl class="extrato">
  <div><dt>Votou com o governo em 2026</dt><dd>{pct(governo)}</dd></div>
  <div><dt>Presença em 2026</dt><dd class:alerta={presBad}>{pct(pres)}</dd></div>
  <div>
    <dt>Patrimônio 2026 (em 2022: {brlCurto(candidato.patrimonio_2022)})</dt>
    <dd>{brlCurto(candidato.patrimonio_total)}</dd>
  </div>
  <div><dt>Mandatos de deputado federal</dt><dd>{candidato.mandatos}</dd></div>
</dl>

<ul class="selos">
  {#each linhas as l (l.chave)}
    <li>
      <button
        type="button"
        class="selo {l.classe}"
        aria-haspopup="dialog"
        aria-label="{l.rotulo}: {l.veredito}. O que é isso?"
        onclick={(e) => abrir(l.chave, e)}
      >
        <span class="ic" aria-hidden="true">{ICONE[l.classe]}</span>
        <span class="txt"><small>{l.rotulo}</small><b>{l.veredito}</b></span>
        <span class="q" aria-hidden="true">?</span>
      </button>
    </li>
  {/each}
</ul>

{#if aberta}
  {@const ex = EXPLICA[aberta]}
  <dialog
    class="janela"
    bind:this={dlg}
    aria-labelledby="{uid}-tit"
    onclose={fechou}
    onclick={(e) => {
      if (e.target === dlg) dlg?.close();
    }}
  >
    <div class="in">
      <h4 id="{uid}-tit">{tituloAberta}</h4>
      <p>{ex.texto}</p>
      <p class="regra">{ex.regra}</p>
      <p class="fonte">Fonte: {ex.fonte} <a href={ex.link} target="_blank" rel="noopener">Ver na Câmara<span class="sr"> (abre em nova aba)</span></a></p>
      <button type="button" onclick={() => dlg?.close()}>Fechar</button>
    </div>
  </dialog>
{/if}

<style>
  .extrato {
    margin: 0;
    display: grid;
  }
  .extrato div {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 0 2px;
    border-top: 1.5px dotted var(--tinta-2);
  }
  .extrato dt {
    flex: 1 1 0;
    min-width: 0;
    font: 500 10.5px var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tinta-2);
  }
  .extrato dd {
    flex: none;
    margin: 0;
    font: 800 24px/1 var(--display);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .extrato dd.alerta {
    color: var(--carimbo);
  }

  .selos {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .selo {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border: 2px solid;
    width: 100%;
    margin: 0;
    font: inherit;
    text-align: left;
    cursor: pointer;
    min-height: 44px;
  }
  .selo:hover {
    filter: brightness(1.06);
  }
  .selo:focus-visible {
    outline: 3px solid var(--corrige);
    outline-offset: 2px;
  }
  .ic {
    flex: none;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    font: 900 18px/1 var(--display);
  }
  .txt {
    flex: 1;
    min-width: 0;
  }
  .txt small {
    display: block;
    font: 600 11px/1.15 var(--texto);
  }
  .txt b {
    display: block;
    font: 800 19px/0.95 var(--display);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .ok {
    background: var(--favor-fundo);
    border-color: var(--favor);
    color: var(--favor);
  }
  .ok .ic {
    background: var(--favor);
    color: var(--favor-fundo);
  }
  .bad {
    background: var(--carimbo);
    border-color: var(--carimbo);
    color: var(--carimbo-tx);
  }
  .bad .ic {
    background: var(--carimbo-tx);
    color: var(--carimbo);
  }
  .na {
    background: var(--papel);
    border-style: dashed;
    border-color: var(--tinta-2);
    color: var(--tinta-2);
  }
  .na .ic {
    border: 1.5px solid var(--tinta-2);
  }
  .q {
    flex: none;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font: 700 11px/1 var(--mono);
    display: grid;
    place-items: center;
  }

  dialog.janela {
    border: 2px solid var(--tinta);
    background: var(--papel);
    color: var(--tinta);
    padding: 0;
    width: min(92vw, 440px);
    box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.28);
  }
  dialog.janela::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }
  .in {
    padding: 16px;
    display: grid;
    gap: 10px;
  }
  h4 {
    margin: 0;
    font: 900 24px/1 var(--display);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .in p {
    margin: 0;
    line-height: 1.5;
  }
  .regra {
    font: 700 13px/1.3 var(--texto);
    border-left: 5px solid var(--carimbo);
    padding-left: 8px;
  }
  .fonte {
    font-size: 12.5px;
    color: var(--tinta-2);
  }
  .fonte a {
    color: var(--tinta);
    font-weight: 600;
  }
  .in > button {
    justify-self: stretch;
    min-height: 44px;
    font: 700 14px var(--texto);
    color: var(--papel);
    background: var(--tinta);
    border: 0;
    cursor: pointer;
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
