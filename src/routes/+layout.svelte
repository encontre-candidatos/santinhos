<script lang="ts">
  import { onMount } from 'svelte';
  import { pwaInfo } from 'virtual:pwa-info';
  let { children } = $props();
  const manifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';
  onMount(async () => {
    if (pwaInfo) {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({ immediate: true });
    }
  });
</script>

<svelte:head>{@html manifestLink}</svelte:head>
{@render children()}
