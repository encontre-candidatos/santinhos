// Guia "Me ajude a escolher" (versão 4310): pontos, motivos, exclusões e neutralidade, com
// candidatos fictícios.
import { describe, expect, it } from 'vitest';
import type { Candidato } from '$lib/tipos';
import {
  itens,
  ladoCompativel,
  motivos,
  recomendar,
  RESPOSTAS_VAZIAS,
  total,
  type Respostas
} from '$lib/guia';
import dados from '../fixtures/candidatos-ficticios.json';

const molde = (dados as Candidato[])[0];
const ctx = { siglasMarcadas: ['PL'] };
const CIDADE = '48658';

let seq = 0;
function cand(o: Partial<Candidato>): Candidato {
  seq++;
  return {
    ...molde,
    sq_candidato: String(100 + seq),
    numero_urna: String(1000 + seq),
    nome_urna: `Fulano ${seq}`,
    partido: 'PSB',
    reeleicao: true,
    patrimonio_total: 100_000,
    patrimonio_2022: 100_000,
    voto_6x1: { final: 'sim', primeiro_turno: 'sim', emendas: [] },
    votacoes_2026: { votou: 90, total: 100 },
    governo_2026: { com: 50, total: 100 },
    blindagem: { t1: 'nao', t2: 'nao' },
    regiao_2022: null,
    ...o
  };
}
const r = (o: Partial<Respostas>): Respostas => ({ ...RESPOSTAS_VAZIAS, ...o });
/** Sorteio fixo: não troca nada (Fisher-Yates com j = i). */
const semSorteio = (n: number) => n - 1;

describe('lado (neutralidade)', () => {
  const governista = cand({ governo_2026: { com: 9, total: 10 } });
  const oposicao = cand({ governo_2026: { com: 2, total: 10 } });
  const meio = cand({ governo_2026: { com: 5, total: 10 } });
  const semDado = cand({ governo_2026: null });

  it('"com" aceita de 6 a 10 em 10; "contra", de 0 a 4; 5 fica fora dos dois', () => {
    expect([governista, oposicao, meio].map((c) => ladoCompativel(c, 'com'))).toEqual([true, false, false]);
    expect([governista, oposicao, meio].map((c) => ladoCompativel(c, 'contra'))).toEqual([false, true, false]);
  });

  it('"tanto faz" ou pular: todos passam e o lado não dá ponto', () => {
    for (const lado of ['tanto-faz', null] as const) {
      expect([governista, oposicao, meio, semDado].every((c) => ladoCompativel(c, lado))).toBe(true);
      expect(itens(governista, r({ lado }))).toEqual([]);
    }
  });

  it('sem dado de governo, não entra quando há lado escolhido', () => {
    expect(ladoCompativel(semDado, 'com')).toBe(false);
    expect(ladoCompativel(semDado, 'contra')).toBe(false);
  });

  it('régua espelhada: 9 em 10 com o governo vale o mesmo que 9 em 10 contra', () => {
    const espelho = cand({ governo_2026: { com: 1, total: 10 } });
    expect(total(itens(governista, r({ lado: 'com' })))).toBe(total(itens(espelho, r({ lado: 'contra' }))));
  });
});

describe('pontos e motivos', () => {
  it('lado e prioridades valem em dobro; cidade sem prioridade vale simples', () => {
    const c = cand({ governo_2026: { com: 8, total: 10 }, regiao_2022: { total: 5000, top: { [CIDADE]: [3000, 2] } } });
    const l = itens(c, r({ lado: 'com', prioridades: ['6x1'], cidade: CIDADE }));
    expect(l.map((i) => [i.eixo, i.peso, i.pontos])).toEqual([
      ['lado', 2, 8],
      ['6x1', 2, 10],
      ['regiao', 1, 9]
    ]);
    expect(total(l)).toBe(16 + 20 + 9);
    const comoPrioridade = itens(c, r({ prioridades: ['regiao'], cidade: CIDADE }));
    expect(comoPrioridade).toEqual([{ eixo: 'regiao', peso: 2, pontos: 9, motivo: 'Ficou em 2º lugar na sua cidade em 2022' }]);
  });

  it('motivos em palavras simples, do que mais pesou, no máximo 3', () => {
    const c = cand({ governo_2026: { com: 9, total: 10 }, regiao_2022: { total: 5000, top: { [CIDADE]: [3000, 2] } } });
    const resp = r({ lado: 'com', prioridades: ['6x1', 'participacao'], cidade: CIDADE });
    expect(motivos(itens(c, resp), resp)).toEqual([
      'Votou a favor do fim da 6x1',
      'Votou com o governo em 9 de cada 10 votações',
      'Votou em 9 de cada 10 votações'
    ]);
  });

  it('"contra" diz quantas vezes votou contra o governo', () => {
    const c = cand({ governo_2026: { com: 2, total: 10 } });
    const resp = r({ lado: 'contra' });
    expect(motivos(itens(c, resp), resp)).toEqual(['Votou contra o governo em 8 de cada 10 votações']);
  });

  it('honestidade: patrimônio que não dobrou e voto contra a PEC da Blindagem, 5 pontos cada', () => {
    const resp = r({ prioridades: ['honestidade'] });
    const limpo = cand({ patrimonio_anterior: { ano: 2022, valor: 100_000, fator_ipca: 1 }, patrimonio_total: 150_000, blindagem: { t1: 'nao', t2: 'nao' } });
    const blindou = cand({ patrimonio_anterior: { ano: 2022, valor: 100_000, fator_ipca: 1 }, patrimonio_total: 150_000, blindagem: { t1: 'sim', t2: 'nao' } });
    const dobrou = cand({ patrimonio_anterior: { ano: 2022, valor: 100_000, fator_ipca: 1 }, patrimonio_total: 900_000, blindagem: { t1: 'ausente', t2: 'ausente' } });
    expect(total(itens(limpo, resp))).toBe(20);
    expect(motivos(itens(limpo, resp), resp)).toEqual(['Votou contra a PEC da Blindagem', 'Patrimônio declarado não dobrou desde 2022, descontada a inflação']);
    expect(total(itens(blindou, resp))).toBe(10);
    expect(total(itens(dobrou, resp))).toBe(0);
  });

  it('sem nada a dizer a favor, uma frase honesta no lugar', () => {
    const c = cand({ voto_6x1: { final: 'nao', primeiro_turno: 'nao', emendas: [] } });
    expect(motivos(itens(c, r({ prioridades: ['6x1'] })), r({ prioridades: ['6x1'] }))).toEqual([
      'Está entre os que combinam com suas respostas'
    ]);
    const resp = r({ prioridades: ['6x1'], desistir: ['extrema-direita'] });
    expect(motivos(itens(c, resp), resp)).toEqual(['Não tem nenhuma das marcas que você descartou']);
  });
});

describe('recomendar', () => {
  it('quem tem marca descartada sai; até 5 nomes, ordenados por pontos', () => {
    const lista = [
      cand({ partido: 'PL', governo_2026: { com: 10, total: 10 } }),
      ...[9, 8, 7, 6, 6, 9].map((n) => cand({ governo_2026: { com: n, total: 10 } }))
    ];
    const res = recomendar(lista, r({ lado: 'com', desistir: ['extrema-direita'] }), ctx, semSorteio);
    expect(res.qualificados).toBe(6);
    expect(res.lista).toHaveLength(5);
    expect(res.lista.map((i) => i.candidato.partido)).not.toContain('PL');
    expect(res.lista.map((i) => i.pontos)).toEqual([18, 18, 16, 14, 12]);
  });

  it('marca da Blindagem também descarta', () => {
    const a = cand({ blindagem: { t1: 'sim', t2: 'sim' } });
    const b = cand({});
    const res = recomendar([a, b], r({ desistir: ['blindagem'] }), ctx, semSorteio);
    expect(res.lista.map((i) => i.candidato)).toEqual([b]);
  });

  it('menos de 5 ou nenhum: devolve o que há, sem completar', () => {
    const a = cand({ partido: 'PL' });
    expect(recomendar([a], r({ desistir: ['extrema-direita'] }), ctx).lista).toEqual([]);
    expect(recomendar([a], r({ desistir: ['extrema-direita'] }), ctx).qualificados).toBe(0);
  });

  it('empate é sorteado: a ordem muda com o sorteio, os pontos não', () => {
    const lista = [1, 2, 3].map(() => cand({}));
    const a = recomendar(lista, RESPOSTAS_VAZIAS, ctx, semSorteio);
    const b = recomendar(lista, RESPOSTAS_VAZIAS, ctx, () => 0);
    expect(a.empate).toBe(true);
    expect(a.lista.map((i) => i.candidato.sq_candidato)).not.toEqual(b.lista.map((i) => i.candidato.sq_candidato));
  });

  it('quem não é deputado só entra com a cidade escolhida, se foi dos 10 mais votados nela, e sem lado escolhido', () => {
    const naoDep = cand({
      reeleicao: false, id_camara: null, governo_2026: null, blindagem: null, voto_6x1: null, votacoes_2026: null,
      regiao_2022: { total: 20000, top: { [CIDADE]: [9000, 1] } }
    });
    expect(recomendar([naoDep], RESPOSTAS_VAZIAS, ctx).qualificados).toBe(0);
    expect(recomendar([naoDep], r({ cidade: '99999' }), ctx).qualificados).toBe(0);
    const res = recomendar([naoDep], r({ cidade: CIDADE }), ctx);
    expect(res.lista[0].motivos).toEqual(['Ficou em 1º lugar na sua cidade em 2022']);
    expect(recomendar([naoDep], r({ cidade: CIDADE, lado: 'com' }), ctx).qualificados).toBe(0);
  });

  it('pede região sem cidade: avisa', () => {
    expect(recomendar([cand({})], r({ prioridades: ['regiao'] }), ctx).regiaoSemCidade).toBe(true);
  });
});
