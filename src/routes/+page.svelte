<script lang="ts">
  import type { Component } from 'svelte';
  const mods = import.meta.glob<{ default: Component }>('/src/lib/componentes/Vitrine.svelte', { eager: true });
  const Vitrine = Object.values(mods)[0]?.default;
</script>

<svelte:head><title>Santinhos MG 2026 · Deputado federal</title></svelte:head>

{#if Vitrine}
  <Vitrine />
{:else}
  <main style="padding:2rem;font-family:system-ui">Vitrine em construção.</main>
{/if}
