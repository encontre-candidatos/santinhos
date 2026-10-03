// Registro único das marcas do cartão que podem ser escondidas (FR-050, FR-051; WP14/T067).
// Cada regra reusa a função que o cartão já usa para desenhar a marca: o que o cartão mostra e o
// que a chave esconde não divergem. Marca nova entra aqui e aparece sozinha no bloco "Esconder
// quem tem". Ordem do registro = ordem das chaves no painel. Rótulo = nome da marca, sem
// adjetivo (C-021). Quem não tem o dado (null) não tem a marca.
import type { Candidato } from '$lib/tipos';
import { marcaCrescimento } from '../formatar/crescimento';
import { participacao } from '../formatar/participacao';
import { selo6x1 } from '../formatar/selo6x1';
import { marcadoExtremaDireita } from '../regras/filtros';
import { ROTULO_BLINDAGEM, votouBlindagem } from '../formatar/blindagem';

/** O que a regra precisa e não está no candidato. */
export interface ContextoMarcas {
  siglasMarcadas: readonly string[];
}

export interface Marca {
  id: string;
  rotulo: string;
  tem: (c: Candidato, ctx: ContextoMarcas) => boolean;
}

export const MARCAS: readonly Marca[] = [
  { id: 'extrema-direita', rotulo: 'Extrema direita', tem: (c, ctx) => marcadoExtremaDireita(c, ctx.siglasMarcadas) },
  { id: 'patrimonio', rotulo: 'Patrimônio multiplicado', tem: (c) => marcaCrescimento(c) },
  {
    id: 'enfraquecer-6x1',
    rotulo: 'Apoiou enfraquecer a 6x1',
    tem: (c) => c.voto_6x1 !== null && selo6x1(c.voto_6x1).situacao === 'enfraquecer'
  },
  {
    id: 'faltou-6x1',
    rotulo: 'Faltou na votação da 6x1',
    tem: (c) => {
      if (c.voto_6x1 === null) return false;
      const s = selo6x1(c.voto_6x1);
      return s.situacao === 'faltou' || s.faltou;
    }
  },
  {
    id: 'votou-pouco',
    rotulo: 'Votou pouco em 2026',
    tem: (c) => {
      const p = participacao(c.votacoes_2026);
      return !p.sem && p.vermelho;
    }
  },
  // PEC da Blindagem (versão 4310, 03/10/2026): Sim em algum dos dois turnos.
  { id: 'blindagem', rotulo: ROTULO_BLINDAGEM, tem: (c) => votouBlindagem(c.blindagem) }
];

/** Verdadeiro quando o candidato tem alguma das marcas ligadas (FR-052). */
export function temAlguma(
  c: Candidato,
  ligadas: readonly string[],
  ctx: ContextoMarcas,
  registro: readonly Marca[] = MARCAS
): boolean {
  if (ligadas.length === 0) return false;
  return registro.some((m) => ligadas.includes(m.id) && m.tem(c, ctx));
}

/**
 * Marcas de cada candidato (sq_candidato → ids), calculadas uma vez só a partir dos dados: não
 * depende do estado dos filtros. Trocar uma chave só consulta o conjunto, sem refazer as regras
 * (selo6x1, participacao...) para a base inteira a cada clique (NFR-030, revisão do WP14).
 */
export type IndiceMarcas = ReadonlyMap<string, ReadonlySet<string>>;

export function indexarMarcas(
  candidatos: readonly Candidato[],
  ctx: ContextoMarcas,
  registro: readonly Marca[] = MARCAS
): IndiceMarcas {
  const indice = new Map<string, ReadonlySet<string>>();
  for (const c of candidatos) {
    const ids = new Set<string>();
    for (const m of registro) if (m.tem(c, ctx)) ids.add(m.id);
    indice.set(c.sq_candidato, ids);
  }
  return indice;
}

/** Quantos da base têm cada marca, na ordem do registro (FR-050). */
export function contarPorMarca(
  candidatos: readonly Candidato[],
  ctx: ContextoMarcas,
  registro: readonly Marca[] = MARCAS,
  indice: IndiceMarcas = indexarMarcas(candidatos, ctx, registro)
): { marca: Marca; n: number }[] {
  const n = new Map<string, number>(registro.map((m) => [m.id, 0]));
  for (const c of candidatos) for (const id of indice.get(c.sq_candidato) ?? []) n.set(id, (n.get(id) ?? 0) + 1);
  return registro.map((marca) => ({ marca, n: n.get(marca.id) ?? 0 }));
}
