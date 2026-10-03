// Correção pela inflação do patrimônio declarado antes de 2026 (FR-063, C-031, WP16/T076).
// Só o IPCA, número-índice de agosto (mês do registro de candidatura), tabela 1737 do SIDRA/IBGE.
// O fator de cada candidato vem pronto na base (`patrimonio_anterior.fator_ipca`); aqui só a conta.
import type { PatrimonioAnterior } from '$lib/tipos';

/** Ano para o qual o valor antigo é trazido. */
export const ANO_REFERENCIA_IPCA = 2026;

/** Fator de agosto do ano antigo a agosto de 2026: índice de ago/2026 ÷ índice de ago/<ano>. */
export function fatorIpca(indiceAno: number, indiceReferencia: number): number {
  if (!(indiceAno > 0) || !(indiceReferencia > 0)) throw new Error('número-índice do IPCA inválido');
  return indiceReferencia / indiceAno;
}

/** Valor antigo em reais de 2026, em centavos inteiros como as somas da base. */
export function corrigir(valor: number, fator: number): number {
  return Math.round(valor * fator * 100) / 100;
}

/** Valor da declaração anterior trazido a 2026; `null` sem declaração. */
export function valorCorrigido(anterior: PatrimonioAnterior | null): number | null {
  return anterior === null ? null : corrigir(anterior.valor, anterior.fator_ipca);
}
