<!--
  Último cargo para o qual o candidato foi eleito (FR-038, T064): "Já foi prefeita de Montes
  Claros (2020)", e "e mais N cargos" em letra menor quando houver outros; clicar nele abre a
  lista dos outros, do mais recente ao mais antigo (pedido da usuária, 03/10/2026). Só aparece no cartão
  de quem não é deputado em exercício. Cargo de município leva "de <cidade>"; de estado, "por <UF>".
  Sem nenhum cargo (oculto mostrado pelo botão ou pelo número), diz isso.
-->
<script lang="ts">
  import type { CargoAnterior } from '$lib/tipos';

  let { cargos }: { cargos: CargoAnterior[] } = $props();

  const ultimo = $derived(cargos[0] ?? null);
  const prep = (c: CargoAnterior) => (/^[A-Z]{2}$/.test(c.lugar) ? 'por' : 'de');
  const outros = $derived(cargos.slice(1));
</script>

<div class="jafoi" class:nunca={!ultimo}>
  {#if ultimo}
    Já foi <b>{ultimo.cargo}</b> {prep(ultimo)} {ultimo.lugar} ({ultimo.ano})
    {#if outros.length > 0}
      <details>
        <summary>e mais {outros.length} {outros.length === 1 ? 'cargo' : 'cargos'}</summary>
        <ul>
          {#each outros as c, i (i)}
            <li><b>{c.cargo}</b> {prep(c)} {c.lugar} ({c.ano})</li>
          {/each}
        </ul>
      </details>
    {/if}
  {:else}
    Nunca teve cargo eletivo
  {/if}
</div>

<style>
  .jafoi {
    margin: 0;
    font: 600 13.5px/1.3 var(--texto);
    color: var(--tinta);
    padding: 6px 8px;
    border-left: 3px solid var(--tinta);
    background: color-mix(in srgb, var(--tinta) 6%, var(--papel));
  }
  .jafoi b {
    font-weight: 800;
  }
  .jafoi details {
    margin-top: 2px;
    font: 500 11.5px/1.35 var(--texto);
    color: var(--tinta-2);
  }
  .jafoi summary {
    cursor: pointer;
    width: fit-content;
    text-decoration: underline dotted;
    text-underline-offset: 2px;
  }
  .jafoi summary:focus-visible {
    outline: 2px solid var(--tinta);
    outline-offset: 2px;
  }
  .jafoi ul {
    margin: 4px 0 0;
    padding-left: 16px;
    color: var(--tinta);
  }
  .jafoi li b {
    font-weight: 700;
  }
  .nunca {
    font-weight: 500;
    color: var(--tinta-2);
    border-left-style: dashed;
    border-left-color: var(--tinta-2);
    background: none;
  }
</style>
