<!--
  Escolha do topo (WP17, FR-066): "Reeleição (N)" ou "Todos os candidatos (M)", com N e M da base.
  Duas teclas da urna com `aria-pressed`; a ativa fica como visor, igual às teclas de partido.
  Não guarda nada: a escolha vive no estado da Vitrine e toda abertura começa em "Reeleição"
  (FR-069). Trocar não mexe na busca, no partido nem nas chaves de marca (FR-067).
-->
<script lang="ts">
  import type { Universo } from '$lib/tipos';
  import Tecla from './Tecla.svelte';

  interface Props {
    universo: Universo;
    nReeleicao: number;
    nTodos: number;
    ontrocar: (u: Universo) => void;
  }

  let { universo, nReeleicao, nTodos, ontrocar }: Props = $props();
</script>

<div class="abas" role="group" aria-label="Quais candidatos ver">
  <Tecla
    rotulo={`Reeleição (${nReeleicao})`}
    pressionada={universo === 'reeleicao'}
    onclick={() => ontrocar('reeleicao')}
  />
  <Tecla
    rotulo={`Todos os candidatos (${nTodos})`}
    pressionada={universo === 'todos'}
    onclick={() => ontrocar('todos')}
  />
</div>

<style>
  .abas {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    background: var(--urna);
    border: 2px solid var(--urna-borda);
    padding: 8px;
  }
  .abas :global(button) {
    font-size: 14px;
    min-height: 44px;
    padding-inline: 8px;
    white-space: normal;
    text-align: center;
  }
</style>
