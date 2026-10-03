// Lado no governo (versão 4310, 03/10/2026): quanto cada deputado votou igual à orientação do
// Governo nas votações nominais do Plenário em 2026. API Dados Abertos da Câmara:
// /votacoes mês a mês (o ano inteiro devolve HTTP 400), /votacoes/{id}/votos (lista vazia =
// simbólica; 404 = inexistente) e /votacoes/{id}/orientacoes, rótulo `siglaPartidoBloco` = "Governo".
// total = votações em que o Governo orientou Sim/Não E o deputado votou Sim/Não; com = votou igual.
// null quando total = 0.
import { CAMARA, getJson, getTodas } from './base-4310.mjs';

export const INICIO = '2026-01-01';
export const ID_PLENARIO = 180;
export const ROTULO_GOVERNO = 'Governo';

/** Janelas mensais [ini, fim] que cobrem [inicio, fim]. Pura. */
export function janelasMensais(/** @type {string} */ inicio, /** @type {string} */ fim) {
  const out = [];
  let [a, m] = inicio.split('-').map(Number);
  while (true) {
    const ini = `${a}-${String(m).padStart(2, '0')}-01`;
    if (ini > fim) break;
    const ult = new Date(Date.UTC(a, m, 0)).getUTCDate();
    let f = `${a}-${String(m).padStart(2, '0')}-${ult}`;
    if (f > fim) f = fim;
    out.push([ini < inicio ? inicio : ini, f]);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return out;
}

/** Orientação do Governo, "Sim"/"Não", ou null. Pura. */
export function orientacaoGoverno(/** @type {{ siglaPartidoBloco: string, orientacaoVoto: string }[]} */ orientacoes) {
  const o = orientacoes.find((x) => x.siglaPartidoBloco === ROTULO_GOVERNO);
  return o && (o.orientacaoVoto === 'Sim' || o.orientacaoVoto === 'Não') ? o.orientacaoVoto : null;
}

/**
 * Conta por deputado. votacoes = [{ gov, votos: Map(id → tipoVoto) }]. Pura.
 * @param {{ gov: string | null, votos: Map<number, string> }[]} votacoes @param {number[]} ids
 */
export function contarGoverno(votacoes, ids) {
  /** @type {Record<number, { com: number, total: number } | null>} */
  const out = {};
  for (const id of ids) {
    let com = 0,
      total = 0;
    for (const { gov, votos } of votacoes) {
      const v = votos.get(id);
      if (!gov || (v !== 'Sim' && v !== 'Não')) continue;
      total++;
      if (v === gov) com++;
    }
    out[id] = total ? { com, total } : null;
  }
  return out;
}

/** @param {number[]} ids @param {string} fim AAAA-MM-DD */
export async function montarGoverno(ids, fim) {
  const lista = [];
  for (const [i, f] of janelasMensais(INICIO, fim))
    lista.push(...(await getTodas(`${CAMARA}/votacoes?dataInicio=${i}&dataFim=${f}&idOrgao=${ID_PLENARIO}&itens=200&ordem=ASC&ordenarPor=dataHoraRegistro`)));
  const unicas = [...new Map(lista.filter((v) => v.siglaOrgao === 'PLEN').map((v) => [v.id, v])).values()];
  const det = await Promise.all(
    unicas.map(async (v) => {
      const rv = await getJson(`${CAMARA}/votacoes/${v.id}/votos`, { aceita404: true });
      if (rv.status404 || !rv.dados.length) return null;
      const ori = (await getJson(`${CAMARA}/votacoes/${v.id}/orientacoes`)).dados;
      return { gov: orientacaoGoverno(ori), votos: new Map(rv.dados.map((/** @type {any} */ x) => [x.deputado_.id, x.tipoVoto])) };
    })
  );
  const nominais = /** @type {{ gov: string | null, votos: Map<number, string> }[]} */ (det.filter(Boolean));
  return { porId: contarGoverno(nominais, ids), nominais: nominais.length, comOrientacao: nominais.filter((v) => v.gov).length };
}
