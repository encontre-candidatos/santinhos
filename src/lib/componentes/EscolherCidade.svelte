<!--
  Escolha da cidade (versão 4310, 03/10/2026): campo de busca sobre os 853 municípios de MG, sem
  acento e sem caixa (mesma normalização da busca de candidatos), com até 8 sugestões; quem começa
  com o texto vem antes de quem só o contém. Um toque na sugestão escolhe. Usado no guia (passo 1)
  e no painel.
-->
<script lang="ts">
  import type { Municipio } from '$lib/tipos';
  import { normalizar } from '$lib/regras/normalizar';

  interface Props {
    municipios: readonly Municipio[];
    onescolher: (m: Municipio) => void;
    rotulo: string;
    id: string;
    /** Visual do painel (visor) ou do guia (maior). */
    variante?: 'painel' | 'guia';
    autofocus?: boolean;
  }

  let { municipios, onescolher, rotulo, id, variante = 'guia', autofocus = false }: Props = $props();

  let texto = $state('');
  const chaves = $derived(municipios.map((m) => ({ m, k: normalizar(m.nome) })));
  const sugestoes = $derived.by(() => {
    const q = normalizar(texto);
    if (!q) return [];
    const comeca = chaves.filter((x) => x.k.startsWith(q));
    const contem = chaves.filter((x) => !x.k.startsWith(q) && x.k.includes(q));
    return [...comeca, ...contem].slice(0, 8).map((x) => x.m);
  });

  let campo = $state<HTMLInputElement>();
  $effect(() => {
    if (autofocus) campo?.focus({ preventScroll: true });
  });
</script>

<div class="cidade {variante}">
  <label for={id}>{rotulo}</label>
  <input
    {id}
    bind:this={campo}
    type="search"
    autocomplete="off"
    spellcheck="false"
    placeholder="Digite o nome da cidade"
    aria-describedby="{id}-dica"
    bind:value={texto}
  />
  <p class="dica" id="{id}-dica" aria-live="polite">
    {#if texto.trim() && sugestoes.length === 0}
      Nenhuma cidade de Minas com esse nome.
    {:else if sugestoes.length}
      {sugestoes.length === 1 ? '1 cidade' : `${sugestoes.length} cidades`}: toque na sua.
    {/if}
  </p>
  {#if sugestoes.length}
    <ul class="lista" aria-label="Cidades encontradas">
      {#each sugestoes as m (m.cd)}
        <li>
          <button
            type="button"
            onclick={() => {
              onescolher(m);
              texto = '';
            }}>{m.nome}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .cidade {
    display: grid;
    gap: 6px;
  }
  label {
    font: 500 10px var(--mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .guia label {
    font: 600 12px var(--mono);
    color: var(--tinta-2);
  }
  input {
    width: 100%;
    font: 600 16px var(--texto);
    min-height: 48px;
    padding: 10px 12px;
    border: 2px solid var(--tecla);
    border-radius: 0;
    background: var(--papel);
    color: var(--tinta);
    margin: 0;
  }
  .painel input {
    background: var(--visor);
    min-height: 44px;
  }
  .dica {
    margin: 0;
    min-height: 1.2em;
    font: 500 12px/1.3 var(--texto);
    color: var(--tinta-2);
  }
  .painel .dica {
    color: var(--muted);
  }
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .lista button {
    width: 100%;
    min-height: 44px;
    text-align: left;
    padding: 8px 12px;
    font: 700 16px/1.2 var(--texto);
    color: var(--tinta);
    background: var(--papel);
    border: 2px solid var(--tecla);
    border-radius: 0;
    cursor: pointer;
    margin: 0;
  }
  .lista button:hover {
    background: var(--visor);
  }
  .painel .lista button {
    font-size: 14px;
  }
</style>
