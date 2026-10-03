// "É da sua região" (versão 4310, 03/10/2026): posição e votos do candidato na cidade escolhida,
// na eleição de 2022 a deputado federal por MG (TSE). Só há dado para quem ficou entre os 10
// primeiros da cidade. Frases sem gênero ("ficou em 2º lugar"): a base não traz o gênero.
import type { Candidato, Municipio } from '$lib/tipos';

export const EXPLICA_REGIAO =
  'Mostra a posição do candidato na sua cidade na eleição para deputado federal de 2022, entre todos os candidatos daquele ano, e quantos votos ele teve aí.';
export const FONTE_REGIAO = 'TSE, votação por município na eleição de 2022 (dados abertos, conferido em 03/10/2026).';

/** Milhar com ponto, sem Intl (o ICU de cada aparelho agrupa diferente): 12345 → "12.345". */
export function milhar(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export interface NaCidade {
  votos: number;
  posicao: number;
}

export function naCidade(c: Pick<Candidato, 'regiao_2022'>, cd: string | null | undefined): NaCidade | null {
  if (!cd) return null;
  const t = c.regiao_2022?.top[cd];
  return t ? { votos: t[0], posicao: t[1] } : null;
}

/** "Ficou em 2º lugar em Montes Claros em 2022 (12.345 votos)", ou null. */
export function fraseRegiao(c: Pick<Candidato, 'regiao_2022'>, m: Municipio | null | undefined): string | null {
  const r = naCidade(c, m?.cd);
  if (!r || !m) return null;
  return `Ficou em ${r.posicao}º lugar em ${m.nome} em 2022 (${milhar(r.votos)} ${r.votos === 1 ? 'voto' : 'votos'})`;
}
