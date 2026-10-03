<!--
  Faixa de aviso fixa embaixo (acima da área segura). A região `role="status"` fica sempre no DOM,
  para o leitor de tela anunciar cada aviso. Aviso simples some em 2,5 s; o de falha (texto para
  copiar à mão) fica até "Fechar", porque 2,5 s não dá para selecionar e copiar.
-->
<script lang="ts" module>
  export interface MensagemAviso {
    id: number;
    texto: string;
    copiar?: string;
  }
</script>

<script lang="ts">
  interface Props {
    aviso: MensagemAviso | null;
    onfechar: () => void;
  }

  let { aviso, onfechar }: Props = $props();

  $effect(() => {
    if (!aviso || aviso.copiar !== undefined) return;
    const t = setTimeout(onfechar, 2500);
    return () => clearTimeout(t);
  });
</script>

<div class="faixa" class:ativa={aviso !== null} role="status">
  {#if aviso}
    <p>{aviso.texto}</p>
    {#if aviso.copiar !== undefined}
      <textarea
        readonly
        rows="5"
        aria-label="Texto para copiar"
        onfocus={(e) => e.currentTarget.select()}>{aviso.copiar}</textarea
      >
      <button type="button" onclick={onfechar}>Fechar</button>
    {/if}
  {/if}
</div>

<style>
  .faixa {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100vw - 32px);
    z-index: 70; /* acima do guia e da colinha (versão 4310) */
  }
  .faixa.ativa {
    background: var(--tecla);
    color: var(--tecla-tx);
    font: 600 13px var(--texto);
    padding: 10px 16px;
    box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.25);
  }
  p {
    margin: 0;
  }
  textarea {
    display: block;
    width: min(420px, calc(100vw - 64px));
    margin: 8px 0;
    font: 500 12px/1.4 var(--mono);
    background: var(--visor);
    color: var(--tinta);
    border: 2px solid var(--tecla-tx);
    border-radius: 0;
    padding: 6px 8px;
    resize: none;
  }
  button {
    font: 700 12px var(--mono);
    background: var(--tecla-tx);
    color: var(--tecla);
    border: 0;
    padding: 8px 14px;
    min-height: 44px;
    cursor: pointer;
  }
</style>
