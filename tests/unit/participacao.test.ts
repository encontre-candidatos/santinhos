// Participação nas votações de 2026: N, cor e frases (T059) e a contagem da base (T058).
import { describe, expect, it } from 'vitest';
import { fraseParticipacao, fraseParticipacaoSr, participacao } from '../../src/lib/formatar/participacao';
import { contarParticipacao, mesesEntre, votosForaDoExercicio } from '../../scripts/lib/votacoes-2026.mjs';

describe('participacao: N, menos de 1 e vermelho (FR-031 a FR-033)', () => {
  it.each([
    ['Paulo Guedes 117/123', 117, 123, 9, false],
    ['Dandara 67/123', 67, 123, 5, false],
    ['Lafayette Andrada 62/123', 62, 123, 5, false],
    ['Newton Cardoso Jr 50/123', 50, 123, 4, true],
    ['Pinheirinho 19/123', 19, 123, 2, true],
    ['Luis Tibé 39/67, só o período no mandato', 39, 67, 6, false],
    ['Pedro Aihara 103/105: quase todas não chega a 10', 103, 105, 9, false],
    ['todas 105/105', 105, 105, 10, false],
    ['1/123: menos de 1', 1, 123, 0, true],
    ['0/10', 0, 10, 0, true]
  ])('%s → %i', (_, votou, total, n, vermelho) => {
    const p = participacao({ votou, total });
    expect(p).toMatchObject({ sem: false, n, vermelho });
  });

  it('menos de 1 só quando votou em alguma', () => {
    expect(participacao({ votou: 1, total: 123 })).toMatchObject({ menosDeUm: true });
    expect(participacao({ votou: 0, total: 10 })).toMatchObject({ menosDeUm: false });
    expect(participacao({ votou: 6, total: 123 })).toMatchObject({ n: 0, menosDeUm: true });
  });

  it('null: sem bolinhas (FR-034)', () => {
    expect(participacao(null)).toEqual({ sem: true });
  });
});

describe('frases (FR-031, FR-032, FR-034, FR-035; C-014)', () => {
  it('visíveis', () => {
    expect(fraseParticipacao(participacao({ votou: 19, total: 123 }))).toBe('De cada 10, votou em 2');
    expect(fraseParticipacao(participacao({ votou: 105, total: 105 }))).toBe('De cada 10, votou em 10');
    expect(fraseParticipacao(participacao({ votou: 1, total: 123 }))).toBe('De cada 10, votou em menos de 1');
    expect(fraseParticipacao(participacao({ votou: 0, total: 10 }))).toBe('De cada 10, votou em 0');
    expect(fraseParticipacao(participacao(null))).toBe('Não estava no mandato nas votações de 2026');
  });

  it('leitor de tela, com os números exatos', () => {
    expect(fraseParticipacaoSr(participacao({ votou: 19, total: 123 }))).toBe(
      'Votações na Câmara em 2026: votou em 19 de 123, cerca de 2 em cada 10.'
    );
    expect(fraseParticipacaoSr(participacao({ votou: 1, total: 123 }))).toBe(
      'Votações na Câmara em 2026: votou em 1 de 123, menos de 1 em cada 10.'
    );
    expect(fraseParticipacaoSr(participacao({ votou: 105, total: 105 }))).toBe(
      'Votações na Câmara em 2026: votou em 105 de 105, todas.'
    );
    expect(fraseParticipacaoSr(participacao(null))).toBe('Votações na Câmara em 2026: não estava no mandato nas votações de 2026.');
  });

  it('nenhuma palavra de julgamento (C-014)', () => {
    const casos = [null, { votou: 0, total: 10 }, { votou: 1, total: 123 }, { votou: 19, total: 123 }, { votou: 105, total: 105 }];
    for (const v of casos) {
      const p = participacao(v);
      expect(`${fraseParticipacao(p)} ${fraseParticipacaoSr(p)}`).not.toMatch(/faltos|ausente|não trabalha|gazete/i);
    }
  });
});

describe('contagem da base (T058)', () => {
  const nominais = [
    { id: 'a', data: '2026-02-03', votantes: new Set([1, 2]) },
    { id: 'b', data: '2026-02-03', votantes: new Set([1]) },
    { id: 'c', data: '2026-05-10', votantes: new Set([1, 3]) },
    { id: 'd', data: '2026-05-11', votantes: new Set([2]) }
  ];
  const emExercicio = new Map([
    ['2026-02-03', new Set([1, 2])],
    ['2026-05-10', new Set([1, 3])],
    ['2026-05-11', new Set([1, 2, 3])]
  ]);

  it('total só nas datas em exercício; votou com qualquer registro; total 0 → null', () => {
    const r = contarParticipacao(nominais, emExercicio, [1, 2, 3, 4]);
    expect(r.get(1)).toEqual({ votou: 3, total: 4 });
    expect(r.get(2)).toEqual({ votou: 2, total: 3 });
    expect(r.get(3)).toEqual({ votou: 1, total: 2 });
    expect(r.get(4)).toBeNull();
  });

  it('voto fora do período em exercício fica fora da conta e vai para o relatório', () => {
    const fora = votosForaDoExercicio([{ id: 'x', data: '2026-02-03', votantes: new Set([3]) }], emExercicio, [3]);
    expect(fora).toEqual([{ id_camara: 3, votacao: 'x', data: '2026-02-03' }]);
    expect(contarParticipacao([{ id: 'x', data: '2026-02-03', votantes: new Set([3]) }], emExercicio, [3]).get(3)).toBeNull();
  });

  it('meses de 1/1 até a data de conferência', () => {
    expect(mesesEntre('2026-01-01', '2026-03-15')).toEqual([
      ['2026-01-01', '2026-01-31'],
      ['2026-02-01', '2026-02-28'],
      ['2026-03-01', '2026-03-15']
    ]);
    expect(mesesEntre('2026-01-01', '2026-10-02')).toHaveLength(10);
  });
});
