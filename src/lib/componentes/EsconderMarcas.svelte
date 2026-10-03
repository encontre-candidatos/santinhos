<!--
  Bloco "Esconder quem tem" (FR-050 a FR-054, WP14/T069): uma chave por marca do registro
  ($lib/marcas), na ordem dele, com quantos da base têm a marca. Todas desligadas ao abrir; a
  escolha vive só no estado da página: nada em armazenamento, endereço ou texto de "Indicar" (C-020).
  Chave = <button aria-pressed>, que o leitor de tela anuncia como ligada/desligada (NFR-031).
-->
<script lang="ts">
  import type { Marca } from '$lib/marcas';

  interface Props {
    chaves: { marca: Marca; n: number }[];
    ligadas: string[];
    ontrocar: (id: string) => void;
  }

  let { chaves, ligadas, ontrocar }: Props = $props();
</script>

<span class="rot2" id="rot-esconder">Esconder quem tem</span>
<div class="chaves" role="group" aria-labelledby="rot-esconder">
  {#each chaves as { marca, n } (marca.id)}
    {@const ligada = ligadas.includes(marca.id)}
    <button type="button" class="chave" class:ligada aria-pressed={ligada} onclick={() => ontrocar(marca.id)}>
      <span class="caixa" aria-hidden="true">{ligada ? '✕' : ''}</span>
      <span class="rot">{marca.rotulo}</span>
      <span class="n">({n})</span>
    </button>
  {/each}
</div>

<style>
  .rot2 {
    display: block;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 14px 0 6px;
  }
  .chaves {
    display: grid;
    gap: 6px;
  }
  .chave {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 40px;
    padding: 6px 10px;
    font: 600 13px/1.2 var(--texto);
    text-align: left;
    color: var(--tinta);
    background: var(--visor);
    border: 2px solid var(--tecla);
    border-radius: 0;
    cursor: pointer;
  }
  .chave:focus-visible {
    outline: 3px solid var(--fg);
    outline-offset: 2px;
  }
  .caixa {
    flex: none;
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border: 2px solid var(--tecla);
    font: 900 12px/1 var(--texto);
  }
  .rot {
    flex: 1 1 auto;
    min-width: 0;
  }
  .n {
    flex: none;
    font: 500 12px var(--mono);
    color: var(--tinta-2);
  }
  /* Ligada: tecla preta, como as teclas pressionadas da urna. */
  .ligada {
    background: var(--tecla);
    color: var(--tecla-tx);
  }
  .ligada .caixa {
    border-color: var(--tecla-tx);
  }
  .ligada .n {
    color: var(--tecla-tx);
  }
  @media (max-width: 860px), (pointer: coarse) {
    .chave {
      min-height: 44px;
    }
  }
</style>
