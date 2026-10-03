// Participação nas votações nominais do Plenário em 2026 (FR-031 a FR-035, T059).
// N = votou/total × 10, arredondado; 10 só com todas (FR-032). De 0 a 4 o bloco fica no
// vermelho do carimbo (corte de 5 em 10, FR-033). As frases descrevem o número, sem julgar
// (C-014), e moram aqui para os testes conferirem o que o eleitor lê.
import type { Votacoes2026 } from '$lib/tipos';

export const ROTULO_PARTICIPACAO = 'Votações na Câmara em 2026';
export const SEM_MANDATO_PARTICIPACAO = 'Não estava no mandato nas votações de 2026';
/** Abaixo de 5 em 10 fica vermelho. */
export const CORTE_PARTICIPACAO = 5;
/** De 9 em 10 para cima, etiqueta verde "Vota muito" (versão 4310, 03/10/2026). */
export const CORTE_VOTA_MUITO = 9;
export const EXPLICA_PARTICIPACAO =
  'De cada 10 votações com voto registrado no Plenário da Câmara em 2026, em quantas o deputado votou. "Vota muito" aparece a partir de 9 em 10; de 0 a 4 fica em vermelho.';
export const FONTE_PARTICIPACAO = 'Câmara dos Deputados, votações nominais do Plenário em 2026 (dados abertos, conferido em 03/10/2026).';

export type Participacao =
  | { sem: true }
  | { sem: false; n: number; menosDeUm: boolean; vermelho: boolean; votou: number; total: number };

export function participacao(v: Votacoes2026 | null): Participacao {
  if (v === null) return { sem: true };
  const n = v.votou === v.total ? 10 : Math.min(9, Math.round((v.votou / v.total) * 10));
  return { sem: false, n, menosDeUm: v.votou > 0 && n === 0, vermelho: n < CORTE_PARTICIPACAO, votou: v.votou, total: v.total };
}

/** Frase visível do bloco. */
export function fraseParticipacao(p: Participacao): string {
  if (p.sem) return SEM_MANDATO_PARTICIPACAO;
  return p.menosDeUm ? 'De cada 10, votou em menos de 1' : `De cada 10, votou em ${p.n}`;
}

/** Frase para leitor de tela, com os números exatos (FR-035). */
export function fraseParticipacaoSr(p: Participacao): string {
  if (p.sem) return `${ROTULO_PARTICIPACAO}: não estava no mandato nas votações de 2026.`;
  const cerca = p.menosDeUm ? 'menos de 1 em cada 10' : p.n === 10 ? 'todas' : `cerca de ${p.n} em cada 10`;
  return `${ROTULO_PARTICIPACAO}: votou em ${p.votou} de ${p.total}, ${cerca}.`;
}
