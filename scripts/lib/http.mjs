// Requisições com limite de concorrência, repetição em 429/5xx e cache em disco.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const espera = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Executa `fn` sobre cada item com no máximo `limite` chamadas simultâneas, preservando a ordem.
 * @template T, R
 * @param {readonly T[]} itens @param {number} limite @param {(item: T, i: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapLimitado(itens, limite, fn) {
  const saida = new Array(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const i = proximo++;
      saida[i] = await fn(itens[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return saida;
}

/**
 * fetch com até 3 repetições (espera crescente) em 429, 5xx ou erro de rede.
 * @param {string} url @param {RequestInit} [opcoes]
 */
export async function buscar(url, opcoes = {}) {
  let ultimoErro;
  for (let tentativa = 0; tentativa <= 3; tentativa++) {
    if (tentativa > 0) await espera(1000 * 2 ** (tentativa - 1));
    try {
      const r = await fetch(url, opcoes);
      if (r.status === 429 || r.status >= 500) {
        ultimoErro = new Error(`HTTP ${r.status} em ${url}`);
        continue;
      }
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} em ${url}`), { definitivo: true });
      return r;
    } catch (e) {
      if (/** @type {any} */ (e).definitivo) throw e;
      ultimoErro = e;
    }
  }
  throw ultimoErro;
}

/**
 * JSON de `url`, guardado em `arquivoCache`. Com `usarCache`, lê do disco quando existir.
 * @param {string} url @param {string} arquivoCache @param {boolean} usarCache
 */
export async function jsonComCache(url, arquivoCache, usarCache) {
  if (usarCache) {
    try {
      return JSON.parse(await readFile(arquivoCache, 'utf8'));
    } catch {
      /* sem cache: busca */
    }
  }
  const r = await buscar(url, { headers: { Accept: 'application/json' } });
  const json = await r.json();
  await mkdir(dirname(arquivoCache), { recursive: true });
  await writeFile(arquivoCache, JSON.stringify(json));
  return json;
}
