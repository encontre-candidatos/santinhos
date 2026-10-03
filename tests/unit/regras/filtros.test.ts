import { describe, expect, it } from 'vitest';
import type { Candidato, EstadoFiltro } from '$lib/tipos';
import { contagens, marcadoExtremaDireita, ordenar, visiveis } from '$lib/regras/filtros';
import dados from '../../fixtures/candidatos-ficticios.json';

const candidatos = dados as Candidato[];
const SIGLAS = ['PL', 'PRTB'] as const;
const base: EstadoFiltro = { busca: '', partido: null, mostrarOcultos: false, esconder: [] };
const nomes = (l: readonly Candidato[]) => l.map((c) => c.nome_urna);

describe('fixture', () => {
  it('cobre os casos exigidos', () => {
    expect(candidatos.length).toBeGreaterThanOrEqual(8);
    for (const p of ['PL', 'PRTB', 'PT', 'PSB', 'PSD']) {
      expect(candidatos.some((c) => c.partido === p)).toBe(true);
    }
    expect(candidatos.some((c) => c.condicao === 'suplente_em_exercicio')).toBe(true);
    expect(candidatos.some((c) => c.partido !== c.partido_posse)).toBe(true);
  });
});

describe('marcadoExtremaDireita', () => {
  it('usa o partido de registro, não o da posse', () => {
    const carla = candidatos.find((c) => c.nome_urna === 'Carla Ribeirão')!;
    expect(carla.partido_posse).toBe('PL');
    expect(marcadoExtremaDireita(carla, SIGLAS)).toBe(false);
  });

  it('marca PL e PRTB e nenhum outro', () => {
    for (const c of candidatos) {
      expect(marcadoExtremaDireita(c, SIGLAS), c.nome_urna).toBe(c.partido === 'PL' || c.partido === 'PRTB');
    }
  });

  it('lista vazia não marca ninguém', () => {
    expect(candidatos.some((c) => marcadoExtremaDireita(c, []))).toBe(false);
  });
});

describe('visiveis', () => {
  it('estado inicial mantém todos, inclusive PL e PRTB (FR-005, 02/10/2026)', () => {
    const r = visiveis(candidatos, base);
    expect(r).toHaveLength(candidatos.length);
    expect(r.filter((c) => c.partido === 'PL' || c.partido === 'PRTB')).toHaveLength(3);
  });

  it('busca "tiao" acha "Tião"', () => {
    const r = visiveis(candidatos, { ...base, busca: 'tiao' });
    expect(nomes(r)).toEqual(['Tião do Cerrado']);
  });

  it('busca também pelo nome civil', () => {
    const r = visiveis(candidatos, { ...base, busca: 'INVENTADA' });
    expect(nomes(r)).toEqual(['Heloísa Paixão']);
  });

  it('partido e busca combinados', () => {
    const r = visiveis(candidatos, { ...base, partido: 'PT', busca: 'lagoa' });
    expect(nomes(r)).toEqual(['Diego Lagoa']);
    expect(visiveis(candidatos, { ...base, partido: 'PSB', busca: 'lagoa' })).toEqual([]);
  });

  it('PL escolhido mostra os candidatos do PL', () => {
    expect(visiveis(candidatos, { ...base, partido: 'PL' }).every((c) => c.partido === 'PL')).toBe(true);
    expect(visiveis(candidatos, { ...base, partido: 'PL' })).toHaveLength(2);
  });

  it('não muta a entrada', () => {
    const copia = [...candidatos];
    visiveis(candidatos, base);
    expect(candidatos).toEqual(copia);
  });
});

describe('visiveis preserva a ordem da entrada (FR-060)', () => {
  it('filtrar não reordena: a mesa sorteada continua sorteada', () => {
    const invertida = [...candidatos].reverse();
    expect(nomes(visiveis(invertida, base))).toEqual(nomes(invertida));
    const doPartido = invertida.filter((c) => c.partido === 'PSD');
    expect(nomes(visiveis(invertida, { ...base, partido: 'PSD' }))).toEqual(nomes(doPartido));
  });
});

describe('ordenar', () => {
  it('nome em ordem pt-BR, acento não empurra para o fim', () => {
    expect(nomes(ordenar(candidatos))).toEqual([
      'Álvaro Serrano',
      'Bruno Vereda',
      'Carla Ribeirão',
      'Diego Lagoa',
      'Élida Montes',
      'Fábio Chapada',
      'Heloísa Paixão',
      'Tião do Cerrado',
      'Zuleica Brejo'
    ]);
  });

  it('não muta a entrada', () => {
    const entrada = Object.freeze([...candidatos]);
    const antes = nomes(entrada);
    const r = ordenar(entrada);
    expect(r).not.toBe(entrada);
    expect(nomes(entrada)).toEqual(antes);
  });
});

describe('contagens', () => {
  it('estado inicial: todos exibidos e os marcados contados', () => {
    expect(contagens(candidatos, SIGLAS, base)).toEqual({ total: 9, exibidos: 9, marcados: 3, ocultos: 0, ocultosNaBusca: 0, escondidosPorMarca: 0 });
  });

  it('com busca ativa conta só os marcados dentro da busca', () => {
    expect(contagens(candidatos, SIGLAS, { ...base, busca: 'tiao' })).toEqual({
      total: 9,
      exibidos: 1,
      marcados: 1,
      ocultos: 0,
      ocultosNaBusca: 0,
      escondidosPorMarca: 0
    });
    expect(contagens(candidatos, SIGLAS, { ...base, busca: 'lagoa' })).toEqual({
      total: 9,
      exibidos: 1,
      marcados: 0,
      ocultos: 0,
      ocultosNaBusca: 0,
      escondidosPorMarca: 0
    });
  });

  it('PL escolhido: todos os exibidos marcados', () => {
    expect(contagens(candidatos, SIGLAS, { ...base, partido: 'PL' })).toEqual({
      total: 9,
      exibidos: 2,
      marcados: 2,
      ocultos: 0,
      ocultosNaBusca: 0,
      escondidosPorMarca: 0
    });
  });

  it('lista de siglas vazia: ninguém marcado', () => {
    expect(contagens(candidatos, [], base)).toEqual({ total: 9, exibidos: 9, marcados: 0, ocultos: 0, ocultosNaBusca: 0, escondidosPorMarca: 0 });
  });
});

describe('desempenho (NFR-002)', () => {
  it('80 candidatos, 1000 chamadas de visiveis em < 200 ms', () => {
    const muitos: Candidato[] = Array.from({ length: 80 }, (_, i) => {
      const m = candidatos[i % candidatos.length];
      return { ...m, id_camara: 800000 + i, nome_urna: `${m.nome_urna} ${i}` };
    });
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      visiveis(muitos, {
        ...base,
        busca: i % 2 ? 'ao' : ''
      });
    }
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
