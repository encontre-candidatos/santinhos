<!--
  Dica de instalação só para Safari no iOS ainda não instalado (lá o navegador não oferece).
  "Fechar" guarda a escolha no aparelho (localStorage); nada sai do aparelho (C-004).
-->
<script lang="ts">
  const CHAVE = 'vitrine-dica-instalar-fechada';
  let visivel = $state(false);

  $effect(() => {
    const ua = navigator.userAgent;
    const iosSafari = /iP(hone|ad|od)/.test(ua) && !/CriOS|FxiOS/.test(ua);
    const instalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let fechada = false;
    try {
      fechada = localStorage.getItem(CHAVE) === '1';
    } catch {
      /* sem armazenamento: mostra de novo na próxima visita */
    }
    visivel = iosSafari && !instalado && !fechada;
  });

  function fechar() {
    visivel = false;
    try {
      localStorage.setItem(CHAVE, '1');
    } catch {
      /* ignora */
    }
  }
</script>

{#if visivel}
  <div class="dica">
    <svg viewBox="0 0 20 24" width="18" height="22" aria-hidden="true" focusable="false">
      <path d="M10 2v13M5.5 6.5 10 2l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M6 10H3v12h14V10h-3" fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
    <p>Para usar sem internet: toque em Compartilhar e depois em Adicionar à Tela de Início.</p>
    <button type="button" onclick={fechar}>Fechar</button>
  </div>
{/if}

<style>
  .dica {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 2px dashed var(--fg);
    color: var(--fg);
    padding: 8px 10px;
    margin: 0 0 20px;
    font-size: 13px;
  }
  svg {
    flex: none;
  }
  p {
    margin: 0;
    flex: 1;
  }
  button {
    flex: none;
    font: 700 12px var(--mono);
    background: var(--tecla);
    color: var(--tecla-tx);
    border: 0;
    padding: 8px 12px;
    min-height: 44px;
    cursor: pointer;
  }
</style>
