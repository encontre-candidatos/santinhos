// Todos os candidatos a deputado federal por MG em 2026, e não só os que tentam a reeleição
// (FR-001 alterado, FR-036 a FR-040; WP13/T062).
//
// Os casados com a Câmara seguem como antes e ganham `reeleicao: true`; os demais entram com os
// campos da Câmara em null (data-model.md). Foto de quem não é deputado: pacote de fotos do TSE
// (foto_cand2026_MG_div.zip, ~6 KB por foto, conferido em 02/10/2026), copiada sem mudança para
// static/fotos/tse/<SQ>.jpg; essas não entram no pré-cache do PWA (NFR-022).
import AdmZip from 'adm-zip';
import { existsSync } from 'node:fs';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { baixar } from './tse.mjs';

export const ARQUIVO_FOTOS_2026 = {
  url: 'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_MG_div.zip',
  zip: 'foto_cand2026_MG_div.zip'
};

/**
 * @typedef {{ cargo: string, lugar: string, ano: number }} CargoAnterior
 * @typedef {{ sq: string, nomeCivil: string, nomeUrna: string, numero: string, partido: string, situacao: string, cpf: string | null }} Candidatura
 */

/**
 * Registro de quem não é deputado em exercício: o que só existe para deputado fica null.
 * @param {Candidatura} c
 * @param {{ foto: string | null, instagram: string | null, url_divulgacand: string, patrimonio_total: number | null, patrimonio_itens: number, patrimonio_2022: number | null, patrimonio_anterior: { ano: number, valor: number, fator_ipca: number } | null, cargos_anteriores: CargoAnterior[] }} extra
 */
export function registroNaoDeputado(c, extra) {
  return {
    id_camara: null,
    sq_candidato: c.sq,
    nome_urna: c.nomeUrna,
    nome_civil: c.nomeCivil,
    numero_urna: c.numero,
    partido: c.partido,
    partido_posse: null,
    condicao: null,
    mandatos: 0,
    situacao_candidatura: c.situacao,
    foto: extra.foto,
    instagram: extra.instagram,
    url_camara: null,
    url_divulgacand: extra.url_divulgacand,
    patrimonio_total: extra.patrimonio_total,
    patrimonio_itens: extra.patrimonio_itens,
    patrimonio_2022: extra.patrimonio_2022,
    patrimonio_anterior: extra.patrimonio_anterior,
    voto_6x1: null,
    votacoes_2026: null,
    // Preenchido pelo montador para quem já foi deputado federal (FR-070; WP18).
    votacoes_mandato_anterior: null,
    reeleicao: false,
    cargos_anteriores: extra.cargos_anteriores
  };
}

/**
 * Contagens do relatório: reeleição, já teve cargo (sem reeleição), nunca teve (ocultos).
 * @param {Array<{ reeleicao: boolean, cargos_anteriores: CargoAnterior[] }>} candidatos
 */
export function contarTodos(candidatos) {
  const reeleicao = candidatos.filter((c) => c.reeleicao).length;
  const ocultos = candidatos.filter((c) => !c.reeleicao && c.cargos_anteriores.length === 0).length;
  return { total: candidatos.length, reeleicao, jaTeveCargo: candidatos.length - reeleicao - ocultos, ocultos, visiveis: candidatos.length - ocultos };
}

/**
 * Extrai do pacote do TSE as fotos dos SQs pedidos para static/fotos/tse/<SQ>.jpg e apaga as que
 * sobraram de bases antigas. Devolve SQ → caminho relativo a static/ (null quando o pacote não tem).
 * @param {{ dirCache: string, atualizar: boolean, dirFotos: string, sqs: string[] }} opcoes
 */
export async function extrairFotosTSE({ dirCache, atualizar, dirFotos, sqs }) {
  const { caminho, modificado } = await baixar(ARQUIVO_FOTOS_2026, dirCache, atualizar);
  const destino = join(dirFotos, 'tse');
  await mkdir(destino, { recursive: true });
  /** @type {Map<string, import('adm-zip').IZipEntry>} */
  const porSq = new Map();
  for (const e of new AdmZip(caminho).getEntries()) {
    const m = /^F[A-Z]{2}(\d+)_div\.jpe?g$/i.exec(e.entryName);
    if (m) porSq.set(m[1], e);
  }
  /** @type {Map<string, string | null>} */
  const fotos = new Map();
  for (const sq of sqs) {
    const e = porSq.get(sq);
    if (!e) {
      fotos.set(sq, null);
      continue;
    }
    const arq = join(destino, `${sq}.jpg`);
    if (!existsSync(arq) || atualizar) await writeFile(arq, e.getData());
    fotos.set(sq, `fotos/tse/${sq}.jpg`);
  }
  const manter = new Set(sqs.map((sq) => `${sq}.jpg`));
  for (const f of await readdir(destino)) if (!manter.has(f)) await unlink(join(destino, f));
  return { fotos, fonte: { zip: ARQUIVO_FOTOS_2026.zip, modificado } };
}
