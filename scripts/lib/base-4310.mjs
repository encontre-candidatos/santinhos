// Apoio das três coletas da versão para o eleitor indeciso (03/10/2026): região em 2022
// (regiao.mjs), lado no governo em 2026 (governo.mjs) e PEC da Blindagem (blindagem.mjs).
// HTTP com cache em disco, repetição com espera exponencial e no máximo 6 pedidos simultâneos;
// paginação da API da Câmara; leitura em fluxo de CSV do TSE dentro de zip (`unzip -p`, latin1).
// O diretório de cache é escolhido por quem chama (`definirCache`); padrão: scripts/.cache/dados-4310.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
export let CACHE = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'dados-4310');

/** Troca o diretório de cache (zips do TSE e respostas da Câmara). */
export function definirCache(/** @type {string} */ dir) {
  CACHE = dir;
}

/** Ordena as chaves de objetos, recursivamente (listas mantêm a ordem). Pura. */
export function ordenarChaves(/** @type {any} */ v) {
  if (Array.isArray(v)) return v.map(ordenarChaves);
  if (v && typeof v === 'object') {
    /** @type {Record<string, unknown>} */
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = ordenarChaves(v[k]);
    return o;
  }
  return v;
}

/** Limitador de concorrência. */
export function limitador(/** @type {number} */ max) {
  let ativos = 0;
  /** @type {{ fn: () => Promise<any>, res: (v: any) => void, rej: (e: any) => void }[]} */
  const fila = [];
  const prox = () => {
    if (ativos >= max || !fila.length) return;
    ativos++;
    const { fn, res, rej } = /** @type {(typeof fila)[number]} */ (fila.shift());
    fn().then(res, rej).finally(() => {
      ativos--;
      prox();
    });
  };
  return (/** @type {() => Promise<any>} */ fn) => new Promise((res, rej) => {
    fila.push({ fn, res, rej });
    prox();
  });
}

const limite = limitador(6);
const espera = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON com cache em disco, até 6 tentativas (1 s, 2 s, 4 s...) e no máximo 6 simultâneos.
 * 4xx (fora 429) não se repete; com `aceita404`, 404 vira `{ dados: [], status404: true }`.
 * @param {string} url @param {{ cacheKey?: string, tentativas?: number, aceita404?: boolean }} [op]
 */
export async function getJson(url, { cacheKey, tentativas = 6, aceita404 = false } = {}) {
  const arq = join(CACHE, 'camara', (cacheKey ?? url.replace(/^https?:\/\/[^/]+\/api\/v2\//, '')).replace(/[^A-Za-z0-9._-]+/g, '_') + '.json');
  try {
    return JSON.parse(await readFile(arq, 'utf8'));
  } catch {
    /* sem cache: busca */
  }
  const corpo = await limite(async () => {
    /** @type {any} */
    let ultimo;
    for (let i = 0; i < tentativas; i++) {
      try {
        const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
        if (r.ok) return await r.json();
        if (r.status === 404 && aceita404) return { dados: [], status404: true };
        ultimo = new Error(`HTTP ${r.status} ${url}`);
        if (r.status >= 400 && r.status < 500 && r.status !== 429) throw ultimo;
      } catch (e) {
        ultimo = e;
        if (/HTTP 4(?!29)/.test(/** @type {Error} */ (e).message)) throw e;
      }
      await espera(1000 * 2 ** i);
    }
    throw ultimo;
  });
  await mkdir(dirname(arq), { recursive: true });
  await writeFile(arq, JSON.stringify(corpo), 'utf8');
  return corpo;
}

/** Segue a paginação da API da Câmara (links rel=next). */
export async function getTodas(/** @type {string} */ url) {
  const out = [];
  /** @type {string | undefined} */
  let u = url;
  while (u) {
    const j = await getJson(u);
    out.push(...j.dados);
    u = (j.links || []).find((/** @type {any} */ l) => l.rel === 'next')?.href;
  }
  return out;
}

/** Uma linha de CSV do TSE (';', aspas '"'). Pura. */
export function parseLinha(/** @type {string} */ l) {
  const out = [];
  let cur = '',
    q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) {
      if (c === '"') {
        if (l[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ';') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/**
 * Linhas (objetos pela cabeça) de um CSV latin1 dentro de zip, via `unzip -p`.
 * @param {string} zip @param {string} membro
 * @returns {AsyncGenerator<Record<string, string>>}
 */
export async function* linhasZip(zip, membro) {
  const p = spawn('unzip', ['-p', zip, membro]);
  p.stdout.setEncoding('latin1');
  const rl = createInterface({ input: p.stdout, crlfDelay: Infinity });
  /** @type {string[] | undefined} */
  let cab;
  for await (const l of rl) {
    if (!l) continue;
    const c = parseLinha(l);
    if (!cab) {
      cab = c;
      continue;
    }
    /** @type {Record<string, string>} */
    const o = {};
    cab.forEach((h, i) => {
      o[h] = c[i];
    });
    yield o;
  }
  if (!cab) throw new Error(`vazio: ${zip}:${membro}`);
}

export async function existe(/** @type {string} */ p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
