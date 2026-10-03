// Participação no mandato anterior de ex-deputado federal (WP18, T081 a T083; FR-070 a FR-074).
import { describe, expect, it } from 'vitest';
import {
  fraseParticipacao,
  fraseParticipacaoSr,
  participacaoAnterior,
  rotuloParticipacao
} from '../../src/lib/formatar/participacao';
import {
  coletarMandatoAnterior,
  conferenciaMandatoAnterior,
  contarNoMandato,
  intervalosEmExercicio,
  ligarDeputado,
  lerPaginaVotacoes,
  MARCADOR_MANUAL_ANTERIOR,
  ultimoMandatoFederal
} from '../../scripts/lib/votacoes-mandato-anterior.mjs';

const fed = (ano: number, lugar = 'MG', cargo = 'deputado federal') => ({ cargo, lugar, ano });

describe('ultimoMandatoFederal (FR-070)', () => {
  it('vale o mais recente, com período e legislatura', () => {
    expect(ultimoMandatoFederal([fed(2018), fed(2014), fed(2010), { cargo: 'prefeito', lugar: 'Malacacheta', ano: 2000 }])).toEqual({
      ano: 2018, uf: 'MG', de: 2019, ate: 2022, legislatura: 56
    });
    expect(ultimoMandatoFederal([fed(2014, 'RJ'), fed(2002, 'RJ')])).toMatchObject({ uf: 'RJ', de: 2015, ate: 2018, legislatura: 55 });
    expect(ultimoMandatoFederal([{ cargo: 'vereador', lugar: 'Belo Horizonte', ano: 2012 }, fed(2002)])).toMatchObject({ de: 2003, ate: 2006, legislatura: 52 });
  });

  it('deputada federal conta; vereador, prefeito e deputado estadual não', () => {
    expect(ultimoMandatoFederal([fed(2018, 'MG', 'deputada federal')])).toMatchObject({ de: 2019 });
    expect(ultimoMandatoFederal([{ cargo: 'vereador', lugar: 'Juiz de Fora', ano: 2020 }, { cargo: 'deputado estadual', lugar: 'MG', ano: 2018 }])).toBeNull();
    expect(ultimoMandatoFederal([])).toBeNull();
  });
});

describe('ligarDeputado (FR-072)', () => {
  const deps = [
    { id: 1, cpf: '11111111111', nomeCivil: 'VILSON LUIZ DA SILVA', dataNascimento: '1957-05-01' },
    { id: 2, cpf: null, nomeCivil: 'José Antônio Souza', dataNascimento: '1960-01-02' },
    { id: 3, cpf: null, nomeCivil: 'JOAO DA SILVA', dataNascimento: '1970-03-04' },
    { id: 4, cpf: null, nomeCivil: 'João da Silva', dataNascimento: '1970-03-04' },
    { id: 5, cpf: '55555555555', nomeCivil: 'MARIA SOUZA', dataNascimento: '1980-05-06' }
  ];

  it('pelo CPF', () => {
    expect(ligarDeputado({ cpf: '11111111111', nomeCivil: 'outro nome', dataNascimento: null }, deps)).toEqual({ id: 1, via: 'cpf' });
  });

  it('sem CPF: nome civil normalizado + nascimento', () => {
    expect(ligarDeputado({ cpf: null, nomeCivil: 'JOSE ANTONIO SOUZA', dataNascimento: '1960-01-02' }, deps)).toEqual({ id: 2, via: 'nome+nascimento' });
    // CPF do 2026 que não está na Câmara: cai para nome + nascimento entre quem não tem CPF.
    expect(ligarDeputado({ cpf: '99999999999', nomeCivil: 'José Antônio Souza', dataNascimento: '1960-01-02' }, deps)).toEqual({ id: 2, via: 'nome+nascimento' });
  });

  it('CPF diferente desmente o nome', () => {
    expect(ligarDeputado({ cpf: '99999999999', nomeCivil: 'MARIA SOUZA', dataNascimento: '1980-05-06' }, deps)).toEqual({ motivo: 'nenhum deputado da legislatura casa' });
  });

  it('sem casamento e com casamento duplo: sem ligação', () => {
    expect(ligarDeputado({ cpf: null, nomeCivil: 'Fulano', dataNascimento: '1950-01-01' }, deps)).toEqual({ motivo: 'nenhum deputado da legislatura casa' });
    expect(ligarDeputado({ cpf: null, nomeCivil: 'João da Silva', dataNascimento: '1970-03-04' }, deps)).toEqual({ motivo: 'nome e nascimento casam 2 deputados' });
    expect(ligarDeputado({ cpf: null, nomeCivil: 'João da Silva', dataNascimento: null }, deps)).toMatchObject({ motivo: expect.stringMatching(/nascimento/) });
  });
});

describe('intervalosEmExercicio', () => {
  it('posse até o fim da legislatura (Vilson da Fetaemg, 56ª)', () => {
    const hist = [
      { idLegislatura: 56, dataHora: '2019-02-01T11:45', situacao: 'Exercício' },
      { idLegislatura: 56, dataHora: '2023-01-31T23:59', situacao: 'FIM_MANDATO' },
      { idLegislatura: 56, dataHora: '2023-02-01T00:00', situacao: null }
    ];
    expect(intervalosEmExercicio(hist, 56)).toEqual([['2019-02-01', '2023-01-31']]);
  });

  it('licenças abrem buracos; alteração de partido não (Herculano, 52ª)', () => {
    const hist = [
      { idLegislatura: 52, dataHora: '2003-02-01T00:00', situacao: 'Exercício' },
      { idLegislatura: 52, dataHora: '2003-03-11T00:00', situacao: 'Licença' },
      { idLegislatura: 52, dataHora: '2003-03-21T00:00', situacao: 'Exercício' },
      { idLegislatura: 52, dataHora: '2003-06-02T00:00', situacao: 'Exercício' },
      { idLegislatura: 52, dataHora: '2004-02-16T00:00', situacao: 'Licença' },
      { idLegislatura: 52, dataHora: '2004-11-18T00:00', situacao: 'Exercício' },
      { idLegislatura: 52, dataHora: '2007-01-31T00:00', situacao: 'FIM_MANDATO' },
      { idLegislatura: 51, dataHora: '2023-02-01T00:00', situacao: null }
    ];
    expect(intervalosEmExercicio(hist, 52)).toEqual([
      ['2003-02-01', '2003-03-11'],
      ['2003-03-21', '2004-02-16'],
      ['2004-11-18', '2007-01-31']
    ]);
  });

  it('sem saída registrada: até 31/01 do quinto ano; outra legislatura não entra', () => {
    expect(intervalosEmExercicio([{ idLegislatura: 55, dataHora: '2016-05-12T10:00', situacao: 'Exercício' }], 55)).toEqual([['2016-05-12', '2019-02-01']]);
    expect(intervalosEmExercicio([{ idLegislatura: 54, dataHora: '2011-02-01T10:00', situacao: 'Exercício' }], 55)).toEqual([]);
  });
});

describe('contagem só dentro dos intervalos de exercício (FR-071)', () => {
  const nominais = [
    { id: 'a', data: '2003-02-10', votantes: new Set([7]) },
    { id: 'b', data: '2003-03-12', votantes: new Set<number>() }, // licença: fora
    { id: 'c', data: '2003-03-15', votantes: new Set([7]) }, // voto em licença: fora da conta
    { id: 'd', data: '2003-04-01', votantes: new Set<number>() },
    { id: 'e', data: '2003-04-02', votantes: new Set([7]) }
  ];
  const ints = new Map<number, Array<[string, string]>>([[7, [['2003-02-01', '2003-03-11'], ['2003-03-21', '2007-01-31']]]]);

  it('total = nominais nas datas em exercício; votou = com registro', () => {
    expect(contarNoMandato(nominais, ints).get(7)).toEqual({ votou: 2, total: 3 });
  });

  it('nenhuma nominal em exercício → null', () => {
    expect(contarNoMandato(nominais, new Map<number, Array<[string, string]>>([[7, [['2010-01-01', '2011-01-01']]]])).get(7)).toBeNull();
  });
});

/** Página do portal no formato de 03/10/2026, reduzida: sessão (âncora do evento) e tabela. */
const sessao = (ev: number, data: string, linhas: Array<[string, string]>) => `
  <div><a href="https://www.camara.leg.br/evento-legislativo/${ev}"> ${data} - SESS&Atilde;O ORDIN&Aacute;RIA N&ordm; 006  </a></div>
  <table class="g-table mb-4"><tbody class="g-table__body">
  ${linhas.map(([o, v], i) => `<tr class="g-table__row"><td class="g-table__cell"><a href="#">${o}</a></td><td class="g-table__cell">${v}</td>${i === 0 ? '<td rowspan="2">Presente</td>' : ''}</tr>`).join('\n')}
  </tbody></table>`;
const pagina = (ano: number, corpo: string) =>
  `<html><body><h1>LEONARDO MATTOS</h1><h2>Votações Nominais em Plenário - ${ano}</h2>${corpo || '<p>Nenhum resultado encontrado para o ano selecionado.</p>'}</body></html>`;

describe('lerPaginaVotacoes (portal da Câmara)', () => {
  it('uma linha por votação, com a data da sessão; "---" = não votou', () => {
    const html =
      pagina(2003, sessao(3292, '26/02/2003', [['MPV Nº 80/2002 - REQUERIMENTO DE ADIAMENTO', '---'], ['MPV N&#xBA; 135/2003 - ADIAMENTO', 'Não']]) +
        sessao(3300, '12/03/2003', [['PL 1/2003', 'Obstrução'], ['PL 2/2003', 'Secreto']]));
    expect(lerPaginaVotacoes(html)).toEqual([
      { data: '2003-02-26', evento: '3292', descricao: 'MPV Nº 80/2002 - REQUERIMENTO DE ADIAMENTO', voto: null },
      { data: '2003-02-26', evento: '3292', descricao: 'MPV Nº 135/2003 - ADIAMENTO', voto: 'Não' },
      { data: '2003-03-12', evento: '3300', descricao: 'PL 1/2003', voto: 'Obstrução' },
      { data: '2003-03-12', evento: '3300', descricao: 'PL 2/2003', voto: 'Secreto' }
    ]);
  });

  it('ano vazio é lista vazia; página sem a lista e sem o aviso derruba a coleta', () => {
    expect(lerPaginaVotacoes(pagina(2005, ''))).toEqual([]);
    expect(() => lerPaginaVotacoes('<html>Página não encontrada</html>')).toThrow(/título/);
    expect(() => lerPaginaVotacoes('<h2>Votações Nominais em Plenário - 2005</h2><div>outro layout</div>')).toThrow(/aviso de ano vazio/);
  });
});

describe('coletarMandatoAnterior (rede falsa)', () => {
  const API = 'https://api';
  const json: Record<string, unknown> = {
    'lista-56-MG-1.json': { dados: [{ id: 10 }, { id: 11 }], links: [] },
    'lista-52-MG-1.json': { dados: [{ id: 30 }], links: [] },
    '10.json': { dados: { id: 10, cpf: '12345678901', nomeCivil: 'VILSON LUIZ DA SILVA', dataNascimento: '1957-05-01' } },
    '11.json': { dados: { id: 11, cpf: '', nomeCivil: 'OUTRO', dataNascimento: '1950-01-01' } },
    '30.json': { dados: { id: 30, cpf: '', nomeCivil: 'HERCULANO ANGHINETTI', dataNascimento: '1960-04-25' } },
    '10-historico.json': { dados: [
      { idLegislatura: 56, dataHora: '2019-02-01T11:45', situacao: 'Exercício' },
      { idLegislatura: 56, dataHora: '2023-01-31T23:59', situacao: 'FIM_MANDATO' }
    ] },
    '30-historico.json': { dados: [
      { idLegislatura: 52, dataHora: '2003-02-01T00:00', situacao: 'Exercício' },
      { idLegislatura: 52, dataHora: '2003-03-11T00:00', situacao: 'Licença' },
      { idLegislatura: 52, dataHora: '2007-01-31T00:00', situacao: 'FIM_MANDATO' }
    ] }
  };
  const paginas: Record<string, string> = {
    'pagina-10-2019.html': pagina(2019, sessao(1, '01/03/2019', [['A', 'Sim'], ['B', '---']])),
    'pagina-10-2021.html': pagina(2021, sessao(2, '10/05/2021', [['C', 'Não']])),
    // Herculano: a página lista também a votação do dia de licença, que fica fora da conta.
    'pagina-30-2003.html': pagina(2003, sessao(3, '20/02/2003', [['D', '---']]) + sessao(4, '12/03/2003', [['E', '---']]))
  };
  const pedidas: string[] = [];
  const rede = {
    mapLimitado: <T, R>(itens: T[], _l: number, fn: (i: T) => Promise<R>) => Promise.all(itens.map(fn)),
    json: async (_url: string, arquivo: string) => {
      if (!(arquivo in json)) throw new Error(`sem ${arquivo}`);
      return json[arquivo];
    },
    html: async (url: string, arquivo: string) => {
      pedidas.push(url);
      return paginas[arquivo] ?? pagina(Number(arquivo.slice(-9, -5)), '');
    }
  };
  const candidatos = [
    { sq: 'A', nome_urna: 'VILSON DA FETAEMG', cpf: '12345678901', nomeCivil: 'VILSON LUIZ DA SILVA', dataNascimento: '1957-05-01', cargos_anteriores: [fed(2018)] },
    { sq: 'B', nome_urna: 'HERCULANO', cpf: '00011122233', nomeCivil: 'HERCULANO ANGHINETTI', dataNascimento: '1960-04-25', cargos_anteriores: [fed(2002)] },
    { sq: 'C', nome_urna: 'SEM LIGAÇÃO', cpf: null, nomeCivil: 'NINGUÉM', dataNascimento: '1900-01-01', cargos_anteriores: [fed(2018)] },
    { sq: 'D', nome_urna: 'EX-VEREADOR', cpf: null, nomeCivil: 'X', dataNascimento: null, cargos_anteriores: [{ cargo: 'vereador', lugar: 'Uberaba', ano: 2016 }] }
  ];

  it('conta quem casa, marca sem dados quem não tem ligação, ignora quem nunca foi deputado federal', async () => {
    const r = await coletarMandatoAnterior(rede, { api: API, candidatos });
    expect(r.porSq.get('A')).toEqual({ votou: 2, total: 3, de: 2019, ate: 2022 });
    expect(r.porSq.get('B')).toEqual({ votou: 0, total: 1, de: 2003, ate: 2006 });
    expect(r.porSq.get('C')).toEqual({ sem_dados: true, de: 2019, ate: 2022 });
    expect(r.porSq.has('D')).toBe(false);
    expect(r.linhas.find((l) => l.sq === 'C')?.motivo).toMatch(/sem ligação/);
    expect(r.linhas.find((l) => l.sq === 'B')?.via).toBe('nome+nascimento');
    expect(r.linhas.find((l) => l.sq === 'B')?.porAno[0]).toEqual({ ano: 2003, listadas: 2, emExercicio: 1, votou: 0 });
    expect(pedidas).toContain('https://www.camara.leg.br/deputados/10/votacoes-nominais-plenario/2022');
    expect(pedidas.filter((u) => u.includes('/10/'))).toHaveLength(4);

    const doc = conferenciaMandatoAnterior(r, '', '2026-10-03');
    expect(doc).toContain('| VILSON DA FETAEMG | A | 2019–2022 | MG | 10 | cpf | 01/02/2019 a 31/01/2023 | 2 | 3 | 7 | |');
    expect(doc).toContain('| HERCULANO | 2003: 2 / 1 / 0 | 2004: 0 / 0 / 0 | 2005: 0 / 0 / 0 | 2006: 0 / 0 / 0 |');
    expect(doc).not.toContain('12345678901'); // CPF não sai da memória (C-006)
    const mantido = conferenciaMandatoAnterior(r, `topo velho\n${MARCADOR_MANUAL_ANTERIOR}\nconferido à mão`, '2026-10-04');
    expect(mantido.endsWith(`${MARCADOR_MANUAL_ANTERIOR}\nconferido à mão`)).toBe(true);
  });

  it('nenhuma votação da página dentro do exercício: sem dados, com o motivo', async () => {
    const soLicenca = { ...rede, html: async (u: string, arquivo: string) => (arquivo === 'pagina-30-2003.html' ? pagina(2003, sessao(4, '12/03/2003', [['E', '---']])) : rede.html(u, arquivo)) };
    const r = await coletarMandatoAnterior(soLicenca, { api: API, candidatos: [candidatos[1]] });
    expect(r.porSq.get('B')).toEqual({ sem_dados: true, de: 2003, ate: 2006 });
    expect(r.linhas[0].motivo).toMatch(/não lista votação nominal/);
  });
});

describe('cartão: rótulo e frases com o período (FR-070, FR-073, FR-074)', () => {
  const periodo = { de: 2019, ate: 2022 };

  it('rótulo', () => {
    expect(rotuloParticipacao(periodo)).toBe('Votações na Câmara em 2019–2022');
    expect(rotuloParticipacao()).toBe('Votações na Câmara em 2026');
  });

  it('com números: a mesma conta de 2026; leitor de tela com período e números exatos', () => {
    const p = participacaoAnterior({ votou: 812, total: 905, ...periodo });
    expect(p).toMatchObject({ sem: false, n: 9, vermelho: false });
    expect(fraseParticipacao(p, periodo)).toBe('De cada 10, votou em 9');
    expect(fraseParticipacaoSr(p, periodo)).toBe('Votações na Câmara em 2019–2022: votou em 812 de 905, cerca de 9 em cada 10.');
    expect(participacaoAnterior({ votou: 40, total: 100, ...periodo })).toMatchObject({ n: 4, vermelho: true });
  });

  it('sem dados: frase cinza com o período', () => {
    const pe = { de: 2003, ate: 2006 };
    const p = participacaoAnterior({ sem_dados: true, ...pe });
    expect(p).toEqual({ sem: true });
    expect(fraseParticipacao(p, pe)).toBe('Sem dados de votação da Câmara para 2003–2006');
    expect(fraseParticipacaoSr(p, pe)).toBe('Sem dados de votação da Câmara para 2003–2006.');
  });
});
