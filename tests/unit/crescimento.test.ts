// Carimbo de crescimento do patrimônio declarado (FR-015, T046/T047; com o IPCA desde 03/10/2026, WP16).
// Os casos da regra usam fator 1 para isolar a conta; fator, limiar corrigido e Cenário 13 em inflacao.test.ts.
import { describe, expect, it } from 'vitest';
import { patrimonio2022 } from '../../scripts/lib/somar-bens.mjs';
import {
  crescimentoPatrimonio,
  fraseCrescimento,
  marcaCrescimento,
  nomeEmFrase,
  textoLeitorCrescimento,
  textoMultiplicador
} from '../../src/lib/formatar/crescimento';
import type { Candidato } from '../../src/lib/tipos';
import dados from '../fixtures/candidatos-ficticios.json';

const p = (valor: number | null, patrimonio_total: number | null, ano = 2022, fator_ipca = 1) => ({
  patrimonio_anterior: valor === null ? null : { ano, valor, fator_ipca },
  patrimonio_total
});

describe('crescimentoPatrimonio e marcaCrescimento', () => {
  it.each([
    ['1,95: sem marca', p(1000000, 1950000), 1.95, false],
    ['2,0 e +meio milhão: com marca', p(500000, 1000000), 2, true],
    ['2,07 e +meio milhão: com marca', p(1000000, 2070000), 2.07, true],
    ['3,0 mas só +R$ 126 mil: sem marca', p(62632.29, 188960.83), 188960.83 / 62632.29, false],
    ['2,46 e +R$ 499.999: sem marca', p(339000, 838999), 838999 / 339000, false],
    ['11× e exatamente +meio milhão: com marca', p(50000, 550000), 11, true],
    ['105,88: com marca', p(36820.46, 3898456.67), 3898456.67 / 36820.46, true],
    ['sem declaração anterior', p(null, 500000), null, false],
    ['declaração anterior zero', p(0, 500000), null, false],
    ['2026 sem bens', p(100000, null), null, false],
    ['2026 com bens de valor zero', p(100000, 0), 0, false]
  ])('%s', (_, c, razao, marca) => {
    if (razao === null) expect(crescimentoPatrimonio(c)).toBeNull();
    else expect(crescimentoPatrimonio(c)).toBeCloseTo(razao, 10);
    expect(marcaCrescimento(c)).toBe(marca);
  });
});

describe('textoMultiplicador', () => {
  it.each([
    [2, '2,0×'],
    [2.07, '2,1×'],
    [5.76, '5,8×'],
    [9.94, '9,9×'],
    [9.96, '10×'], // arredondada para uma casa já é 10: vale o inteiro
    [10, '10×'],
    [19.96, '20×'],
    [105.88, '106×']
  ])('%s → %s', (r, texto) => expect(textoMultiplicador(r)).toBe(texto));
});

describe('textoLeitorCrescimento', () => {
  it('traz a razão por extenso, o ano e os valores nominal, corrigido e de 2026 (FR-064)', () => {
    expect(textoLeitorCrescimento(p(36820.46, 3898456.67, 2022, 7633.23 / 6388.87))).toBe(
      'Patrimônio declarado 89 vezes maior que em 2022, já descontada a inflação (IPCA): ' +
        'de R$ 36.820 em 2022 (R$ 43.992 em valores de 2026) para R$ 3.898.457'
    );
    expect(textoLeitorCrescimento(p(100000, 320000, 2018, 7633.23 / 5056.56))).toBe(
      'Patrimônio declarado 2,1 vezes maior que em 2018, já descontada a inflação (IPCA): ' +
        'de R$ 100.000 em 2018 (R$ 150.957 em valores de 2026) para R$ 320.000'
    );
  });

  it('sem razão, sem frase', () => expect(textoLeitorCrescimento(p(null, 1))).toBeNull());
});

describe('fraseCrescimento e nomeEmFrase (balão do carimbo)', () => {
  it('multiplicador real, ano e aumento em reais de 2026', () => {
    expect(fraseCrescimento(p(600000, 1234567.89), 'Tião do Cerrado')).toBe(
      'O patrimônio declarado de Tião do Cerrado ficou 2,1 vezes maior que em 2022, com R$ 634.568 a mais, já descontada a inflação.'
    );
    expect(fraseCrescimento(p(36820.46, 3898456.67, 2022, 7633.23 / 6388.87), 'Nikolas Ferreira')).toBe(
      'O patrimônio declarado de Nikolas Ferreira ficou 89 vezes maior que em 2022, com R$ 3.854.465 a mais, já descontada a inflação.'
    );
    expect(fraseCrescimento(p(null, 1), 'X')).toBeNull();
  });

  it.each([
    ['NIKOLAS FERREIRA', 'Nikolas Ferreira'],
    ['PAULO ABI-ACKEL', 'Paulo Abi-Ackel'],
    ['MAURÍCIO DO VÔLEI', 'Maurício do Vôlei'],
    ['MARCELO ÁLVARO ANTÔNIO', 'Marcelo Álvaro Antônio'],
    ['NEWTON CARDOSO JR', 'Newton Cardoso Jr']
  ])('%s → %s', (nome, frase) => expect(nomeEmFrase(nome)).toBe(frase));
});

describe('patrimonio2022 (ligação 2026 → 2022 pelo CPF, em memória)', () => {
  const sqPorCpf = new Map([
    ['11111111111', 'sq-a'],
    ['22222222222', 'sq-b']
  ]);
  const porSq = new Map([
    ['sq-a', { total: 36820.46, itens: 3 }],
    ['sq-b', { total: null, itens: 0 }]
  ]);

  it('concorreu e declarou: o total', () => expect(patrimonio2022('11111111111', sqPorCpf, porSq)).toBe(36820.46));
  it('concorreu sem bens: 0', () => expect(patrimonio2022('22222222222', sqPorCpf, porSq)).toBe(0));
  it('não concorreu a deputado federal por MG: null', () => expect(patrimonio2022('33333333333', sqPorCpf, porSq)).toBeNull());
  it('sem CPF no registro de 2026: null', () => expect(patrimonio2022(null, sqPorCpf, porSq)).toBeNull());
});

describe('fixtures fictícias', () => {
  const candidatos = dados as Candidato[];
  it('marcam exatamente quem passa de 2× com meio milhão a mais', () => {
    // 900006 tem 2,0× nominal mas só +R$ 44.500: sem carimbo. 900001 compara com 2018 corrigido (2,04×).
    expect(candidatos.filter(marcaCrescimento).map((c) => c.id_camara)).toEqual([900001, 900008]);
  });
});
