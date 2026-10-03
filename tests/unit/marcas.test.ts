// Registro de marcas e "Esconder quem tem" (WP14/T067, T068; FR-050 a FR-053), com fixtures fictícias.
import { describe, expect, it } from 'vitest';
import type { Candidato, EstadoFiltro } from '$lib/tipos';
import { contarPorMarca, MARCAS, temAlguma, type Marca } from '$lib/marcas';
import { contagens, marcadoExtremaDireita, visiveis } from '$lib/regras/filtros';
import { marcaCrescimento } from '$lib/formatar/crescimento';
import { selo6x1 } from '$lib/formatar/selo6x1';
import { participacao } from '$lib/formatar/participacao';
import { votouBlindagem } from '$lib/formatar/blindagem';
import dados from '../fixtures/candidatos-ficticios.json';

const base = dados as Candidato[];
const ctx = { siglasMarcadas: ['PL', 'PRTB'] };
const inicio: EstadoFiltro = { busca: '', partido: null, mostrarOcultos: false, esconder: [] };
const marca = (id: string) => MARCAS.find((m) => m.id === id)!;

// Casos que a fixture pode não ter: um de cada, a partir do primeiro candidato.
const enfraqueceuEFaltou: Candidato = { ...base[0], sq_candidato: '1', partido: 'PSB', voto_6x1: { final: 'ausente', primeiro_turno: 'sim', emendas: [1] } };
const soFaltou: Candidato = { ...base[0], sq_candidato: '2', partido: 'PSB', voto_6x1: { final: 'ausente', primeiro_turno: 'ausente', emendas: [] } };
const votouPouco: Candidato = { ...base[0], sq_candidato: '3', partido: 'PSB', votacoes_2026: { votou: 3, total: 10 } };
const naoDeputado: Candidato = {
  ...base[0], sq_candidato: '4', partido: 'PSB', id_camara: null, url_camara: null, partido_posse: null, condicao: null, mandatos: 0,
  voto_6x1: null, votacoes_2026: null, reeleicao: false, patrimonio_2022: null, patrimonio_anterior: null
};
const todos = [...base, enfraqueceuEFaltou, soFaltou, votouPouco, naoDeputado];

describe('registro (FR-050, FR-051)', () => {
  it('seis marcas, na ordem das chaves, com rótulo sem adjetivo (C-021)', () => {
    expect(MARCAS.map((m) => m.id)).toEqual(['extrema-direita', 'patrimonio', 'enfraquecer-6x1', 'faltou-6x1', 'votou-pouco', 'blindagem']);
    expect(MARCAS.map((m) => m.rotulo)).toEqual([
      'Extrema direita',
      'Patrimônio multiplicado',
      'Apoiou enfraquecer o fim da 6x1',
      'Faltou na votação da 6x1',
      'Votou pouco em 2026',
      'Votou para dificultar processo contra deputado'
    ]);
  });

  it('cada marca segue a mesma regra que o cartão usa para desenhá-la', () => {
    for (const c of todos) {
      expect(marca('extrema-direita').tem(c, ctx), c.nome_urna).toBe(marcadoExtremaDireita(c, ctx.siglasMarcadas));
      expect(marca('patrimonio').tem(c, ctx), c.nome_urna).toBe(marcaCrescimento(c));
      const s = c.voto_6x1 && selo6x1(c.voto_6x1);
      expect(marca('enfraquecer-6x1').tem(c, ctx)).toBe(s?.situacao === 'enfraquecer');
      expect(marca('faltou-6x1').tem(c, ctx)).toBe(!!s && (s.situacao === 'faltou' || s.faltou));
      const p = participacao(c.votacoes_2026);
      expect(marca('votou-pouco').tem(c, ctx)).toBe(!p.sem && p.vermelho);
      expect(marca('blindagem').tem(c, ctx)).toBe(votouBlindagem(c.blindagem));
    }
  });

  it('Blindagem: Sim em qualquer turno marca; Não, falta ou fora do mandato, não', () => {
    const com = (t1: 'sim' | 'nao' | 'ausente' | null, t2: 'sim' | 'nao' | 'ausente' | null) => ({ ...base[0], blindagem: { t1, t2 } });
    expect(marca('blindagem').tem(com('sim', 'nao'), ctx)).toBe(true);
    expect(marca('blindagem').tem(com('ausente', 'sim'), ctx)).toBe(true);
    expect(marca('blindagem').tem(com('nao', 'nao'), ctx)).toBe(false);
    expect(marca('blindagem').tem(com('ausente', 'ausente'), ctx)).toBe(false);
    expect(marca('blindagem').tem(com(null, null), ctx)).toBe(false);
  });

  it('faltou: vale o selo "faltou" e a linha "e faltou" de quem apoiou enfraquecer', () => {
    expect(marca('faltou-6x1').tem(soFaltou, ctx)).toBe(true);
    expect(marca('faltou-6x1').tem(enfraqueceuEFaltou, ctx)).toBe(true);
    expect(marca('enfraquecer-6x1').tem(enfraqueceuEFaltou, ctx)).toBe(true);
    expect(marca('votou-pouco').tem(votouPouco, ctx)).toBe(true);
  });

  it('quem não tem o dado (null) não tem a marca', () => {
    for (const id of ['enfraquecer-6x1', 'faltou-6x1', 'votou-pouco', 'patrimonio', 'blindagem']) expect(marca(id).tem(naoDeputado, ctx), id).toBe(false);
  });

  it('marca nova no registro ganha chave e contagem sem mudar mais nada', () => {
    const nova: Marca = { id: 'teste', rotulo: 'Marca de teste', tem: (c) => c.partido === 'PSB' };
    const chaves = contarPorMarca(todos, ctx, [...MARCAS, nova]);
    expect(chaves.at(-1)).toEqual({ marca: nova, n: todos.filter((c) => c.partido === 'PSB').length });
    expect(temAlguma(enfraqueceuEFaltou, ['teste'], ctx, [...MARCAS, nova])).toBe(true);
  });
});

describe('esconder (FR-052, FR-053)', () => {
  it('sem chave ligada, nada muda', () => {
    expect(visiveis(todos, inicio, ctx)).toHaveLength(todos.length);
    expect(contagens(todos, ctx.siglasMarcadas, inicio).escondidosPorMarca).toBe(0);
  });

  it('uma chave esconde quem tem a marca, e o visor conta', () => {
    const r = visiveis(todos, { ...inicio, esconder: ['extrema-direita'] }, ctx);
    expect(r.some((c) => ctx.siglasMarcadas.includes(c.partido))).toBe(false);
    const n = todos.filter((c) => ctx.siglasMarcadas.includes(c.partido)).length;
    expect(n).toBeGreaterThan(0);
    expect(contagens(todos, ctx.siglasMarcadas, { ...inicio, esconder: ['extrema-direita'] }).escondidosPorMarca).toBe(n);
  });

  it('duas chaves: some quem tem qualquer uma das duas', () => {
    const ligadas = ['extrema-direita', 'votou-pouco'];
    const r = visiveis(todos, { ...inicio, esconder: ligadas }, ctx);
    const esperado = todos.filter((c) => !temAlguma(c, ligadas, ctx));
    expect(r.map((c) => c.sq_candidato).sort()).toEqual(esperado.map((c) => c.sq_candidato).sort());
    expect(r.map((c) => c.sq_candidato)).not.toContain(votouPouco.sq_candidato);
  });

  it('busca e partido continuam valendo junto; a contagem só pega quem as marcas tiraram', () => {
    const estado = { ...inicio, partido: 'PL', esconder: ['extrema-direita'] };
    expect(visiveis(todos, estado, ctx)).toEqual([]);
    expect(contagens(todos, ctx.siglasMarcadas, estado).escondidosPorMarca).toBe(todos.filter((c) => c.partido === 'PL').length);
  });
});
