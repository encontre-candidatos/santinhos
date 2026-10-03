// Coleta dos deputados federais de MG em exercício na API de dados abertos da Câmara.
import { join } from 'node:path';
import { jsonComCache, mapLimitado } from './http.mjs';
import { contarMandatos, partidoNaPosse } from './cruzar.mjs';

export const API_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
export const LEGISLATURA = 57;
export const ENDPOINT_LISTA = `${API_CAMARA}/deputados?siglaUf=MG&idLegislatura=${LEGISLATURA}`;

/**
 * @param {{ cache: boolean, dirCache: string }} opcoes
 * @returns {Promise<Array<{ id: number, nomeCivil: string, nomeUrnaCamara: string,
 *   dataNascimento: string, cpf: string | null, partidoAtual: string, partido_posse: string,
 *   mandatos: number, condicao: 'titular' | 'suplente_em_exercicio', urlFoto: string | null,
 *   redeSocial: string[] }>>}
 */
export async function coletarCamara({ cache, dirCache }) {
  const dir = join(dirCache, 'camara');

  // 1. Lista paginada (a API repete o mesmo id quando há mais de um período na legislatura).
  const ids = new Set();
  for (let pagina = 1; ; pagina++) {
    const url = `${ENDPOINT_LISTA}&itens=100&pagina=${pagina}`;
    const j = await jsonComCache(url, join(dir, `lista-${pagina}.json`), cache);
    for (const d of j.dados) ids.add(d.id);
    const temProxima = (j.links ?? []).some((/** @type {any} */ l) => l.rel === 'next');
    if (!temProxima || j.dados.length === 0) break;
  }

  // 2 e 3. Detalhe e histórico, no máximo 4 requisições simultâneas.
  const deputados = await mapLimitado([...ids], 4, async (id) => {
    const det = (await jsonComCache(`${API_CAMARA}/deputados/${id}`, join(dir, `${id}.json`), cache)).dados;
    const hist = (
      await jsonComCache(`${API_CAMARA}/deputados/${id}/historico`, join(dir, `${id}-historico.json`), cache)
    ).dados;
    return { det, hist };
  });

  return deputados
    .filter(({ det }) => det.ultimoStatus?.situacao === 'Exercício')
    .map(({ det, hist }) => {
      const us = det.ultimoStatus;
      return {
        id: det.id,
        nomeCivil: det.nomeCivil,
        nomeUrnaCamara: us.nomeEleitoral || us.nome,
        dataNascimento: det.dataNascimento,
        cpf: /^\d{11}$/.test(det.cpf ?? '') ? det.cpf : null,
        partidoAtual: us.siglaPartido,
        partido_posse: partidoNaPosse(hist, LEGISLATURA) ?? us.siglaPartido,
        mandatos: contarMandatos(hist),
        condicao: /suplente/i.test(us.condicaoEleitoral ?? '') ? 'suplente_em_exercicio' : 'titular',
        urlFoto: us.urlFoto || null,
        redeSocial: det.redeSocial ?? []
      };
    });
}
