import type { Candidato, Contagem, EstadoFiltro } from '$lib/tipos';
import { normalizar } from './normalizar';
import { achadoPeloNumero, buscaNumero, oculto } from './ocultos';
import { indexarMarcas, type ContextoMarcas, type IndiceMarcas } from '../marcas';

// Um Collator só: localeCompare com opções cria um a cada chamada e fica ~10x mais lento (NFR-002).
const colacao = new Intl.Collator('pt-BR', { sensitivity: 'base' });

// Cache dos nomes normalizados por objeto candidato; não toca no objeto (WeakMap externo).
const nomesNormalizados = new WeakMap<Candidato, string>();
function chaveBusca(c: Candidato): string {
  let k = nomesNormalizados.get(c);
  if (k === undefined) {
    k = `${normalizar(c.nome_urna)}|${normalizar(c.nome_civil)}`;
    nomesNormalizados.set(c, k);
  }
  return k;
}

/**
 * Verdadeiro quando o partido de registro (2026) do candidato está na lista de siglas marcadas
 * como extrema direita. Só decide a marca do cartão (FR-006); nunca esconde ninguém (FR-005).
 */
export function marcadoExtremaDireita(c: Candidato, siglasMarcadas: readonly string[]): boolean {
  return siglasMarcadas.includes(c.partido);
}

/**
 * Busca e partido. Busca só com dígitos procura no número de urna (4 dígitos = exato; 1 a 3 =
 * começo), e não no nome (FR-008).
 */
function casa(c: Candidato, q: string, numero: string | null, partido: string | null): boolean {
  if (partido !== null && c.partido !== partido) return false;
  if (!q) return true;
  if (numero !== null) return numero.length === 4 ? c.numero_urna === numero : c.numero_urna.startsWith(numero);
  // q nunca contém "|" (normalizar troca pontuação por espaço): não casa atravessando os dois nomes.
  return chaveBusca(c).includes(q);
}

/**
 * Uma passada só pela base a cada mudança de estado: devolve a lista à mostra e os números do
 * visor tirados da mesma passada (NFR-030, revisão do WP14: antes eram três filtros completos por
 * clique). A lista sai na ordem da entrada: a mesa passa a base já sorteada (FR-060, WP15), e
 * filtrar ou trocar a opção do topo só tira e põe cartões, sem reordenar. Aplica opção do topo
 * (FR-065: em "Reeleição", só quem tenta a reeleição), busca, partido, ocultos e marcas. Não há
 * corte por partido de extrema direita: desde 02/10/2026 todos aparecem, com a marca (FR-005). Com
 * os ocultos escondidos (FR-036), um oculto só entra pelo número completo (FR-037). Marcas ligadas
 * em "Esconder quem tem" escondem quem tem qualquer uma (FR-052), consultando o índice de marcas
 * (calculado uma vez a partir dos dados; sem ele, é montado aqui).
 *
 * Contagem (FR-007, FR-040, FR-053, FR-066): total da opção ativa, à mostra, dos à mostra quantos levam a marca,
 * quantos ocultos há na opção, com eles escondidos quantos casam com a busca sem aparecer, e quantos
 * as marcas ligadas tiraram.
 */
export function filtrar(
  candidatos: readonly Candidato[],
  estado: EstadoFiltro,
  ctx: ContextoMarcas = { siglasMarcadas: [] },
  indice?: IndiceMarcas
): { lista: Candidato[]; contagem: Contagem } {
  const q = normalizar(estado.busca);
  const numero = buscaNumero(q);
  const esconder = estado.esconder;
  const marcas = esconder.length === 0 ? null : (indice ?? indexarMarcas(candidatos, ctx));
  const soReeleicao = estado.universo === 'reeleicao';
  const ficam: Candidato[] = [];
  let total = 0;
  let marcados = 0;
  let ocultos = 0;
  let ocultosNaBusca = 0;
  let escondidosPorMarca = 0;
  for (const c of candidatos) {
    if (soReeleicao && !c.reeleicao) continue;
    total++;
    const ehOculto = oculto(c);
    if (ehOculto) ocultos++;
    if (!casa(c, q, numero, estado.partido)) continue;
    if (ehOculto && !estado.mostrarOcultos && !achadoPeloNumero(c, numero)) {
      ocultosNaBusca++;
      continue;
    }
    if (marcas !== null) {
      const tem = marcas.get(c.sq_candidato);
      if (tem !== undefined && tem.size > 0 && esconder.some((id) => tem.has(id))) {
        escondidosPorMarca++;
        continue;
      }
    }
    ficam.push(c);
    if (marcadoExtremaDireita(c, ctx.siglasMarcadas)) marcados++;
  }
  return {
    lista: ficam,
    contagem: { total, exibidos: ficam.length, marcados, ocultos, ocultosNaBusca, escondidosPorMarca }
  };
}

/** A lista à mostra de `filtrar`, na ordem da entrada. */
export function visiveis(
  candidatos: readonly Candidato[],
  estado: EstadoFiltro,
  ctx: ContextoMarcas = { siglasMarcadas: [] },
  indice?: IndiceMarcas
): Candidato[] {
  return filtrar(candidatos, estado, ctx, indice).lista;
}

/**
 * Em "Reeleição", a busca é o número completo de alguém que não tenta a reeleição (FR-068): a
 * mesa avisa e oferece "Ver em Todos os candidatos". Só quando ele apareceria lá, com o partido e
 * as chaves de marca de agora; senão o botão levaria a uma mesa vazia. Em "Todos", sempre falso.
 */
export function numeroForaDaReeleicao(
  candidatos: readonly Candidato[],
  estado: EstadoFiltro,
  ctx: ContextoMarcas = { siglasMarcadas: [] }
): boolean {
  if (estado.universo !== 'reeleicao') return false;
  const numero = buscaNumero(normalizar(estado.busca));
  if (numero === null || numero.length !== 4) return false;
  return visiveis(candidatos, { ...estado, universo: 'todos' }, ctx).some((c) => !c.reeleicao);
}

function porNome(a: Candidato, b: Candidato): number {
  return colacao.compare(a.nome_urna, b.nome_urna);
}

/**
 * Ordena por nome de urna sem mutar a entrada. Desde o WP15 a mesa vem sorteada (FR-009 alterado
 * pela 2ª vez); a ordem de nome fica só para o HTML pré-renderizado, antes do sorteio.
 */
export function ordenar(lista: readonly Candidato[]): Candidato[] {
  return [...lista].sort(porNome);
}

/** Os números do visor de `filtrar` (FR-007, FR-040, FR-053). */
export function contagens(
  candidatos: readonly Candidato[],
  siglasMarcadas: readonly string[],
  estado: EstadoFiltro
): Contagem {
  return filtrar(candidatos, estado, { siglasMarcadas }).contagem;
}
