<script lang="ts">
  import type { Component } from 'svelte';
  const mods = import.meta.glob<{ default: Component }>('/src/lib/componentes/Vitrine.svelte', { eager: true });
  const Vitrine = Object.values(mods)[0]?.default;

  // Endereço público (GitHub Pages da organização). WhatsApp e Google só aceitam imagem e link
  // absolutos; o caminho vem do BASE_PATH do build ("/santinhos"), então muda junto com o repositório.
  const SITE = `https://encontre-candidatos.github.io${__CAMINHO_BASE__}/`;
  const titulo = 'Em quem votar para deputado federal em MG? Santinhos MG 2026';
  const descricao =
    'Veja como os 48 deputados de Minas que tentam a reeleição votaram (6x1, PEC da Blindagem), ' +
    'quanto faltaram e quanto o patrimônio cresceu. Guia de 4 perguntas e colinha para a urna.';
  const imagem = `${SITE}og/compartilhar.jpg`;
  const dadosEstruturados = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Santinhos MG 2026',
    url: SITE,
    inLanguage: 'pt-BR',
    description: descricao
  });
</script>

<svelte:head>
  <title>{titulo}</title>
  <meta name="description" content={descricao} />
  <link rel="canonical" href={SITE} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Santinhos MG 2026" />
  <meta property="og:url" content={SITE} />
  <meta property="og:title" content="Em quem votar para deputado federal em MG?" />
  <meta property="og:description" content={descricao} />
  <meta property="og:image" content={imagem} />
  <meta property="og:image:secure_url" content={imagem} />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta
    property="og:image:alt"
    content="Em quem votar? Como os deputados de MG votaram, presença e patrimônio, com o botão Me ajude a escolher."
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Em quem votar para deputado federal em MG?" />
  <meta name="twitter:description" content={descricao} />
  <meta name="twitter:image" content={imagem} />
  {@html `<script type="application/ld+json">${dadosEstruturados}</script>`}
</svelte:head>

{#if Vitrine}
  <Vitrine />
{:else}
  <main style="padding:2rem;font-family:system-ui">Vitrine em construção.</main>
{/if}
