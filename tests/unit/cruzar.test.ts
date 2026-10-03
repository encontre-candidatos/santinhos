// Regras de cruzamento Câmara × TSE, com dados fictícios.
import { describe, expect, it } from 'vitest';
import {
  contarMandatos,
  cruzar,
  dataBr,
  fundirPartidos,
  normalizarNome,
  partidoNaPosse,
  primeiroValor
} from '../../scripts/lib/cruzar.mjs';

const dep = (id: number, nomeCivil: string, dataNascimento: string, cpf: string | null = null) => ({
  id,
  nomeCivil,
  dataNascimento,
  cpf
});
const cand = (sq: string, nomeCivil: string, dataNascimento: string, situacao = 'DEFERIDO', cpf: string | null = null) => ({
  sq,
  nomeCivil,
  dataNascimento,
  situacao,
  cpf
});

describe('normalizarNome', () => {
  it('tira acento, caixa, pontuação e espaço repetido', () => {
    expect(normalizarNome('  JOSÉ  da Conceição-Júnior. ')).toBe('jose da conceicao junior');
  });
});

describe('primeiroValor e dataBr', () => {
  it('ignora os marcadores de vazio do TSE', () => {
    expect(primeiroValor('#NE', '#NULO', '', 'DEFERIDO')).toBe('DEFERIDO');
    expect(primeiroValor('#NE', null)).toBeNull();
  });
  it('converte dd/mm/aaaa', () => {
    expect(dataBr('24/11/1974')).toBe('1974-11-24');
    expect(dataBr('1974-11-24')).toBeNull();
  });
});

describe('cruzar', () => {
  it('casa por CPF mesmo com nome diferente', () => {
    const r = cruzar([dep(1, 'Fulano de Tal', '1970-01-01', '11111111111')], [
      cand('10', 'FULANO TAL', '1970-01-02', 'DEFERIDO', '11111111111')
    ]);
    expect(r.casados).toHaveLength(1);
    expect(r.casados[0].via).toBe('CPF');
  });

  it('casa por nome + nascimento com acento e caixa diferentes', () => {
    const r = cruzar([dep(2, 'João Antônio da Silva', '1980-05-05')], [cand('20', 'JOAO ANTONIO DA SILVA', '1980-05-05')]);
    expect(r.casados.map((c) => c.candidatura.sq)).toEqual(['20']);
    expect(r.casados[0].via).toBe('nome civil + nascimento');
  });

  it('renúncia vai para semCandidatura com o texto do TSE', () => {
    const r = cruzar([dep(3, 'Maria Souza', '1975-03-03', '33333333333')], [
      cand('30', 'MARIA SOUZA', '1975-03-03', 'RENÚNCIA', '33333333333')
    ]);
    expect(r.casados).toEqual([]);
    expect(r.semCandidatura).toEqual([{ deputado: expect.objectContaining({ id: 3 }), motivo: 'RENÚNCIA' }]);
  });

  it('indeferido com recurso fica em casados, com a situação como veio', () => {
    const situacao = 'INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO';
    const r = cruzar([dep(4, 'Ana Lima', '1990-09-09')], [cand('40', 'ANA LIMA', '1990-09-09', situacao)]);
    expect(r.casados).toHaveLength(1);
    expect(r.casados[0].candidatura.situacao).toBe(situacao);
  });

  it('homônimo com data diferente vira duvidoso', () => {
    const r = cruzar([dep(5, 'Pedro Alves', '1960-01-01')], [cand('50', 'PEDRO ALVES', '1961-02-02')]);
    expect(r.casados).toEqual([]);
    expect(r.duvidosos).toHaveLength(1);
    expect(r.duvidosos[0].opcoes.map((o) => o.sq)).toEqual(['50']);
  });

  it('CPF diferente dos dois lados não é duvidoso: é outra pessoa', () => {
    const r = cruzar([dep(6, 'Pedro Alves', '1960-01-01', '66666666666')], [
      cand('60', 'PEDRO ALVES', '1960-01-01', 'DEFERIDO', '77777777777')
    ]);
    expect(r.duvidosos).toEqual([]);
    expect(r.semCandidatura[0].motivo).toBe('não encontrado');
  });

  it('sem nada parecido: não encontrado', () => {
    const r = cruzar([dep(7, 'Carla Dias', '1970-07-07')], [cand('70', 'OUTRA PESSOA', '1980-08-08')]);
    expect(r.semCandidatura).toEqual([{ deputado: expect.objectContaining({ id: 7 }), motivo: 'não encontrado' }]);
  });

  it('com uma candidatura renunciada e outra ativa, casa com a ativa', () => {
    const r = cruzar([dep(8, 'Luiz Reis', '1965-06-06', '88888888888')], [
      cand('80', 'LUIZ REIS', '1965-06-06', 'RENÚNCIA', '88888888888'),
      cand('81', 'LUIZ REIS', '1965-06-06', 'DEFERIDO', '88888888888')
    ]);
    expect(r.casados.map((c) => c.candidatura.sq)).toEqual(['81']);
  });

  it('decisão manual resolve o duvidoso', () => {
    const deps = [dep(5, 'Pedro Alves', '1960-01-01'), dep(9, 'Rita Melo', '1971-01-01')];
    const cands = [cand('50', 'PEDRO ALVES', '1961-02-02'), cand('90', 'RITA M MELO', '1971-01-01')];
    const r = cruzar(deps, cands, [
      { id_camara: 5, sq_candidato: null, motivo: 'homônimo, não é o deputado', decidido_em: '2026-09-30' },
      { id_camara: 9, sq_candidato: '90', motivo: 'mesma pessoa', decidido_em: '2026-09-30' }
    ]);
    expect(r.duvidosos).toEqual([]);
    expect(r.semCandidatura[0].motivo).toBe('homônimo, não é o deputado');
    expect(r.casados[0].via).toBe('decisão manual');
  });
});

describe('histórico da Câmara', () => {
  const hist = [
    { idLegislatura: 57, dataHora: '2023-02-01T12:05', siglaPartido: 'AVANTE', situacao: 'Exercício' },
    { idLegislatura: 57, dataHora: '2023-02-01T00:00', siglaPartido: 'PSC', situacao: null },
    { idLegislatura: 57, dataHora: '2026-04-01T00:00', siglaPartido: 'PL', situacao: 'Exercício' },
    { idLegislatura: 56, dataHora: '2019-02-01T11:45', siglaPartido: 'PSC', situacao: 'Exercício' },
    { idLegislatura: 56, dataHora: '2023-02-01T00:00', siglaPartido: 'PSC', situacao: null },
    { idLegislatura: 50, dataHora: '2023-02-01T00:00', siglaPartido: 'PSC', situacao: null },
    { idLegislatura: 55, dataHora: '2015-02-01T00:00', siglaPartido: 'PSC', situacao: 'Suplência' }
  ];
  it('partido na posse é o registro mais antigo da legislatura', () => {
    expect(partidoNaPosse(hist, 57)).toBe('PSC');
  });
  it('mandatos: legislaturas com exercício, mais as antigas só com registro-resumo', () => {
    // 57 e 56 (exercício) + 50 (só resumo); 55 teve movimento sem exercício.
    expect(contarMandatos(hist)).toBe(3);
  });
});

describe('fundirPartidos', () => {
  const nomes = new Map([
    ['PL', 'PARTIDO LIBERAL'],
    ['PT', 'PARTIDO DOS TRABALHADORES'],
    ['PRTB', 'PARTIDO RENOVADOR TRABALHISTA BRASILEIRO']
  ]);
  it('primeira execução: PL e PRTB marcados, demais como não classificados', () => {
    const r = fundirPartidos(null, ['PT', 'PL'], nomes, '2026-10-01');
    expect(r.filter((p) => p.extrema_direita).map((p) => p.sigla)).toEqual(['PL', 'PRTB']);
    expect(r.find((p) => p.sigla === 'PT')).toMatchObject({ extrema_direita: false, motivo: 'não classificado', classificado_em: '2026-10-01' });
  });
  it('nunca altera classificação existente', () => {
    const existentes = [{ sigla: 'PT', nome: 'X', extrema_direita: true, classificado_em: '2026-01-01', motivo: 'teste' }];
    const r = fundirPartidos(existentes, ['PT'], nomes, '2026-10-01');
    expect(r).toEqual(existentes);
  });
});
