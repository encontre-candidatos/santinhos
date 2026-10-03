// PEC da Blindagem (versão 4310, 03/10/2026): voto de cada deputado na PEC 3/2021, Plenário,
// 1º turno (2270800-135) e 2º turno (2270800-160), 16/09/2025. API Dados Abertos da Câmara.
// "sim"/"nao": tipoVoto Sim/Não; "ausente": em exercício na data e sem Sim/Não (abstenção cai
// aqui); null: fora do exercício (último evento do histórico até a data com situação ≠ Exercício).
import { CAMARA, getJson } from './base-4310.mjs';

export const PEC_BLINDAGEM = 2270800;
export const VOTACOES_BLINDAGEM = { t1: '2270800-135', t2: '2270800-160' };

/** Em exercício no dia (AAAA-MM-DD), pelo /deputados/{id}/historico? Pura. */
export function emExercicio(/** @type {{ dataHora: string, situacao: string }[]} */ historico, /** @type {string} */ dia) {
  const ev = historico
    .filter((h) => h.dataHora && h.dataHora.slice(0, 10) <= dia && h.situacao)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  return ev.length ? ev[ev.length - 1].situacao === 'Exercício' : false;
}

/** Classifica um voto. Pura. */
export function classificar(/** @type {Map<number, string>} */ votosPorId, /** @type {number} */ id, /** @type {boolean} */ exercia) {
  const v = votosPorId.get(id);
  if (v === 'Sim') return 'sim';
  if (v === 'Não') return 'nao';
  if (v !== undefined) return 'ausente';
  return exercia ? 'ausente' : null;
}

/** @param {number[]} ids */
export async function montarBlindagem(ids) {
  /** @type {Record<string, { dia: string, votos: Map<number, string> }>} */
  const turnos = {};
  for (const [t, id] of Object.entries(VOTACOES_BLINDAGEM)) {
    const det = (await getJson(`${CAMARA}/votacoes/${id}`)).dados;
    const votos = (await getJson(`${CAMARA}/votacoes/${id}/votos`)).dados;
    turnos[t] = { dia: det.data, votos: new Map(votos.map((/** @type {any} */ v) => [v.deputado_.id, v.tipoVoto])) };
  }
  /** @type {Map<number, { t1: string | null, t2: string | null }>} */
  const porId = new Map();
  for (const id of ids) {
    const hist = (await getJson(`${CAMARA}/deputados/${id}/historico`)).dados;
    /** @type {any} */
    const r = {};
    for (const [t, { dia, votos }] of Object.entries(turnos)) r[t] = classificar(votos, id, emExercicio(hist, dia));
    porId.set(id, r);
  }
  return { porId, dias: [turnos.t1.dia, turnos.t2.dia] };
}
