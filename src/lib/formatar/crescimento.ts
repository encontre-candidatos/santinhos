// Crescimento do patrimônio declarado, da declaração mais recente antes de 2026 para a de 2026,
// como aparece no carimbo (FR-015, T047; alterado em 03/10/2026 por FR-062 a FR-064, WP16).
// O valor antigo é corrigido pelo IPCA antes da regra (FR-063): a razão é sempre a corrigida.
// Texto descritivo da declaração, nunca de conduta (C-009).
import type { Candidato } from '$lib/tipos';
import { ANO_REFERENCIA_IPCA, valorCorrigido } from './inflacao';
import { formatarPatrimonio } from './patrimonio';

/** A partir de quantas vezes o cartão ganha o carimbo (decisão de 02/10/2026). */
export const CORTE_CRESCIMENTO = 2;
/**
 * E com aumento de pelo menos meio milhão de reais (decisão de 02/10/2026): sem o piso, a razão
 * marcava bases pequenas, como R$ 62.632 → R$ 188.961 (3,0×, +R$ 126 mil). Também sobre o valor
 * corrigido (03/10/2026).
 */
export const CORTE_AUMENTO = 500_000;

type Patrimonios = Pick<Candidato, 'patrimonio_total' | 'patrimonio_anterior'>;

/** Razão entre 2026 e a declaração anterior corrigida; `null` sem declaração anterior, com ela zero ou sem bens em 2026. */
export function crescimentoPatrimonio(c: Patrimonios): number | null {
  const antes = valorCorrigido(c.patrimonio_anterior);
  if (antes === null || antes === 0 || c.patrimonio_total === null) return null;
  return c.patrimonio_total / antes;
}

/** Aumento em reais de 2026: total de 2026 menos o valor anterior corrigido. */
function aumentoCorrigido(c: Patrimonios): number {
  return c.patrimonio_total! - valorCorrigido(c.patrimonio_anterior)!;
}

export function marcaCrescimento(c: Patrimonios): boolean {
  const r = crescimentoPatrimonio(c);
  return r !== null && r >= CORTE_CRESCIMENTO && aumentoCorrigido(c) >= CORTE_AUMENTO;
}

/** Ano da declaração com que o carimbo compara; `null` sem declaração anterior. */
export function anoComparacao(c: Patrimonios): number | null {
  return c.patrimonio_anterior?.ano ?? null;
}

/** Só o número: inteiro a partir de 10 (105,88 → "106"), uma casa com vírgula abaixo (2,07 → "2,1"). */
function numeroMultiplicador(r: number): string {
  const umaCasa = Math.round(r * 10) / 10;
  // 9,96 arredonda para 10,0: a partir daí vale a regra do inteiro.
  if (umaCasa >= 10) return String(Math.round(r));
  return umaCasa.toFixed(1).replace('.', ',');
}

export function textoMultiplicador(r: number): string {
  return `${numeroMultiplicador(r)}×`;
}

/**
 * Frase do leitor de tela, com o valor antigo nominal, o corrigido e o ano (FR-064):
 * "Patrimônio declarado 2,1 vezes maior que em 2018, já descontada a inflação (IPCA): de R$ 100.000
 * em 2018 (R$ 150.960 em valores de 2026) para R$ 320.000".
 */
export function textoLeitorCrescimento(c: Patrimonios): string | null {
  const r = crescimentoPatrimonio(c);
  if (r === null) return null;
  const { ano, valor } = c.patrimonio_anterior!;
  return (
    `Patrimônio declarado ${numeroMultiplicador(r)} vezes maior que em ${ano}, já descontada a inflação (IPCA): ` +
    `de ${formatarPatrimonio(valor)} em ${ano} (${formatarPatrimonio(valorCorrigido(c.patrimonio_anterior))} ` +
    `em valores de ${ANO_REFERENCIA_IPCA}) para ${formatarPatrimonio(c.patrimonio_total)}`
  );
}

/**
 * Frase do balão do carimbo: "O patrimônio declarado de X ficou 2,1 vezes maior que em 2018, com
 * R$ 634.568 a mais, já descontada a inflação."
 */
export function fraseCrescimento(c: Patrimonios, nome: string): string | null {
  const r = crescimentoPatrimonio(c);
  if (r === null) return null;
  const aumento = formatarPatrimonio(aumentoCorrigido(c));
  return (
    `O patrimônio declarado de ${nome} ficou ${numeroMultiplicador(r)} vezes maior que em ${c.patrimonio_anterior!.ano}, ` +
    `com ${aumento} a mais, já descontada a inflação.`
  );
}

/** Nome de urna (em maiúsculas no TSE) para dentro de frase: "PAULO ABI-ACKEL" → "Paulo Abi-Ackel". */
export function nomeEmFrase(nome: string): string {
  return nome
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('pt-BR'))
    .replace(/ (Da|De|Do|Das|Dos|E)(?= )/g, (m) => m.toLocaleLowerCase('pt-BR'));
}
