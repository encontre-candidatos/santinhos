// Frases dos selos novos (versão 4310): governo, região e PEC da Blindagem.
import { describe, expect, it } from 'vitest';
import { fraseGoverno, governoDe10 } from '$lib/formatar/governo';
import { fraseRegiao, milhar, naCidade } from '$lib/formatar/regiao';
import { contraBlindagem, votouBlindagem } from '$lib/formatar/blindagem';

describe('governo', () => {
  it('N de 10: 10 só com todas, 0 só com nenhuma, arredondado no meio', () => {
    expect(governoDe10({ com: 52, total: 52 })).toBe(10);
    expect(governoDe10({ com: 51, total: 52 })).toBe(9);
    expect(governoDe10({ com: 0, total: 52 })).toBe(0);
    expect(governoDe10({ com: 1, total: 100 })).toBe(1);
    expect(governoDe10({ com: 18, total: 83 })).toBe(2);
    expect(governoDe10(null)).toBeNull();
  });
  it('frase', () => {
    expect(fraseGoverno({ com: 66, total: 70 })).toBe('Votou com o governo em 9 de cada 10 votações de 2026');
    expect(fraseGoverno(null)).toBeNull();
  });
});

describe('região', () => {
  const c = { regiao_2022: { total: 50000, top: { '48658': [12345, 2] as [number, number], '40010': [1, 1] as [number, number] } } };
  it('posição e votos na cidade, com milhar', () => {
    expect(naCidade(c, '48658')).toEqual({ votos: 12345, posicao: 2 });
    expect(naCidade(c, '11111')).toBeNull();
    expect(naCidade({ regiao_2022: null }, '48658')).toBeNull();
    expect(fraseRegiao(c, { cd: '48658', nome: 'Montes Claros' })).toBe('Ficou em 2º lugar em Montes Claros em 2022 (12.345 votos)');
    expect(fraseRegiao(c, { cd: '40010', nome: 'Abadia dos Dourados' })).toBe('Ficou em 1º lugar em Abadia dos Dourados em 2022 (1 voto)');
    expect(fraseRegiao(c, null)).toBeNull();
    expect(milhar(1492047)).toBe('1.492.047');
    expect(milhar(999)).toBe('999');
  });
});

describe('Blindagem', () => {
  it('Sim em algum turno marca; Não sem Sim é "contra"; falta e fora do mandato, nenhum dos dois', () => {
    expect(votouBlindagem({ t1: 'sim', t2: 'nao' })).toBe(true);
    expect(contraBlindagem({ t1: 'sim', t2: 'nao' })).toBe(false);
    expect(contraBlindagem({ t1: 'nao', t2: 'ausente' })).toBe(true);
    expect(votouBlindagem({ t1: 'ausente', t2: 'ausente' })).toBe(false);
    expect(contraBlindagem({ t1: 'ausente', t2: 'ausente' })).toBe(false);
    expect(votouBlindagem(null)).toBe(false);
    expect(contraBlindagem(null)).toBe(false);
  });
});
