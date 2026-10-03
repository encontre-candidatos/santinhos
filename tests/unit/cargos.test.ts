// Cargos anteriores (WP13/T062): funções puras de scripts/lib/cargos-anteriores.mjs e da montagem
// de quem não é deputado, com dados fictícios.
import { describe, expect, it } from 'vitest';
import {
  cargoDaLinha,
  cargoNoGenero,
  conferenciaCargos,
  cpfValido,
  criarLigador,
  ehEleito,
  MARCADOR_MANUAL,
  ordenarCargos,
  tituloMunicipio
} from '../../scripts/lib/cargos-anteriores.mjs';
import { contarTodos, registroNaoDeputado } from '../../scripts/lib/todos-candidatos.mjs';

describe('cpfValido', () => {
  it('aceita 11 dígitos e recusa os marcadores de "sem CPF" do TSE', () => {
    expect(cpfValido('12345678901')).toBe('12345678901');
    expect(cpfValido('-4')).toBeNull();
    expect(cpfValido('#NULO')).toBeNull();
    expect(cpfValido('00000000000')).toBeNull();
    expect(cpfValido('')).toBeNull();
  });
});

describe('ehEleito', () => {
  it('as três formas de "eleito" e nada mais', () => {
    expect(['ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA'].every(ehEleito)).toBe(true);
    expect(['SUPLENTE', 'NÃO ELEITO', '#NULO#', '2º TURNO'].some(ehEleito)).toBe(false);
  });
});

describe('tituloMunicipio', () => {
  it('maiúscula por palavra, partículas em minúscula, hífen e apóstrofo', () => {
    expect(tituloMunicipio('MONTES CLAROS')).toBe('Montes Claros');
    expect(tituloMunicipio('SÃO JOÃO DEL-REI')).toBe('São João del-Rei');
    expect(tituloMunicipio("PINGO-D'ÁGUA")).toBe("Pingo-d'Água");
    expect(tituloMunicipio('CACHOEIRA DA PRATA')).toBe('Cachoeira da Prata');
    expect(tituloMunicipio('DIVISA ALEGRE')).toBe('Divisa Alegre');
  });
});

describe('cargoNoGenero e cargoDaLinha', () => {
  it('feminino quando o registro de 2026 diz FEMININO', () => {
    expect(cargoNoGenero('PREFEITO', 'FEMININO')).toBe('prefeita');
    expect(cargoNoGenero('VICE-PREFEITO', 'FEMININO')).toBe('vice-prefeita');
    expect(cargoNoGenero('DEPUTADO FEDERAL', 'MASCULINO')).toBe('deputado federal');
    expect(cargoNoGenero('1º SUPLENTE', 'MASCULINO')).toBe('1º suplente de senador');
  });
  it('lugar: município (com UF fora de MG) para cargo municipal, UF para os demais', () => {
    expect(cargoDaLinha({ DS_CARGO: 'PREFEITO', NM_UE: 'MONTES CLAROS', SG_UF: 'MG' }, 2020, 'MASCULINO')).toEqual({
      cargo: 'prefeito',
      lugar: 'Montes Claros',
      ano: 2020
    });
    expect(cargoDaLinha({ DS_CARGO: 'VEREADOR', NM_UE: 'SALVADOR', SG_UF: 'BA' }, 2016, 'FEMININO').lugar).toBe('Salvador/BA');
    expect(cargoDaLinha({ DS_CARGO: 'DEPUTADO ESTADUAL', NM_UE: 'MINAS GERAIS', SG_UF: 'MG' }, 2018, null).lugar).toBe('MG');
  });
});

describe('ordenarCargos', () => {
  it('tira o repetido do 2º turno e põe o mais recente primeiro', () => {
    const p = { cargo: 'prefeito', lugar: 'Ipatinga', ano: 2016 };
    const v = { cargo: 'vereador', lugar: 'Ipatinga', ano: 2008 };
    expect(ordenarCargos([v, p, { ...p }])).toEqual([p, v]);
  });
});

describe('criarLigador', () => {
  const cands = [
    { sq: '1', cpf: '11111111111', nomeCivil: 'Ana de Souza', dataNascimento: '1970-01-02' },
    { sq: '2', cpf: null, nomeCivil: 'José da Silva', dataNascimento: '1980-05-06' },
    { sq: '3', cpf: null, nomeCivil: 'JOSÉ DA SILVA', dataNascimento: '1980-05-06' },
    { sq: '4', cpf: null, nomeCivil: 'Maria Lúcia', dataNascimento: '1990-01-01' }
  ];
  const { ligar } = criarLigador(cands);

  it('linha com CPF liga só pelo CPF, mesmo com nome igual a outro candidato', () => {
    expect(ligar({ cpf: '11111111111', nome: 'qualquer', nascimento: null })).toEqual({ sq: '1', via: 'cpf' });
    expect(ligar({ cpf: '99999999999', nome: 'MARIA LUCIA', nascimento: '1990-01-01' })).toBeNull();
  });
  it('sem CPF, nome normalizado + nascimento quando só um casa', () => {
    expect(ligar({ cpf: null, nome: 'MARIA LUCIA', nascimento: '1990-01-01' })).toEqual({ sq: '4', via: 'nome+nascimento' });
    expect(ligar({ cpf: null, nome: 'MARIA LUCIA', nascimento: '1991-01-01' })).toBeNull();
  });
  it('dois candidatos com o mesmo nome e nascimento: sem ligação, marcado como homônimo', () => {
    expect(ligar({ cpf: null, nome: 'JOSE DA SILVA', nascimento: '1980-05-06' })).toEqual({ ambiguo: ['2', '3'] });
  });
});

describe('registroNaoDeputado e contarTodos', () => {
  const extra = {
    foto: null,
    instagram: null,
    url_divulgacand: 'https://exemplo/1/2026/MG',
    patrimonio_total: null,
    patrimonio_itens: 0,
    patrimonio_2022: null,
    patrimonio_anterior: null,
    cargos_anteriores: []
  };
  const cand = { sq: '9', nomeCivil: 'Fulana', nomeUrna: 'FULANA', numero: '1234', partido: 'PV', situacao: 'DEFERIDO', cpf: '12345678901' };

  it('campos da Câmara em null e nenhum CPF no registro (C-006)', () => {
    const r = registroNaoDeputado(cand, extra);
    expect(r).toMatchObject({ id_camara: null, url_camara: null, voto_6x1: null, votacoes_2026: null, reeleicao: false, mandatos: 0 });
    expect(JSON.stringify(r)).not.toContain('12345678901');
  });
  it('conta reeleição, já teve cargo e ocultos', () => {
    const k = { cargo: 'vereador', lugar: 'X', ano: 2020 };
    const lista = [
      { reeleicao: true, cargos_anteriores: [k] },
      { reeleicao: false, cargos_anteriores: [k] },
      { reeleicao: false, cargos_anteriores: [] },
      { reeleicao: false, cargos_anteriores: [] }
    ];
    expect(contarTodos(lista)).toEqual({ total: 4, reeleicao: 1, jaTeveCargo: 1, ocultos: 2, visiveis: 2 });
  });
});

describe('conferenciaCargos', () => {
  const todos = [
    { sq_candidato: '1', nome_urna: 'A', numero_urna: '1111', reeleicao: false, cargos_anteriores: [], url_divulgacand: 'u1' },
    { sq_candidato: '2', nome_urna: 'B', numero_urna: '2222', reeleicao: false, cargos_anteriores: [{ cargo: 'prefeita', lugar: 'Y', ano: 2020 }], url_divulgacand: 'u2' }
  ];
  const cargos = { cobertura: [{ ano: 2020, linhas: 10, comCpf: 10, eleitos: 2, porCpf: 1, porNome: 0, ambiguos: 0 }], viasPorSq: new Map([['2', 'cpf']]), ambiguos: [] };

  it('preserva o que está abaixo do marcador', () => {
    const anterior = `# velho\n${MARCADOR_MANUAL}\n\nConferido à mão em 03/10/2026: 20 de 20.\n`;
    const novo = conferenciaCargos(todos, cargos, anterior, '2026-10-03');
    expect(novo).toContain('| Nunca foram eleitos (ocultos por padrão) | 1 |');
    expect(novo.endsWith('Conferido à mão em 03/10/2026: 20 de 20.\n')).toBe(true);
    expect(novo).not.toContain('# velho');
  });
});
