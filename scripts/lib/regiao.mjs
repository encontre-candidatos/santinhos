// Onde cada candidato de 2026 a deputado federal por MG foi forte em 2022 (versão 4310, 03/10/2026).
// Fonte: TSE, votacao_candidato_munzona_2022 (MG), zonas somadas por município, campo
// QT_VOTOS_NOMINAIS_VALIDOS (voto contado oficialmente). Ligação 2026 → 2022 pelo CPF, só em
// memória: nenhum CPF é gravado (C-006). Posição por município entre todos os candidatos a
// deputado federal por MG em 2022 com voto; empate divide a posição (1, 1, 3). `top` guarda só
// os municípios em que ficou entre os TOP_N primeiros, com voto > 0.
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { CACHE, existe, linhasZip } from './base-4310.mjs';

export const URL_MUNZONA = 'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip';
export const URL_CAND = (/** @type {number} */ ano) => `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}.zip`;
export const CAMPO_VOTOS = 'QT_VOTOS_NOMINAIS_VALIDOS';
export const TOP_N = 10;

const MINUSC = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'd']);
/** "SÃO JOÃO DEL REI" → "São João del Rei". Pura. */
export function tituloMunicipio(/** @type {string} */ s) {
  return s
    .toLowerCase()
    .split(' ')
    .map((p, i) =>
      p
        .split('-')
        .map((q, j) => {
          const [a, ...resto] = q.split("'");
          const cab = (i === 0 && j === 0) || !MINUSC.has(a) ? a.charAt(0).toUpperCase() + a.slice(1) : a;
          return [cab, ...resto.map((r) => r.charAt(0).toUpperCase() + r.slice(1))].join("'");
        })
        .join('-')
    )
    .join(' ');
}

const ehDepFed = (/** @type {Record<string, string>} */ r) => r.DS_CARGO?.toUpperCase() === 'DEPUTADO FEDERAL';

/**
 * votos: Map(sq2022 → Map(cd → n)) → Map(sq2022 → { total, top: { cd: [votos, posição] } }). Pura.
 * @param {Map<string, Map<string, number>>} votos
 */
export function ranquear(votos) {
  /** @type {Map<string, [string, number][]>} */
  const porMun = new Map();
  for (const [sq, m] of votos)
    for (const [cd, n] of m) {
      if (!porMun.has(cd)) porMun.set(cd, []);
      /** @type {[string, number][]} */ (porMun.get(cd)).push([sq, n]);
    }
  /** @type {Map<string, { total: number, top: Record<string, [number, number]> }>} */
  const res = new Map();
  for (const [sq, m] of votos) res.set(sq, { total: [...m.values()].reduce((a, b) => a + b, 0), top: {} });
  for (const [cd, lista] of porMun) {
    lista.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    let pos = 0;
    lista.forEach(([sq, n], i) => {
      if (i === 0 || n !== lista[i - 1][1]) pos = i + 1;
      if (pos <= TOP_N && n > 0) /** @type {any} */ (res.get(sq)).top[cd] = [n, pos];
    });
  }
  return res;
}

async function zipLocal(/** @type {string} */ nome, /** @type {string} */ url, /** @type {string[]} */ alternativos) {
  for (const a of alternativos) if (await existe(a)) return a;
  const dst = join(CACHE, nome);
  if (!(await existe(dst))) {
    await mkdir(CACHE, { recursive: true });
    const r = spawnSync('curl', ['-sSL', '--retry', '5', '--retry-delay', '5', '-o', dst, url], { stdio: 'inherit' });
    if (r.status) throw new Error(`download falhou: ${url}`);
  }
  return dst;
}

/**
 * Monta { municipios, por_sq2026 }. `alternativos` = zips de candidatos já baixados (por ano).
 * @param {{ alternativos?: Record<number, string[]> }} [op]
 */
export async function montarRegiao({ alternativos = {} } = {}) {
  const zMun = await zipLocal('votacao_candidato_munzona_2022.zip', URL_MUNZONA, []);
  const z22 = await zipLocal('consulta_cand_2022.zip', URL_CAND(2022), alternativos[2022] ?? []);
  const z26 = await zipLocal('consulta_cand_2026.zip', URL_CAND(2026), alternativos[2026] ?? []);

  const cpf26 = new Map(); // sq2026 → cpf (só em memória)
  for await (const r of linhasZip(z26, 'consulta_cand_2026_MG.csv')) if (ehDepFed(r)) cpf26.set(r.SQ_CANDIDATO, r.NR_CPF_CANDIDATO);
  /** @type {Map<string, string[]>} */
  const sq22porCpf = new Map();
  for await (const r of linhasZip(z22, 'consulta_cand_2022_MG.csv'))
    if (ehDepFed(r)) {
      if (!sq22porCpf.has(r.NR_CPF_CANDIDATO)) sq22porCpf.set(r.NR_CPF_CANDIDATO, []);
      /** @type {string[]} */ (sq22porCpf.get(r.NR_CPF_CANDIDATO)).push(r.SQ_CANDIDATO);
    }
  /** @type {Map<string, Map<string, number>>} */
  const votos = new Map();
  const nomes = new Map();
  for await (const r of linhasZip(zMun, 'votacao_candidato_munzona_2022_MG.csv')) {
    if (!nomes.has(r.CD_MUNICIPIO)) nomes.set(r.CD_MUNICIPIO, r.NM_MUNICIPIO);
    if (!ehDepFed(r) || r.NR_TURNO !== '1') continue;
    const n = parseInt(r[CAMPO_VOTOS], 10);
    if (!votos.has(r.SQ_CANDIDATO)) votos.set(r.SQ_CANDIDATO, new Map());
    const m = /** @type {Map<string, number>} */ (votos.get(r.SQ_CANDIDATO));
    m.set(r.CD_MUNICIPIO, (m.get(r.CD_MUNICIPIO) ?? 0) + n);
  }
  const rank = ranquear(votos);

  /** @type {Record<string, { total: number, top: Record<string, [number, number]> }>} */
  const por_sq2026 = {};
  for (const [sq26, cpf] of cpf26) {
    const sqs = (sq22porCpf.get(cpf) ?? []).filter((s) => rank.has(s));
    if (!sqs.length) continue;
    // Mais de um registro de 2022 com voto: fica o de maior total.
    sqs.sort((a, b) => /** @type {any} */ (rank.get(b)).total - /** @type {any} */ (rank.get(a)).total);
    por_sq2026[sq26] = /** @type {any} */ (rank.get(sqs[0]));
  }
  const municipios = [...nomes]
    .map(([cd, n]) => ({ cd, nome: tituloMunicipio(n) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.cd.localeCompare(b.cd));
  return { municipios, por_sq2026, fonte: URL_MUNZONA };
}
