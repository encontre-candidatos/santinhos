// Lado no governo (versão 4310, 03/10/2026): de cada 10 votações nominais de 2026 em que o
// Governo orientou Sim ou Não e o deputado votou Sim ou Não, em quantas votou igual à orientação.
// Mesma régua de arredondamento da participação: 10 só com todas, 0 só com nenhuma.
// É lado, não defeito: o cartão mostra em cor neutra, sem verde nem vermelho.
import type { Governo2026 } from '$lib/tipos';

export const ROTULO_GOVERNO = 'Lado no governo Lula';
export const FONTE_GOVERNO =
  'Câmara dos Deputados, votações nominais do Plenário em 2026 e a orientação do líder do Governo em cada uma (dados abertos, conferido em 03/10/2026).';
export const EXPLICA_GOVERNO =
  'Em cada votação da Câmara, o líder do Governo diz se o governo quer Sim ou Não. Contamos em quantas o deputado votou igual ao governo. Não é bom nem ruim: mostra de que lado ele fica.';

/** N de 10 (0 a 10), ou null sem dado. */
export function governoDe10(g: Governo2026 | null | undefined): number | null {
  if (!g || g.total < 1) return null;
  if (g.com === g.total) return 10;
  if (g.com === 0) return 0;
  return Math.max(1, Math.min(9, Math.round((g.com / g.total) * 10)));
}

/** "Votou com o governo em 8 de cada 10 votações de 2026", ou null sem dado. */
export function fraseGoverno(g: Governo2026 | null | undefined): string | null {
  const n = governoDe10(g);
  if (n === null) return null;
  return `Votou com o governo em ${n} de cada 10 votações de 2026`;
}

/** Para o leitor de tela e o balão: os números exatos. */
export function fraseGovernoExata(g: Governo2026): string {
  return `Votou igual ao governo em ${g.com} de ${g.total} votações de 2026.`;
}
