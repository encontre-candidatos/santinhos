// Formatação do patrimônio (T043) e soma dos bens do TSE (T041).
import { describe, expect, it } from 'vitest';
import { formatarPatrimonio } from '../../src/lib/formatar/patrimonio';
import { centavos, somarBens } from '../../scripts/lib/somar-bens.mjs';

describe('formatarPatrimonio', () => {
  it.each([
    [null, 'Nenhum bem declarado'],
    [0, 'R$ 0'], // declarou bens, todos com valor zero
    [0.49, 'R$ 0'],
    [0.5, 'R$ 1'],
    [999.99, 'R$ 1.000'],
    [188960.83, 'R$ 188.961'],
    [2500000.4, 'R$ 2.500.000'],
    [2500000.5, 'R$ 2.500.001'],
    [20093322.56, 'R$ 20.093.323'],
    [1000000000, 'R$ 1.000.000.000']
  ])('%s → %s', (total, texto) => expect(formatarPatrimonio(total)).toBe(texto));
});

describe('centavos', () => {
  it.each([
    ['15000,00', 1500000],
    ['1.234,56', 123456],
    ['0,5', 50],
    ['80000', 8000000],
    ['0,00', 0]
  ])('%s → %i', (valor, c) => expect(centavos(valor)).toBe(c));

  it('recusa texto que não é valor', () => {
    expect(() => centavos('#NULO')).toThrow();
  });
});

describe('somarBens', () => {
  const linha = (sq: string, v: string) => ({ SQ_CANDIDATO: sq, VR_BEM_CANDIDATO: v });

  it('soma sem erro de ponto flutuante, conta os itens e ignora quem não está na base', () => {
    const r = somarBens(
      [linha('1', '0,10'), linha('1', '0,20'), linha('2', '0,00'), linha('9', '999,00')],
      ['1', '2', '3']
    );
    expect(r.get('1')).toEqual({ total: 0.3, itens: 2 });
    expect(r.get('2')).toEqual({ total: 0, itens: 1 });
    expect(r.get('3')).toEqual({ total: null, itens: 0 });
    expect(r.has('9')).toBe(false);
  });
});
