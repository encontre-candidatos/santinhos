// Votações-chave do Raio-X da reeleição (03/10/2026): PL da Devastação e Reforma tributária.
// Mesma regra da PEC da Blindagem (blindagem.mjs): voto nominal do Plenário na API Dados Abertos
// da Câmara; "sim"/"nao" = tipoVoto Sim/Não; "ausente" = em exercício na data sem Sim/Não
// (abstenção e obstrução caem aqui); null = fora do exercício na data.
// Os ids das votações são os da página "Raio-X da reeleição" (static/raio-x, branch
// raio-x-publicar), conferidos em 03/10/2026: os votos destas votações reproduzem os campos
// `dv` e `rt` dela nos 48 deputados (48 de 48).
//  - PL 2159/2021 (licenciamento ambiental, "PL da Devastação"), 17/07/2025 de madrugada
//    (data da sessão 16/07/2025): 257161-454, "Aprovadas" as Emendas do Senado com parecer
//    favorável (Sim 267, Não 116).
//  - PEC 45/2019 (Reforma tributária): 1º turno 2196833-326 (06/07/2023) e 2º turno
//    2196833-373 (07/07/2023, registrada à 01h39), substitutivo da Comissão Especial.
import { CAMARA, getJson } from './base-4310.mjs';
import { classificar, emExercicio } from './blindagem.mjs';

export const PL_DEVASTACAO = 257161;
export const VOTACAO_DEVASTACAO = '257161-454';
export const PEC_REFORMA = 2196833;
export const VOTACOES_REFORMA = { t1: '2196833-326', t2: '2196833-373' };

/**
 * Voto de cada deputado em cada votação pedida (chave → id da votação).
 * @template {string} K
 * @param {Record<K, string>} votacoes @param {number[]} ids
 * @returns {Promise<{ porId: Map<number, Record<K, 'sim' | 'nao' | 'ausente' | null>>, dias: Record<K, string> }>}
 */
export async function montarVotos(votacoes, ids) {
  /** @type {Record<string, { dia: string, votos: Map<number, string> }>} */
  const por = {};
  for (const [k, id] of Object.entries(votacoes)) {
    const det = (await getJson(`${CAMARA}/votacoes/${id}`)).dados;
    const votos = (await getJson(`${CAMARA}/votacoes/${id}/votos`)).dados;
    por[k] = { dia: det.data, votos: new Map(votos.map((/** @type {any} */ v) => [v.deputado_.id, v.tipoVoto])) };
  }
  /** @type {Map<number, any>} */
  const porId = new Map();
  for (const id of ids) {
    const hist = (await getJson(`${CAMARA}/deputados/${id}/historico`)).dados;
    /** @type {any} */
    const r = {};
    for (const [k, { dia, votos }] of Object.entries(por)) r[k] = classificar(votos, id, emExercicio(hist, dia));
    porId.set(id, r);
  }
  /** @type {any} */
  const dias = Object.fromEntries(Object.entries(por).map(([k, v]) => [k, v.dia]));
  return { porId, dias };
}

/** PL da Devastação (um voto) e Reforma tributária (dois turnos), por id da Câmara. */
export async function montarVotacoesChave(/** @type {number[]} */ ids) {
  const dev = await montarVotos({ v: VOTACAO_DEVASTACAO }, ids);
  const ref = await montarVotos(VOTACOES_REFORMA, ids);
  /** @type {Map<number, { devastacao: 'sim' | 'nao' | 'ausente' | null, reforma_tributaria: { t1: any, t2: any } }>} */
  const porId = new Map();
  for (const id of ids) porId.set(id, { devastacao: dev.porId.get(id)?.v ?? null, reforma_tributaria: /** @type {any} */ (ref.porId.get(id)) });
  return { porId, dias: { devastacao: dev.dias.v, reforma: [ref.dias.t1, ref.dias.t2] } };
}
