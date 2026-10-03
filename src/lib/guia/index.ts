// Guia "Me ajude a escolher" (versão 4310, 03/10/2026; docs/eleitor-indeciso.md, melhoria 1).
// Funções puras: a tela só pergunta e mostra. O guia não escolhe pela pessoa: ordena pelo que
// ela respondeu, com a mesma régua para todos, e cada nome vem com os motivos tirados só das
// respostas dela.
//
// Regra de pontos (a mesma frase vai na tela de resultado, em REGRA_GUIA):
// - cada resposta dá de 0 a 10 pontos ao candidato;
// - o lado político e cada uma das (até) 2 prioridades valem em dobro; a cidade, quando não é
//   prioridade, vale simples; "tanto faz" no lado vale zero;
// - quem tem alguma marca escolhida em "o que te faz desistir" sai; com lado escolhido, sai
//   também quem não é daquele lado (governo de 6 a 10 em 10 = "com"; de 0 a 4 = "contra");
// - empate: ordem sorteada (a mesma função que sorteia a mesa).
// Universo: os 48 que tentam a reeleição (têm votos na Câmara) e, só com cidade escolhida, quem
// não é deputado mas ficou entre os 10 mais votados dessa cidade em 2022. Quem não é deputado não
// tem votos para medir o lado: com lado escolhido, fica fora do guia (continua em "Ver todos").
import type { Candidato } from '$lib/tipos';
import { temAlguma, type ContextoMarcas } from '$lib/marcas';
import { governoDe10 } from '$lib/formatar/governo';
import { participacao } from '$lib/formatar/participacao';
import { selo6x1 } from '$lib/formatar/selo6x1';
import { crescimentoPatrimonio } from '$lib/formatar/crescimento';
import { contraBlindagem } from '$lib/formatar/blindagem';
import { naCidade } from '$lib/formatar/regiao';
import { embaralhar, inteiroSeguro } from '$lib/regras/sorteio';

export type Lado = 'com' | 'contra' | 'tanto-faz';
export type Prioridade = '6x1' | 'participacao' | 'honestidade' | 'regiao';

export interface Respostas {
  /** Código TSE do município; null = pulou. */
  cidade: string | null;
  /** null = pulou (vale como "tanto faz"). */
  lado: Lado | null;
  /** Até 2. */
  prioridades: Prioridade[];
  /** Ids de $lib/marcas. */
  desistir: string[];
}

export const RESPOSTAS_VAZIAS: Respostas = { cidade: null, lado: null, prioridades: [], desistir: [] };
export const MAX_PRIORIDADES = 2;
export const MAX_RESULTADO = 5;
/** Governo de N em 10: "com" a partir de 6, "contra" até 4; 5 não entra em nenhum dos dois. */
export const CORTE_COM = 6;
export const CORTE_CONTRA = 4;

export const REGRA_GUIA =
  'Cada resposta dá de 0 a 10 pontos. O lado político e as prioridades que você marcou valem em dobro; a cidade sozinha vale simples. Empate é decidido por sorteio.';
export const NOTA_NEUTRA = 'A ordem vem das suas respostas. Ninguém pagou para aparecer aqui.';
export const NOTA_LEGENDA =
  'Lembre: seu voto também conta para o partido do candidato e ajuda a eleger outros nomes da mesma lista.';

export const PRIORIDADES: { id: Prioridade; rotulo: string; detalhe: string }[] = [
  { id: '6x1', rotulo: 'Trabalho e salário (6x1)', detalhe: 'Como votou o fim da escala 6x1' },
  { id: 'participacao', rotulo: 'Que trabalhe e vote', detalhe: 'Em quantas votações da Câmara votou' },
  { id: 'honestidade', rotulo: 'Honestidade com o dinheiro', detalhe: 'Patrimônio e PEC da Blindagem' },
  { id: 'regiao', rotulo: 'Que seja da minha região', detalhe: 'Bem votado na sua cidade em 2022' }
];

export interface Item {
  eixo: 'lado' | Prioridade;
  peso: number;
  /** 0 a 10. */
  pontos: number;
  /** Frase a favor, só quando há o que dizer. */
  motivo: string | null;
}

/** Governo de N em 10 combina com o lado escolhido? Sem lado (ou "tanto faz"), sempre. */
export function ladoCompativel(c: Pick<Candidato, 'governo_2026'>, lado: Lado | null): boolean {
  if (lado === null || lado === 'tanto-faz') return true;
  const n = governoDe10(c.governo_2026);
  if (n === null) return false;
  return lado === 'com' ? n >= CORTE_COM : n <= CORTE_CONTRA;
}

/** Quem o guia considera, antes das marcas e do lado. */
export function noUniverso(c: Candidato, r: Respostas): boolean {
  return c.reeleicao || naCidade(c, r.cidade) !== null;
}

/** Os itens de pontos de um candidato, só dos eixos que a pessoa respondeu. */
export function itens(c: Candidato, r: Respostas): Item[] {
  const out: Item[] = [];
  const prio = (p: Prioridade) => r.prioridades.includes(p);

  if (r.lado === 'com' || r.lado === 'contra') {
    const n = governoDe10(c.governo_2026);
    const pontos = n === null ? 0 : r.lado === 'com' ? n : 10 - n;
    const motivo =
      n === null || pontos < CORTE_COM
        ? null
        : r.lado === 'com'
          ? `Votou com o governo em ${n} de cada 10 votações`
          : `Votou contra o governo em ${10 - n} de cada 10 votações`;
    out.push({ eixo: 'lado', peso: 2, pontos, motivo });
  }

  if (prio('6x1')) {
    const favor = c.voto_6x1 !== null && c.voto_6x1 !== undefined && selo6x1(c.voto_6x1).situacao === 'favor';
    out.push({ eixo: '6x1', peso: 2, pontos: favor ? 10 : 0, motivo: favor ? 'Votou a favor do fim da 6x1' : null });
  }

  if (prio('participacao')) {
    const p = participacao(c.votacoes_2026 ?? null);
    const n = p.sem ? 0 : p.n;
    out.push({ eixo: 'participacao', peso: 2, pontos: n, motivo: n >= 7 ? `Votou em ${n} de cada 10 votações` : null });
  }

  if (prio('honestidade')) {
    // Mesma régua do carimbo (WP16): valor antigo corrigido pelo IPCA, contra a declaração mais recente.
    const razao = crescimentoPatrimonio(c);
    const naoDobrou = razao !== null && razao < 2;
    const ano = c.patrimonio_anterior?.ano;
    const contra = contraBlindagem(c.blindagem);
    const motivos = [
      contra ? 'Votou contra a PEC da Blindagem' : null,
      naoDobrou && ano ? `Patrimônio declarado não dobrou desde ${ano}, descontada a inflação` : null
    ];
    out.push({
      eixo: 'honestidade',
      peso: 2,
      pontos: (naoDobrou ? 5 : 0) + (contra ? 5 : 0),
      motivo: motivos.filter(Boolean).join('; ') || null
    });
  }

  if (r.cidade !== null || prio('regiao')) {
    const na = naCidade(c, r.cidade);
    out.push({
      eixo: 'regiao',
      peso: prio('regiao') ? 2 : 1,
      pontos: na ? 11 - na.posicao : 0,
      motivo: na ? `Ficou em ${na.posicao}º lugar na sua cidade em 2022` : null
    });
  }
  return out;
}

export function total(lista: readonly Item[]): number {
  return lista.reduce((s, i) => s + i.peso * i.pontos, 0);
}

/** De 1 a 3 motivos, do que mais pesou ao que menos; sem nenhum, uma frase honesta. */
export function motivos(lista: readonly Item[], r: Respostas): string[] {
  const m = [...lista]
    .filter((i) => i.motivo !== null && i.pontos > 0)
    .sort((a, b) => b.peso * b.pontos - a.peso * a.pontos)
    .flatMap((i) => (i.motivo as string).split('; '))
    .slice(0, 3);
  if (m.length) return m;
  return [r.desistir.length ? 'Não tem nenhuma das marcas que você descartou' : 'Está entre os que combinam com suas respostas'];
}

export interface Indicado {
  candidato: Candidato;
  pontos: number;
  motivos: string[];
}

export interface Resultado {
  /** Até 5, na ordem. */
  lista: Indicado[];
  /** Quantos passaram por universo, lado e marcas. */
  qualificados: number;
  /** Todos empatados: a ordem é só sorteio. */
  empate: boolean;
  /** Pediu "minha região" sem dizer a cidade. */
  regiaoSemCidade: boolean;
}

export function recomendar(
  candidatos: readonly Candidato[],
  r: Respostas,
  ctx: ContextoMarcas,
  inteiro: (n: number) => number = inteiroSeguro
): Resultado {
  const ok = candidatos.filter(
    (c) => noUniverso(c, r) && ladoCompativel(c, r.lado) && !temAlguma(c, r.desistir, ctx)
  );
  // Sorteia antes e ordena de forma estável: empate fica na ordem do sorteio.
  const pontuados = embaralhar(ok, inteiro).map((c) => {
    const l = itens(c, r);
    return { candidato: c, pontos: total(l), motivos: motivos(l, r) };
  });
  pontuados.sort((a, b) => b.pontos - a.pontos);
  const empate = pontuados.length > 1 && pontuados.every((p) => p.pontos === pontuados[0].pontos);
  return {
    lista: pontuados.slice(0, MAX_RESULTADO),
    qualificados: pontuados.length,
    empate,
    regiaoSemCidade: r.prioridades.includes('regiao') && r.cidade === null
  };
}
