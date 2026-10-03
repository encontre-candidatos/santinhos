// Raio-X da reeleição no cartão (03/10/2026): vereditos, contagem de alertas e paridade com a
// página "Raio-X da reeleição" (tests/fixtures/raio-x-alertas.json, tirado do objeto DADOS dela).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Candidato } from '$lib/tipos';
import {
  brlCurto,
  contarAlertas,
  linha6x1,
  linhaBlindagem,
  linhaDevastacao,
  linhaReforma,
  linhasRaioX,
  pct,
  presencaAlerta,
  quaisAlertas
} from '$lib/formatar/raio-x';

type Dados = Pick<Candidato, 'blindagem' | 'voto_6x1' | 'devastacao' | 'reforma_tributaria' | 'votacoes_2026'>;
const limpo: Dados = {
  blindagem: { t1: 'nao', t2: 'nao' },
  voto_6x1: { final: 'sim', primeiro_turno: 'sim', emendas: [] },
  devastacao: 'nao',
  reforma_tributaria: { t1: 'sim', t2: 'sim' },
  votacoes_2026: { votou: 90, total: 100 }
};

describe('vereditos', () => {
  it('PEC da Blindagem: Sim em algum turno é alerta; Não é ok; o resto é faltou ou não era deputado', () => {
    expect(linhaBlindagem({ t1: 'sim', t2: 'nao' })).toEqual({ classe: 'bad', veredito: 'Votou Sim' });
    expect(linhaBlindagem({ t1: 'ausente', t2: 'sim' })).toEqual({ classe: 'bad', veredito: 'Votou Sim' });
    expect(linhaBlindagem({ t1: 'ausente', t2: 'nao' })).toEqual({ classe: 'ok', veredito: 'Votou Não' });
    expect(linhaBlindagem({ t1: 'ausente', t2: 'ausente' })).toEqual({ classe: 'na', veredito: 'Faltou' });
    expect(linhaBlindagem({ t1: null, t2: null })).toEqual({ classe: 'na', veredito: 'Não era deputado' });
    expect(linhaBlindagem(null)).toEqual({ classe: 'na', veredito: 'Não era deputado' });
  });
  it('Fim da 6x1: emendas ou contra é alerta', () => {
    expect(linha6x1({ final: 'sim', primeiro_turno: 'sim', emendas: [1, 2] })).toEqual({ classe: 'bad', veredito: 'Enfraqueceu' });
    expect(linha6x1({ final: 'ausente', primeiro_turno: 'sim', emendas: [2] })).toEqual({ classe: 'bad', veredito: 'Enfraqueceu e faltou' });
    expect(linha6x1({ final: 'nao', primeiro_turno: 'nao', emendas: [] })).toEqual({ classe: 'bad', veredito: 'Votou contra' });
    expect(linha6x1({ final: 'sim', primeiro_turno: 'sim', emendas: [] })).toEqual({ classe: 'ok', veredito: 'Votou a favor' });
    expect(linha6x1({ final: 'ausente', primeiro_turno: 'sim', emendas: [] })).toEqual({ classe: 'na', veredito: 'Faltou' });
    expect(linha6x1({ final: null, primeiro_turno: null, emendas: [] })).toEqual({ classe: 'na', veredito: 'Não era deputado' });
  });
  it('PL da Devastação: Sim é alerta', () => {
    expect(linhaDevastacao('sim')).toEqual({ classe: 'bad', veredito: 'Votou Sim' });
    expect(linhaDevastacao('nao')).toEqual({ classe: 'ok', veredito: 'Votou Não' });
    expect(linhaDevastacao('ausente')).toEqual({ classe: 'na', veredito: 'Faltou' });
    expect(linhaDevastacao(null)).toEqual({ classe: 'na', veredito: 'Não era deputado' });
  });
  it('Reforma tributária: Não em algum turno é alerta; Sim em um só é ok, com a falta', () => {
    expect(linhaReforma({ t1: 'nao', t2: 'ausente' })).toEqual({ classe: 'bad', veredito: 'Votou Não' });
    expect(linhaReforma({ t1: 'sim', t2: 'nao' })).toEqual({ classe: 'bad', veredito: 'Votou Não' });
    expect(linhaReforma({ t1: 'sim', t2: 'sim' })).toEqual({ classe: 'ok', veredito: 'Votou Sim' });
    expect(linhaReforma({ t1: 'sim', t2: 'ausente' })).toEqual({ classe: 'ok', veredito: 'Votou Sim (faltou 1 turno)' });
    expect(linhaReforma({ t1: 'ausente', t2: 'ausente' })).toEqual({ classe: 'na', veredito: 'Faltou' });
    expect(linhaReforma(null)).toEqual({ classe: 'na', veredito: 'Não era deputado' });
  });
  it('as quatro linhas, na ordem do Raio-X', () => {
    expect(linhasRaioX(limpo).map((l) => l.rotulo)).toEqual(['PEC da Blindagem', 'Fim da escala 6x1', 'PL da Devastação', 'Reforma tributária']);
  });
});

describe('alertas', () => {
  it('presença abaixo de 75% é alerta; 75% não; sem dado não', () => {
    expect(presencaAlerta({ votou: 74, total: 100 })).toBe(true);
    expect(presencaAlerta({ votou: 75, total: 100 })).toBe(false);
    expect(presencaAlerta(null)).toBe(false);
  });
  it('conta votações em vermelho mais a presença; faltar não conta', () => {
    expect(contarAlertas(limpo)).toBe(0);
    expect(contarAlertas({ ...limpo, blindagem: { t1: 'ausente', t2: 'ausente' }, devastacao: 'ausente' })).toBe(0);
    const pior: Dados = {
      blindagem: { t1: 'sim', t2: 'sim' },
      voto_6x1: { final: 'sim', primeiro_turno: 'sim', emendas: [1, 2] },
      devastacao: 'sim',
      reforma_tributaria: { t1: 'nao', t2: 'nao' },
      votacoes_2026: { votou: 10, total: 100 }
    };
    expect(contarAlertas(pior)).toBe(5);
    expect(quaisAlertas(pior)).toEqual(['Blindagem', '6x1', 'Devastação', 'Reforma', 'Presença']);
  });
});

describe('formato', () => {
  it('porcentagem e patrimônio curto, como no Raio-X', () => {
    expect(pct(0.8617886)).toBe('86%');
    expect(pct(null)).toBe('—');
    expect(brlCurto(240920)).toBe('R$ 241 mil');
    expect(brlCurto(3154592.97)).toBe('R$ 3,2 milhões');
    expect(brlCurto(1611165.37)).toBe('R$ 1,6 milhão');
    expect(brlCurto(20093322.56)).toBe('R$ 20,1 milhões');
    expect(brlCurto(1076000)).toBe('R$ 1,1 milhão');
    expect(brlCurto(0)).toBe('R$ 0 mil');
    expect(brlCurto(null)).toBe('—');
  });
});

describe('paridade com a página do Raio-X', () => {
  const ler = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf-8'));
  const candidatos: Candidato[] = ler('../../src/lib/dados/candidatos.json');
  const esperado: { por_numero: Record<string, { nome: string; alertas: number; quais: string[] }> } = ler('../fixtures/raio-x-alertas.json');
  const reeleicao = candidatos.filter((c) => c.reeleicao);

  it('os 48 da reeleição estão na página', () => {
    expect(reeleicao.map((c) => c.numero_urna).sort()).toEqual(Object.keys(esperado.por_numero).sort());
  });
  it.each(reeleicao.map((c) => [c.nome_urna, c] as const))('%s: mesmos alertas', (_, c) => {
    const e = esperado.por_numero[c.numero_urna];
    expect(quaisAlertas(c)).toEqual(e.quais);
    expect(contarAlertas(c)).toBe(e.alertas);
  });
});
