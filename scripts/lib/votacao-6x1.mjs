// Posição de cada deputado de MG na PEC 221/2019, o fim da escala 6x1 (WP10, T050; FR-024).
// Dados Abertos da Câmara, coletados uma vez pelo `npm run base`:
//   - votos da votação final (2º turno) e do 1º turno, Plenário, 27/05/2026;
//   - quem estava em exercício por MG nessa data (quem não estava fica com null);
//   - autores das Emendas 1 e 2 da comissão especial, menos quem pediu retirada da
//     assinatura até a votação. A emenda de cada pedido é lida da ementa; ementa que não diz
//     qual emenda é derruba o script, para ninguém ganhar ou perder o selo por adivinhação.
import { join } from 'node:path';
import { API_CAMARA } from './camara.mjs';
import { jsonComCache, mapLimitado } from './http.mjs';
import { codigosDe, CODIGOS_6X1, EMENDAS, ehRetirada, emendasDaRetirada, tipoDeVoto } from './emendas-6x1.mjs';

export { EMENDAS };

export const PEC_6X1 = 2233802; // PEC 221/2019
export const DATA_VOTACAO = '2026-05-27';
export const VOTACAO_FINAL = '2233802-438';
export const VOTACAO_1_TURNO = '2233802-424';
const idDe = (/** @type {{ uri?: string }} */ a) => {
  const m = /\/deputados\/(\d+)$/.exec(a.uri ?? '');
  return m ? Number(m[1]) : null;
};

/**
 * @param {{ cache: boolean, dirCache: string }} opcoes
 * @returns {Promise<{ porId: Map<number, { final: string | null, primeiro_turno: string | null, emendas: number[] }>,
 *   retiradas: Array<{ req: string, id_camara: number, emendas: number[] }> }>}
 */
export async function coletar6x1({ cache, dirCache }) {
  const dir = join(dirCache, 'camara-6x1');
  const get = async (/** @type {string} */ caminho, /** @type {string} */ arquivo) =>
    (await jsonComCache(`${API_CAMARA}${caminho}`, join(dir, arquivo), cache)).dados;

  const emExercicio = new Set(
    (await get(`/deputados?siglaUf=MG&dataInicio=${DATA_VOTACAO}&dataFim=${DATA_VOTACAO}&itens=100`, 'em-exercicio.json')).map(
      (/** @type {{ id: number }} */ d) => d.id
    )
  );
  const votos = async (/** @type {string} */ v) =>
    new Map(
      (await get(`/votacoes/${v}/votos`, `votos-${v}.json`)).map((/** @type {any} */ x) => [x.deputado_.id, x.tipoVoto])
    );
  const final = await votos(VOTACAO_FINAL);
  const primeiro = await votos(VOTACAO_1_TURNO);

  /** @type {Map<number, Set<number>>} id do deputado → emendas assinadas */
  const assinou = new Map();
  for (const [n, { id }] of Object.entries(EMENDAS))
    for (const a of await get(`/proposicoes/${id}/autores`, `autores-${id}.json`)) {
      const dep = idDe(a);
      if (dep === null) continue;
      if (!assinou.has(dep)) assinou.set(dep, new Set());
      assinou.get(dep)?.add(Number(n));
    }

  // Pedidos de retirada ligados à PEC, apresentados até o dia da votação.
  const relacionadas = await get(`/proposicoes/${PEC_6X1}/relacionadas`, 'relacionadas.json');
  const pedidos = relacionadas.filter((/** @type {any} */ r) => r.siglaTipo === 'REQ' && ehRetirada(r.ementa ?? ''));
  const detalhes = await mapLimitado(pedidos, 4, async (/** @type {any} */ r) => ({
    det: await get(`/proposicoes/${r.id}`, `req-${r.id}.json`),
    autores: await get(`/proposicoes/${r.id}/autores`, `req-${r.id}-autores.json`)
  }));
  /** @type {Array<{ req: string, id_camara: number, emendas: number[] }>} */
  const retiradas = [];
  for (const { det, autores } of detalhes) {
    if (det.dataApresentacao.slice(0, 10) > DATA_VOTACAO) continue;
    const req = `REQ ${det.numero}/${det.ano}`;
    const emendas = emendasDaRetirada(det.ementa);
    // Pedido sobre outra emenda (ex.: REQ 2872/2026, código CD269527608300): não mexe nas 1 e 2.
    if (emendas.length === 0 && codigosDe(det.ementa).some((c) => !CODIGOS_6X1.includes(c))) continue;
    if (emendas.length === 0) throw new Error(`${req} (${det.id}): a ementa não diz de qual emenda é a retirada: "${det.ementa}"`);
    for (const a of autores) {
      const dep = idDe(a);
      if (dep === null) continue;
      retiradas.push({ req, id_camara: dep, emendas });
      for (const e of emendas) assinou.get(dep)?.delete(e);
    }
  }

  const porId = new Map();
  for (const id of new Set([...emExercicio, ...assinou.keys()])) {
    const noMandato = emExercicio.has(id);
    porId.set(id, {
      final: noMandato ? tipoDeVoto(final.get(id)) : null,
      primeiro_turno: noMandato ? tipoDeVoto(primeiro.get(id)) : null,
      emendas: [...(assinou.get(id) ?? [])].sort()
    });
  }
  return { porId, retiradas };
}

/** Para quem não aparece em nenhuma das listas: não era deputado em 27/05/2026 nem assinou. */
export const SEM_REGISTRO_6X1 = Object.freeze({ final: null, primeiro_turno: null, emendas: [] });
