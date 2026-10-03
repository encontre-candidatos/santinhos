// PEC da Blindagem (PEC 3/2021; versão 4310, 03/10/2026). A marca vale para quem votou Sim em
// algum dos dois turnos no Plenário, em 16/09/2025 (decisão registrada em docs/eleitor-indeciso.md).
// null (não era deputado na data) não leva marca. Texto descritivo do voto, sem adjetivo.
import type { Blindagem } from '$lib/tipos';

export const ROTULO_BLINDAGEM = 'Votou para dificultar processo contra deputado';
export const DATA_BLINDAGEM = '16 de setembro de 2025';
export const LINK_BLINDAGEM = 'https://www.camara.leg.br/propostas-legislativas/2270800';
export const EXPLICA_BLINDAGEM =
  'A PEC 3/2021, a PEC da Blindagem, obrigava a Câmara a autorizar, em voto secreto, antes que o Supremo pudesse processar um deputado. Este deputado votou Sim em pelo menos um dos dois turnos; depois, o Senado derrubou a proposta.';
export const FONTE_BLINDAGEM = `Câmara dos Deputados, votação no Plenário em ${DATA_BLINDAGEM} (1º e 2º turno).`;

export function votouBlindagem(b: Blindagem | null | undefined): boolean {
  return !!b && (b.t1 === 'sim' || b.t2 === 'sim');
}

/** Votou Não em algum turno e Sim em nenhum. */
export function contraBlindagem(b: Blindagem | null | undefined): boolean {
  return !!b && !votouBlindagem(b) && (b.t1 === 'nao' || b.t2 === 'nao');
}

export function textoTurno(v: Blindagem['t1']): string {
  if (v === 'sim') return 'Sim';
  if (v === 'nao') return 'Não';
  if (v === 'ausente') return 'Faltou';
  return 'Fora do mandato';
}
