<!--
  Marca "EXTREMA DIREITA" (FR-006, alterado em 02/10/2026): faixa vermelha no topo do santinho,
  no lugar do fio do partido, com o texto em display grande e um contorno interno de carimbo.
  O texto visível fica escondido do leitor de tela, que ouve a frase completa: a marca é do
  partido, não da pessoa (Limitação aceita da spec).
  Contraste do texto (#fffefa sobre --carimbo): claro 6,48:1 · escuro 5,47:1.
  Versão 4310 (03/10/2026): "?" de "O que é isso?" no canto, com o balão abrindo para baixo.
-->
<script lang="ts">
  import Explica from './Explica.svelte';
</script>

<div class="carimbo">
  <Explica
      titulo="Extrema direita"
      texto="A marca é do partido, não da pessoa: todo candidato de partido classificado como extrema direita leva a marca. A lista dos partidos e o motivo de cada um estão no fim da página."
      fonte="classificação deste site, com o motivo registrado para cada partido (conferida em 02/10/2026)."
      para="baixo"
      claro
    />
  <span class="txt" aria-hidden="true">EXTREMA DIREITA</span>
  <span class="sr">Partido classificado como extrema direita</span>
</div>

<style>
  .carimbo {
    position: relative;
    background: var(--carimbo);
    color: var(--carimbo-tx);
    padding: 10px 10px 8px;
    /* Contorno interno de carimbo de borracha. */
    outline: 2px solid var(--carimbo-tx);
    outline-offset: -6px;
    text-align: center;
  }
  .carimbo > :global(.raiz > .q) {
    position: absolute;
    top: 50%;
    right: 12px;
    translate: 0 -50%;
  }
  .txt {
    display: block;
    font: 900 30px/0.95 var(--display);
    letter-spacing: 0.06em;
    padding: 4px 6px 2px;
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
