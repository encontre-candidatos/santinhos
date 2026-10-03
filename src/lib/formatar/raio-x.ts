// Raio-X da reeleição no cartão de quem tenta a reeleição (03/10/2026). Regras, vereditos e
// explicações copiados da página "Raio-X da reeleição" (static/raio-x/index.html, branch
// raio-x-publicar: funções `linhas`, `card` e o objeto `EXPL`), traduzidos para os campos da
// base. Única diferença de propósito: quem não estava no exercício do mandato na data de uma
// votação (campo null) lê "Não era deputado", e não "Faltou" (a página só sabia "Ausente").
// Os textos moram aqui para os testes conferirem o que o eleitor lê.
import type { Blindagem, Candidato, Voto6x1, Votacoes2026, VotoPlenario } from '$lib/tipos';
import { selo6x1 } from './selo6x1';

/** ok = ✔ verde; bad = ✖ vermelho (alerta); na = – tracejado (faltou ou não era deputado). */
export type Classe = 'ok' | 'bad' | 'na';

export type ChaveVoto = 'blindagem' | '6x1' | 'devastacao' | 'reforma';

export interface LinhaVoto {
  chave: ChaveVoto;
  /** Nome da votação, pequeno. */
  rotulo: string;
  classe: Classe;
  /** Veredito, grande. */
  veredito: string;
}

export const ROTULOS: Record<ChaveVoto, string> = {
  blindagem: 'PEC da Blindagem',
  '6x1': 'Fim da escala 6x1',
  devastacao: 'PL da Devastação',
  reforma: 'Reforma tributária'
};

/** Texto do "?" e a regra do alerta, como na página do Raio-X. */
export const EXPLICA: Record<ChaveVoto, { texto: string; regra: string; fonte: string; link: string }> = {
  blindagem: {
    texto:
      'Mudava a Constituição para que deputados e senadores só pudessem ser processados com autorização do próprio Congresso, em votação secreta. Dificultava investigar e punir parlamentares. A Câmara aprovou em 16/09/2025 e o Senado rejeitou.',
    regra: 'Votar Sim é alerta.',
    fonte: 'Câmara dos Deputados, PEC 3/2021, 1º e 2º turno no Plenário em 16/09/2025.',
    link: 'https://www.camara.leg.br/propostas-legislativas/2270800'
  },
  '6x1': {
    texto:
      'Mudança na Constituição que acaba com a jornada de 6 dias de trabalho para 1 de folga e reduz as horas semanais. A Câmara votou em 27/05/2026. As Emendas 1 e 2 abriam exceções para manter até 44 horas por semana, o que enfraquecia a mudança.',
    regra: 'Assinar essas emendas ou votar contra é alerta.',
    fonte: 'Câmara dos Deputados, PEC 221/2019, votação final no Plenário em 27/05/2026, e autores das Emendas 1 e 2.',
    link: 'https://www.camara.leg.br/propostas-legislativas/2233802'
  },
  devastacao: {
    texto:
      'Nova lei do licenciamento ambiental. Afrouxa as regras para liberar obras que podem causar dano ambiental, permitindo em muitos casos que a própria empresa declare que cumpre as regras, sem análise prévia de um órgão ambiental. Votação de 17/07/2025, de madrugada.',
    regra: 'Votar Sim é alerta.',
    fonte: 'Câmara dos Deputados, PL 2159/2021, emendas do Senado votadas no Plenário em 17/07/2025.',
    link: 'https://www.camara.leg.br/propostas-legislativas/257161'
  },
  reforma: {
    texto:
      'Troca cinco impostos sobre o consumo (PIS, Cofins, IPI, ICMS e ISS) por dois novos (CBS e IBS), com regras iguais em todo o país, para simplificar a cobrança. Votada em dois turnos em julho de 2023.',
    regra: 'Votar Não é alerta.',
    fonte: 'Câmara dos Deputados, PEC 45/2019, 1º e 2º turno no Plenário em 06 e 07/07/2023.',
    link: 'https://www.camara.leg.br/propostas-legislativas/2196833'
  }
};

const FORA = 'Não era deputado';

/** Votação em dois turnos (Blindagem): Sim em algum = alerta; senão Não em algum = ok; senão faltou. */
export function linhaBlindagem(b: Blindagem | null): Omit<LinhaVoto, 'chave' | 'rotulo'> {
  if (b && (b.t1 === 'sim' || b.t2 === 'sim')) return { classe: 'bad', veredito: 'Votou Sim' };
  if (b && (b.t1 === 'nao' || b.t2 === 'nao')) return { classe: 'ok', veredito: 'Votou Não' };
  return { classe: 'na', veredito: !b || (b.t1 === null && b.t2 === null) ? FORA : 'Faltou' };
}

/** Fim da 6x1: assinou Emenda 1 ou 2 ou votou contra = alerta. */
export function linha6x1(v: Voto6x1 | null): Omit<LinhaVoto, 'chave' | 'rotulo'> {
  if (!v) return { classe: 'na', veredito: FORA };
  const s = selo6x1(v);
  switch (s.situacao) {
    case 'enfraquecer':
      return { classe: 'bad', veredito: s.faltou ? 'Enfraqueceu e faltou' : 'Enfraqueceu' };
    case 'contra':
      return { classe: 'bad', veredito: 'Votou contra' };
    case 'favor':
      return { classe: 'ok', veredito: 'Votou a favor' };
    case 'faltou':
      return { classe: 'na', veredito: 'Faltou' };
    case 'sem_mandato':
      return { classe: 'na', veredito: FORA };
  }
}

/** PL da Devastação: Sim = alerta. */
export function linhaDevastacao(v: VotoPlenario): Omit<LinhaVoto, 'chave' | 'rotulo'> {
  if (v === 'sim') return { classe: 'bad', veredito: 'Votou Sim' };
  if (v === 'nao') return { classe: 'ok', veredito: 'Votou Não' };
  return { classe: 'na', veredito: v === null ? FORA : 'Faltou' };
}

/** Reforma tributária: Não em algum turno = alerta; Sim nos dois = ok; Sim em um = ok, com a falta. */
export function linhaReforma(r: Blindagem | null): Omit<LinhaVoto, 'chave' | 'rotulo'> {
  const t = r ? [r.t1, r.t2] : [];
  if (t.includes('nao')) return { classe: 'bad', veredito: 'Votou Não' };
  if (t.length && t.every((x) => x === 'sim')) return { classe: 'ok', veredito: 'Votou Sim' };
  if (t.includes('sim')) return { classe: 'ok', veredito: 'Votou Sim (faltou 1 turno)' };
  return { classe: 'na', veredito: !r || (r.t1 === null && r.t2 === null) ? FORA : 'Faltou' };
}

type DadosVotos = Pick<Candidato, 'blindagem' | 'voto_6x1' | 'devastacao' | 'reforma_tributaria'>;

/** As quatro votações, na ordem do Raio-X. */
export function linhasRaioX(c: DadosVotos): LinhaVoto[] {
  const l = (chave: ChaveVoto, r: Omit<LinhaVoto, 'chave' | 'rotulo'>): LinhaVoto => ({ chave, rotulo: ROTULOS[chave], ...r });
  return [
    l('blindagem', linhaBlindagem(c.blindagem)),
    l('6x1', linha6x1(c.voto_6x1)),
    l('devastacao', linhaDevastacao(c.devastacao)),
    l('reforma', linhaReforma(c.reforma_tributaria))
  ];
}

/** Presença abaixo de 75% em 2026 é alerta. */
export const CORTE_PRESENCA = 0.75;

/** Presença nas votações nominais do Plenário em 2026 (0 a 1), ou null. */
export function presenca(v: Votacoes2026 | null): number | null {
  return v && v.total > 0 ? v.votou / v.total : null;
}

export function presencaAlerta(v: Votacoes2026 | null): boolean {
  const p = presenca(v);
  return p !== null && p < CORTE_PRESENCA;
}

/** Quantos alertas: votações em vermelho mais a presença abaixo de 75%. Patrimônio e governo não contam. */
export function contarAlertas(c: DadosVotos & Pick<Candidato, 'votacoes_2026'>): number {
  return linhasRaioX(c).filter((l) => l.classe === 'bad').length + (presencaAlerta(c.votacoes_2026) ? 1 : 0);
}

/** Nomes curtos dos alertas, na ordem do Raio-X ("Blindagem, 6x1, Devastação, Reforma, Presença"). */
export function quaisAlertas(c: DadosVotos & Pick<Candidato, 'votacoes_2026'>): string[] {
  const curto: Record<ChaveVoto, string> = { blindagem: 'Blindagem', '6x1': '6x1', devastacao: 'Devastação', reforma: 'Reforma' };
  const q = linhasRaioX(c).filter((l) => l.classe === 'bad').map((l) => curto[l.chave]);
  if (presencaAlerta(c.votacoes_2026)) q.push('Presença');
  return q;
}

/** "86%" ou "—". */
export function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

/** Patrimônio curto: "R$ 1,2 milhão", "R$ 20,1 milhões", "R$ 241 mil" ou "—". */
export function brlCurto(v: number | null): string {
  if (v === null) return '—';
  if (v >= 1e6) {
    const m = Math.round((v / 1e6) * 10) / 10;
    return `R$ ${String(m).replace('.', ',')} ${v < 2e6 ? 'milhão' : 'milhões'}`;
  }
  return `R$ ${String(Math.round(v / 1e3)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} mil`;
}
