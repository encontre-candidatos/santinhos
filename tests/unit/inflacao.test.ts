// Correção pelo IPCA do patrimônio anterior (FR-062 a FR-064, C-031, SC-031; WP16/T077).
// Fatores contra a tabela do planejamento (SIDRA 1737, conferida em 03/10/2026); limiar sobre o
// valor corrigido; e a escolha da declaração mais recente, sem rede nem disco.
import AdmZip from 'adm-zip';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { registrarAnterior } from '../../scripts/lib/cargos-anteriores.mjs';
import { fatorDoAno, marcado, somarZip, valorDoAno } from '../../scripts/lib/patrimonio-anterior.mjs';
import ipca from '../../scripts/ipca-agosto.json';
import { anoComparacao, crescimentoPatrimonio, marcaCrescimento, textoMultiplicador } from '../../src/lib/formatar/crescimento';
import { corrigir, fatorIpca, valorCorrigido } from '../../src/lib/formatar/inflacao';
import dados from '../../src/lib/dados/candidatos.json';
import type { Candidato } from '../../src/lib/tipos';

/** Tabela do planejamento (WP16): número-índice de agosto e fator até agosto de 2026. */
const TABELA: Array<[number, number, number]> = [
  [2006, 2580.57, 2.958],
  [2010, 3112.29, 2.4526],
  [2014, 3968.62, 1.9234],
  [2018, 5056.56, 1.5096],
  [2022, 6388.87, 1.1948],
  [2026, 7633.23, 1]
];
const AGO_2026 = 7633.23;
const f = (ano: number) => fatorDoAno(ipca.indices, ano);
const c = (valor: number | null, total: number | null, ano = 2022) => ({
  patrimonio_anterior: valor === null ? null : { ano, valor, fator_ipca: f(ano) },
  patrimonio_total: total
});

describe('fatores do IPCA de agosto', () => {
  it.each(TABELA)('%i: índice %f, fator %f', (ano, indice, fator) => {
    expect(ipca.indices[String(ano) as keyof typeof ipca.indices]).toBe(indice);
    expect(fatorIpca(indice, AGO_2026)).toBeCloseTo(fator, 4);
    expect(f(ano)).toBeCloseTo(fator, 4);
  });

  it('todos os agostos de 2006 a 2026, e todo fator ≥ 1', () => {
    for (let ano = 2006; ano <= 2026; ano++) expect(f(ano), String(ano)).toBeGreaterThanOrEqual(1);
    expect(ipca.consultado_em).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('índice ausente ou inválido é erro, não fator 1', () => {
    expect(() => fatorDoAno(ipca.indices, 2004)).toThrow(/2004/);
    expect(() => fatorIpca(0, AGO_2026)).toThrow();
  });
});

describe('corrigir', () => {
  it('Cenário 13: R$ 1.196.660 de 2022 valem R$ 1.429.733 em 2026', () => {
    expect(Math.round(corrigir(1_196_660, f(2022)))).toBe(1_429_733);
  });
  it('centavos inteiros', () => expect(corrigir(100, 1.23456)).toBe(123.46));
  it('sem declaração anterior: null', () => expect(valorCorrigido(null)).toBeNull());
});

describe('regra do carimbo sobre o valor corrigido (FR-063)', () => {
  it('Cenário 13: 2,07× nominal vira 1,73× corrigido e perde o carimbo', () => {
    const x = c(1_196_660, 2_475_900);
    expect(2_475_900 / 1_196_660).toBeCloseTo(2.07, 2);
    expect(crescimentoPatrimonio(x)).toBeCloseTo(1.73, 2);
    expect(marcaCrescimento(x)).toBe(false);
  });

  // Limiar exato: total = razão × valor corrigido, com aumento folgado acima de meio milhão.
  const antigo = 1_000_000;
  const corrigido18 = corrigir(antigo, f(2018));
  it.each([
    ['1,99 corrigido: sem carimbo', 1.99, false],
    ['2,00 corrigido: com carimbo', 2.0, true]
  ])('%s', (_, r, marca) => {
    const x = c(antigo, Math.round(r * corrigido18 * 100) / 100, 2018);
    expect(crescimentoPatrimonio(x)).toBeCloseTo(r, 6);
    expect(marcaCrescimento(x)).toBe(marca);
  });

  it('2,00 nominal fica abaixo de 2 corrigido (a inflação sozinha não marca)', () => {
    expect(marcaCrescimento(c(antigo, 2 * antigo, 2018))).toBe(false);
    expect(crescimentoPatrimonio(c(antigo, 2 * antigo, 2018))).toBeCloseTo(2 / f(2018), 6);
  });

  it('meio milhão a mais sobre o corrigido: R$ 499.999 não, R$ 500.000 sim', () => {
    const v = 300_000;
    const k = corrigir(v, f(2022));
    expect(marcaCrescimento(c(v, k + 499_999))).toBe(false);
    expect(marcaCrescimento(c(v, k + 500_000))).toBe(true);
  });

  it('o número do carimbo é a razão corrigida, com o mesmo arredondamento do WP09', () => {
    expect(textoMultiplicador(crescimentoPatrimonio(c(100_000, 320_000, 2018))!)).toBe('2,1×');
  });

  it('o ano do carimbo é o da declaração; sem declaração, sem ano nem carimbo', () => {
    expect(anoComparacao(c(1, 2, 2018))).toBe(2018);
    expect(anoComparacao(c(null, 2_000_000))).toBeNull();
    expect(marcaCrescimento(c(null, 2_000_000))).toBe(false);
    expect(marcaCrescimento(c(0, 2_000_000, 2024))).toBe(false);
  });

  it('a regra do script de base (scripts/) é a mesma do app', () => {
    for (const x of [c(1_196_660, 2_475_900), c(antigo, 2 * corrigido18, 2018), c(300_000, 900_000, 2024), c(0, 1e7)])
      expect(marcado(x)).toBe(marcaCrescimento(x));
  });
});

describe('declaração mais recente antes de 2026 (T075)', () => {
  it('um ano mais recente substitui; o mesmo ano junta os SQ; um mais antigo não entra', () => {
    const m = new Map();
    registrarAnterior(m, 'a', 2018, '1', 'MG');
    registrarAnterior(m, 'a', 2022, '2', 'MG');
    registrarAnterior(m, 'a', 2022, '3', 'MG');
    registrarAnterior(m, 'a', 2022, '2', 'MG');
    registrarAnterior(m, 'a', 2020, '4', 'MG');
    expect(m.get('a')).toEqual({ ano: 2022, uf: 'MG', sqs: ['2', '3'] });
  });

  it('valor do ano: o maior total entre os SQ; sem bens, 0', () => {
    expect(valorDoAno(['1', '2'], new Map([['1', 10_000], ['2', 2_500_050]]))).toBe(25_000.5);
    expect(valorDoAno(['9'], new Map())).toBe(0);
  });

  it('soma em centavos em todas as UFs, sem o BRASIL, com descrição de várias linhas', async () => {
    const cab = '"SQ_CANDIDATO";"DS_BEM_CANDIDATO";"VR_BEM_CANDIDATO"';
    const zip = new AdmZip();
    const csv = (linhas: string[]) => Buffer.from([cab, ...linhas].join('\r\n') + '\r\n', 'latin1');
    zip.addFile('bem_candidato_2024_MG.csv', csv(['"7";"CASA; COM QUINTAL\nEM CONTAGEM";"100000,10"', '"7";"CARRO";"0,20"', '"8";"X";"5,00"']));
    zip.addFile('bem_candidato_2024_SP.csv', csv(['"7";"TERRENO";"1.000,00"']));
    zip.addFile('bem_candidato_2024_BRASIL.csv', csv(['"7";"CASA";"100000,10"']));
    const caminho = join(mkdtempSync(join(tmpdir(), 'bens-')), 'bem_candidato_2024.zip');
    writeFileSync(caminho, zip.toBuffer());
    const soma = await somarZip(caminho, new Set(['7']));
    expect(soma).toEqual(new Map([['7', 10_100_030]]));
  });
});

describe('base real (SC-031)', () => {
  const candidatos = dados as Candidato[];
  const comCarimbo = candidatos.filter(marcaCrescimento);

  it('todo marcado tem razão corrigida ≥ 2 e fator igual ao da tabela do ano', () => {
    expect(comCarimbo.length).toBeGreaterThan(0);
    for (const x of comCarimbo) {
      expect(crescimentoPatrimonio(x)!, x.nome_urna).toBeGreaterThanOrEqual(2);
      expect(x.patrimonio_anterior!.fator_ipca, x.nome_urna).toBeCloseTo(f(x.patrimonio_anterior!.ano), 10);
    }
  });

  it('declaração anterior só de 2006 a 2024', () => {
    for (const x of candidatos)
      if (x.patrimonio_anterior) expect(x.patrimonio_anterior.ano, x.nome_urna).toBeGreaterThanOrEqual(2006);
  });
});
