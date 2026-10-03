import type { Candidato } from '$lib/tipos';

export type ResultadoIndicar = 'compartilhado' | 'copiado' | 'cancelado' | 'falhou';

type Nav = Partial<Pick<Navigator, 'share' | 'clipboard'>>;

/**
 * Link que vai junto: a própria vitrine, aberta com o número do candidato na busca (`?n=`), onde
 * quem recebe vê o santinho e, dele, os links da Câmara e do DivulgaCand (pedido da usuária,
 * 03/10/2026; antes ia o link da Câmara ou do DivulgaCand). `raiz` = origem + caminho base do app.
 */
export function linkIndicacao(c: Candidato, raiz: string): string {
  return `${raiz.replace(/\/$/, '')}/?n=${encodeURIComponent(c.numero_urna)}`;
}

/** Número de urna pedido pelo link de indicação (`?n=1234`), ou null. */
export function numeroDoLink(busca: string): string | null {
  const n = new URLSearchParams(busca).get('n')?.trim() ?? '';
  return /^\d{4}$/.test(n) ? n : null;
}

/** Texto para compartilhar ou copiar. */
export function textoIndicacao(c: Candidato, raiz: string): string {
  const quem = c.reeleicao
    ? 'deputado(a) federal por MG, candidato(a) à reeleição'
    : 'candidato(a) a deputado(a) federal por MG';
  return `${c.nome_urna} (${c.partido}) — nº ${c.numero_urna}, ${quem}.\nConfira: ${linkIndicacao(c, raiz)}`;
}

function ehAbort(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

/**
 * Compartilha pela Web Share API; sem ela (ou se falhar por outro motivo que não o cancelamento),
 * copia o texto. `raiz` é o endereço do app (origem + caminho base); `nav` vem por parâmetro para ser testável sem navegador.
 */
export async function indicar(
  c: Candidato,
  raiz: string,
  nav: Nav = globalThis.navigator
): Promise<ResultadoIndicar> {
  const text = textoIndicacao(c, raiz);
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ title: c.nome_urna, text, url: linkIndicacao(c, raiz) });
      return 'compartilhado';
    } catch (e) {
      if (ehAbort(e)) return 'cancelado';
    }
  }
  try {
    if (!nav?.clipboard) return 'falhou';
    await nav.clipboard.writeText(text);
    return 'copiado';
  } catch {
    return 'falhou';
  }
}
