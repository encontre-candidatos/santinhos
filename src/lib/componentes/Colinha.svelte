<!--
  Colinha (versão 4310, 03/10/2026; melhoria 6 de docs/eleitor-indeciso.md): tela que imita o
  visor da urna com o número grande, o nome e o partido, para imprimir, fotografar ou anotar.
  O número fica guardado só no aparelho ($lib/colinha). Na impressão sai só o papel da colinha
  (a classe `com-colinha` no <html> liga a regra de impressão só enquanto esta tela está aberta).
  Celular não entra na cabine: o aviso fica sempre à vista.
-->
<script lang="ts">
  import type { Colinha } from '$lib/colinha';
  import { onMount, tick } from 'svelte';

  interface Props {
    colinha: Colinha;
    onfechar: () => void;
    ontrocar: () => void;
    oncompartilhar: () => void;
  }

  let { colinha, onfechar, ontrocar, oncompartilhar }: Props = $props();

  const digitos = $derived([...colinha.numero_urna]);
  let titulo = $state<HTMLElement>();

  onMount(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('com-colinha');
    tick().then(() => titulo?.focus({ preventScroll: true }));
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onfechar();
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.body.style.overflow = antes;
      document.documentElement.classList.remove('com-colinha');
      document.removeEventListener('keydown', tecla);
    };
  });
</script>

<div class="tela" role="dialog" aria-modal="true" aria-labelledby="colinha-titulo">
  <div class="caixa">
    <h2 id="colinha-titulo" tabindex="-1" bind:this={titulo}>Sua colinha</h2>

    <div class="colinha-papel" aria-label="Colinha: deputado federal, número {colinha.numero_urna}, {colinha.nome_urna}, {colinha.partido}" role="img">
      <p class="seu">Seu voto para</p>
      <p class="cargo">Deputado federal</p>
      <div class="linha-num">
        <span class="rot">Número:</span>
        <span class="digitos">
          {#each digitos as d, i (i)}<i>{d}</i>{/each}
        </span>
      </div>
      <p class="campo"><span class="rot">Nome:</span> <b>{colinha.nome_urna}</b></p>
      <p class="campo"><span class="rot">Partido:</span> <b>{colinha.partido}</b></p>
      <p class="rodape-papel">Eleição de 4 de outubro de 2026</p>
    </div>

    <p class="cabine">Celular não entra na cabine: anote o número no papel ou decore.</p>

    <div class="acoes">
      <button type="button" class="tecla-g confirma" onclick={() => window.print()}>Imprimir</button>
      <button type="button" class="tecla-g branco" onclick={oncompartilhar}>Compartilhar</button>
      <button type="button" class="tecla-g corrige" onclick={ontrocar}>Trocar de candidato</button>
      <button type="button" class="tecla-g fechar" onclick={onfechar}>Fechar</button>
    </div>
    <p class="nota">O número fica guardado só neste aparelho.</p>
  </div>
</div>

<style>
  .tela {
    position: fixed;
    inset: 0;
    z-index: 60;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--urna);
    color: var(--fg);
    padding: calc(env(safe-area-inset-top, 0px) + 16px) max(16px, env(safe-area-inset-right, 0px))
      calc(env(safe-area-inset-bottom, 0px) + 24px) max(16px, env(safe-area-inset-left, 0px));
  }
  .caixa {
    max-width: 480px;
    margin: 0 auto;
    display: grid;
    gap: 14px;
  }
  h2 {
    margin: 0;
    font: 900 26px/1 var(--display);
    text-transform: uppercase;
  }
  h2:focus {
    outline: none;
  }

  /* O visor da urna: fundo claro, letras pretas, número em casas. */
  .colinha-papel {
    background: var(--visor);
    color: var(--tinta);
    border: 4px solid var(--tecla);
    padding: 16px 16px 14px;
    display: grid;
    gap: 8px;
  }
  .colinha-papel p {
    margin: 0;
  }
  .seu {
    font: 700 13px var(--mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .cargo {
    font: 900 34px/1 var(--display);
    text-transform: uppercase;
  }
  .linha-num {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 6px 0;
  }
  .rot {
    font: 500 14px var(--mono);
  }
  .digitos {
    display: flex;
    gap: 6px;
  }
  .digitos i {
    font-style: normal;
    font: 800 64px/1 var(--display);
    width: 54px;
    height: 76px;
    display: grid;
    place-items: center;
    border: 3px solid var(--tinta);
    background: var(--papel);
    font-variant-numeric: tabular-nums;
  }
  .campo {
    font: 400 16px/1.3 var(--texto);
  }
  .campo b {
    font: 800 24px/1.05 var(--display);
    text-transform: uppercase;
  }
  .rodape-papel {
    margin-top: 6px !important;
    padding-top: 8px;
    border-top: 1.5px dashed var(--tinta-2);
    font: 500 12px var(--mono);
    color: var(--tinta-2);
  }

  .cabine {
    margin: 0;
    font: 700 16px/1.35 var(--texto);
    background: var(--papel);
    color: var(--tinta);
    border-left: 6px solid var(--corrige);
    padding: 10px 12px;
  }
  .acoes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .tecla-g {
    min-height: 54px;
    padding: 10px 6px;
    border: 0;
    font: 800 17px/1.05 var(--display);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #111;
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }
  .confirma {
    background: var(--confirma);
  }
  .branco {
    background: var(--branco);
  }
  .corrige {
    background: var(--corrige);
  }
  .fechar {
    background: var(--tecla);
    color: var(--tecla-tx);
  }
  .nota {
    margin: 0;
    font: 400 13px var(--texto);
    color: var(--muted);
  }

  /* Impressão: só o papel da colinha. */
  @media print {
    :global(html.com-colinha body *) {
      visibility: hidden !important;
    }
    :global(html.com-colinha) .colinha-papel,
    :global(html.com-colinha) .colinha-papel * {
      visibility: visible !important;
    }
    .tela {
      position: static;
      overflow: visible;
      background: #fff;
    }
    .colinha-papel {
      position: absolute;
      left: 0;
      top: 0;
      width: 12cm;
      background: #fff;
      color: #000;
      border-color: #000;
    }
    .digitos i {
      background: #fff;
      border-color: #000;
    }
  }
</style>
