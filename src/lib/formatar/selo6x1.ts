// Selo do fim da escala 6x1 no santinho (FR-016 a FR-022, T051).
// A situação sai de `voto_6x1`, nesta prioridade: não era deputado, votou contra, apoiou
// mudanças para enfraquecer (com a linha "e faltou" quando faltou), faltou, votou a favor.
// Os textos moram aqui, não no componente, para os testes conferirem o que o eleitor lê.
import type { Voto6x1 } from '$lib/tipos';

export type Situacao6x1 = 'sem_mandato' | 'contra' | 'enfraquecer' | 'faltou' | 'favor';

export interface Selo6x1 {
  situacao: Situacao6x1;
  /** Só com `enfraquecer`: também faltou na votação final (FR-019). */
  faltou: boolean;
}

export const ROTULO_6X1 = 'Fim da escala 6x1';
export const LINHA_FALTOU = 'e faltou na votação final';
export const DATA_6X1 = '27 de maio de 2026';
export const LINK_6X1 = 'https://www.camara.leg.br/propostas-legislativas/2233802';

export function selo6x1(v: Voto6x1): Selo6x1 {
  if (v.final === null) return { situacao: 'sem_mandato', faltou: false };
  if (v.final === 'nao') return { situacao: 'contra', faltou: false };
  if (v.emendas.length > 0) return { situacao: 'enfraquecer', faltou: v.final === 'ausente' };
  if (v.final === 'ausente') return { situacao: 'faltou', faltou: false };
  return { situacao: 'favor', faltou: false };
}

/** Ícone (decorativo) e texto em destaque de cada situação (NFR-011: até 5 palavras). */
export const TEXTO_6X1: Record<Situacao6x1, { icone: string; texto: string }> = {
  favor: { icone: '✔', texto: 'VOTOU A FAVOR' },
  enfraquecer: { icone: '⚠', texto: 'APOIOU MUDANÇAS PARA ENFRAQUECER' },
  faltou: { icone: '–', texto: 'FALTOU NA VOTAÇÃO' },
  contra: { icone: '✖', texto: 'VOTOU CONTRA' },
  sem_mandato: { icone: '', texto: 'Não era deputado na votação' }
};

/** Frase completa para leitor de tela (FR-022). */
export function frase6x1({ situacao, faltou }: Selo6x1): string {
  const fim = `na votação final da Câmara, em ${DATA_6X1}`;
  switch (situacao) {
    case 'favor':
      return `${ROTULO_6X1}: votou a favor ${fim}.`;
    case 'contra':
      return `${ROTULO_6X1}: votou contra ${fim}.`;
    case 'faltou':
      return `${ROTULO_6X1}: faltou ${fim}.`;
    case 'enfraquecer':
      return (
        `${ROTULO_6X1}: apoiou mudanças para enfraquecer a proposta` +
        (faltou ? `, e faltou ${fim}.` : '.')
      );
    case 'sem_mandato':
      return `${ROTULO_6X1}: não era deputado na votação, em ${DATA_6X1}.`;
  }
}

/** Voto no Plenário como o eleitor lê no balão de detalhes do selo. */
export function textoVoto(v: Voto6x1['final']): string {
  if (v === 'sim') return 'Sim';
  if (v === 'nao') return 'Não';
  if (v === 'ausente') return 'Faltou';
  return 'Fora do mandato';
}

/** Assinatura das Emendas 1 e 2, vigente na data da votação. */
export function textoEmendas(emendas: Voto6x1['emendas']): string {
  if (emendas.length === 0) return 'Não assinou';
  if (emendas.length === 2) return 'Assinou as duas';
  return `Assinou a Emenda ${emendas[0]}`;
}

/** O que as Emendas 1 e 2 faziam (mesma redação do rodapé, FR-023). */
export const EMENDAS_6X1 =
  'As Emendas 1 e 2 abriam exceção de até 44 horas, deixavam acordo valer mais que a lei e ' +
  'adiavam a mudança em 10 anos. O relator rejeitou as duas.';
