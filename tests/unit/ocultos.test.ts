// Ocultos e busca por número (WP13/T063; FR-036, FR-037, FR-040, C-015), com candidatos fictícios.
import { describe, expect, it } from 'vitest';
import type { Candidato, EstadoFiltro } from '$lib/tipos';
import { contagens, numeroForaDaReeleicao, visiveis } from '$lib/regras/filtros';
import { buscaNumero, oculto, transparente } from '$lib/regras/ocultos';
import dados from '../fixtures/candidatos-ficticios.json';

const deputados = dados as Candidato[];

/** Candidato fictício que não é deputado. */
function naoDeputado(nome: string, numero: string, partido: string, cargos: Candidato['cargos_anteriores']): Candidato {
  return {
    ...deputados[0],
    id_camara: null,
    sq_candidato: `9${numero}`,
    nome_urna: nome,
    nome_civil: nome,
    numero_urna: numero,
    partido,
    partido_posse: null,
    condicao: null,
    mandatos: 0,
    url_camara: null,
    voto_6x1: null,
    votacoes_2026: null,
    reeleicao: false,
    cargos_anteriores: cargos
  };
}

const prefeita = naoDeputado('Rosa do Vale', '4021', 'PSD', [{ cargo: 'prefeita', lugar: 'Montes Claros', ano: 2020 }]);
const oculto1 = naoDeputado('Zé da Padaria', '1234', 'PT', []);
const oculto2 = naoDeputado('Nina Estrela', '1299', 'PT', []);
const todos = [...deputados, prefeita, oculto1, oculto2];
const SIGLAS = ['PL', 'PRTB'];
const inicio: EstadoFiltro = { universo: 'todos', busca: '', partido: null, mostrarOcultos: false, esconder: [] };
const nomes = (l: readonly Candidato[]) => l.map((c) => c.nome_urna);

describe('oculto', () => {
  it('nunca eleito e sem reeleição; quem tenta a reeleição nunca é oculto', () => {
    expect(oculto(oculto1)).toBe(true);
    expect(oculto(prefeita)).toBe(false);
    expect(deputados.some(oculto)).toBe(false);
    expect(oculto({ ...deputados[0], cargos_anteriores: [] })).toBe(false);
  });
});

describe('buscaNumero', () => {
  it('1 a 4 dígitos é número; o resto é nome', () => {
    expect(buscaNumero('1234')).toBe('1234');
    expect(buscaNumero('12')).toBe('12');
    expect(buscaNumero('12345')).toBeNull();
    expect(buscaNumero('ze 12')).toBeNull();
    expect(buscaNumero('')).toBeNull();
  });
});

describe('visiveis com ocultos (FR-036, FR-037)', () => {
  it('ao abrir, ocultos fora da lista e o resto dentro', () => {
    const r = visiveis(todos, inicio);
    expect(r).toHaveLength(deputados.length + 1);
    expect(nomes(r)).toContain('Rosa do Vale');
    expect(nomes(r)).not.toContain('Zé da Padaria');
  });

  it('botão ligado: todos, ninguém transparente', () => {
    const r = visiveis(todos, { ...inicio, mostrarOcultos: true });
    expect(r).toHaveLength(todos.length);
    expect(r.some((c) => transparente(c, true))).toBe(false);
  });

  it('número completo de um oculto: só ele, e transparente', () => {
    const r = visiveis(todos, { ...inicio, busca: '1234' });
    expect(nomes(r)).toEqual(['Zé da Padaria']);
    expect(transparente(r[0], false)).toBe(true);
  });

  it('número com espaços em volta também acha (busca normalizada)', () => {
    expect(nomes(visiveis(todos, { ...inicio, busca: ' 1234 ' }))).toEqual(['Zé da Padaria']);
  });

  it('número parcial ou nome não mostram oculto', () => {
    expect(nomes(visiveis(todos, { ...inicio, busca: '12' }))).not.toContain('Zé da Padaria');
    expect(visiveis(todos, { ...inicio, busca: 'padaria' })).toEqual([]);
  });

  it('número parcial acha os visíveis pelo começo do número', () => {
    const r = visiveis(todos, { ...inicio, busca: '40' });
    expect(nomes(r)).toContain('Rosa do Vale');
    expect(r.every((c) => c.numero_urna.startsWith('40'))).toBe(true);
  });

  it('o número completo respeita o filtro de partido', () => {
    expect(visiveis(todos, { ...inicio, busca: '1234', partido: 'PSD' })).toEqual([]);
  });
});

describe('contagens com ocultos (FR-040)', () => {
  it('ao abrir: total da base, à mostra e quantos ocultos', () => {
    const c = contagens(todos, SIGLAS, inicio);
    expect(c).toMatchObject({ total: todos.length, exibidos: deputados.length + 1, ocultos: 2, ocultosNaBusca: 2 });
  });

  it('busca parcial: diz quantos ocultos casam sem aparecer', () => {
    expect(contagens(todos, SIGLAS, { ...inicio, busca: '12' })).toMatchObject({ exibidos: 0, ocultosNaBusca: 2 });
    expect(contagens(todos, SIGLAS, { ...inicio, busca: 'padaria' })).toMatchObject({ exibidos: 0, ocultosNaBusca: 1 });
  });

  it('número completo: o achado não conta como oculto na busca', () => {
    expect(contagens(todos, SIGLAS, { ...inicio, busca: '1234' })).toMatchObject({ exibidos: 1, ocultosNaBusca: 0, escondidosPorMarca: 0 });
  });

  it('botão ligado: nenhum oculto na busca', () => {
    expect(contagens(todos, SIGLAS, { ...inicio, mostrarOcultos: true })).toMatchObject({ exibidos: todos.length, ocultos: 2, ocultosNaBusca: 0, escondidosPorMarca: 0 });
  });
});

describe('opção do topo: Reeleição ou Todos (WP17; FR-065, FR-067, FR-068)', () => {
  const reeleicao: EstadoFiltro = { ...inicio, universo: 'reeleicao' };

  it('"Reeleição" mostra só quem tenta a reeleição, na ordem da entrada', () => {
    expect(nomes(visiveis(todos, reeleicao))).toEqual(nomes(deputados));
    expect(visiveis(todos, { ...reeleicao, mostrarOcultos: true })).toHaveLength(deputados.length);
  });

  it('contagem da opção ativa: total e ocultos de "Reeleição"', () => {
    expect(contagens(todos, SIGLAS, reeleicao)).toMatchObject({ total: deputados.length, exibidos: deputados.length, ocultos: 0, ocultosNaBusca: 0 });
    expect(contagens(todos, SIGLAS, inicio).total).toBe(todos.length);
  });

  it('busca e partido valem sobre os da reeleição', () => {
    const p = deputados[0].partido;
    expect(visiveis(todos, { ...reeleicao, partido: p }).every((c) => c.reeleicao && c.partido === p)).toBe(true);
    expect(visiveis(todos, { ...reeleicao, busca: '4021' })).toHaveLength(0);
  });

  it('número completo de quem não tenta a reeleição: só em "Reeleição"', () => {
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '4021' })).toBe(true);
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '1234' })).toBe(true);
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '40' })).toBe(false);
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: deputados[0].numero_urna })).toBe(false);
    expect(numeroForaDaReeleicao(todos, { ...inicio, busca: '4021' })).toBe(false);
  });

  it('o aviso respeita partido e chaves de marca: o botão nunca leva a uma mesa vazia', () => {
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '4021', partido: 'PSD' })).toBe(true);
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '4021', partido: 'PT' })).toBe(false);
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '1234', partido: 'PT' })).toBe(true);
    const psdMarcado = { siglasMarcadas: ['PSD'] };
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '4021' }, psdMarcado)).toBe(true);
    expect(numeroForaDaReeleicao(todos, { ...reeleicao, busca: '4021', esconder: ['extrema-direita'] }, psdMarcado)).toBe(false);
  });
});
