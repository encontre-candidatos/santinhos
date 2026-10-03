// Coleta das candidaturas de 2026 nos arquivos de dados abertos do TSE.
//
// Conferido em 30/09/2026 (T008): desde 2024 o TSE divide o registro em dois arquivos.
// - consulta_cand_2026.zip: identificação (SQ, nomes, número, partido, cargo, UF, nascimento,
//   CPF sem máscara). DS_SITUACAO_CANDIDATURA vem "#NE" em todas as linhas.
// - consulta_cand_complementar_2026.zip: situação (DS_SITUACAO_JULGAMENTO,
//   DS_SITUACAO_CANDIDATO_TOT, DS_DETALHE_SITUACAO_CAND — este último "#NE"), ligada por SQ_CANDIDATO.
// Ambos em latin1, separador ";", campos entre aspas.
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buscar } from './http.mjs';
import { dataBr, primeiroValor } from './cruzar.mjs';

const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
export const ARQUIVOS_TSE = {
  cand: { url: `${CDN}/consulta_cand/consulta_cand_2026.zip`, zip: 'consulta_cand_2026.zip', prefixo: 'consulta_cand_2026' },
  compl: {
    url: `${CDN}/consulta_cand_complementar/consulta_cand_complementar_2026.zip`,
    zip: 'consulta_cand_complementar_2026.zip',
    prefixo: 'consulta_cand_complementar_2026'
  },
  redes: { url: `${CDN}/consulta_cand/rede_social_candidato_2026.zip`, zip: 'rede_social_candidato_2026.zip', prefixo: 'rede_social_candidato_2026' }
};

// Conferido em 02/10/2026 (T046): em 2022 o registro ainda vinha num arquivo só, uma linha por
// candidatura, com NR_CPF_CANDIDATO; 1.103 linhas de DEPUTADO FEDERAL em MG, um CPF por linha.
export const ARQUIVO_CAND_2022 = {
  url: `${CDN}/consulta_cand/consulta_cand_2022.zip`,
  zip: 'consulta_cand_2022.zip',
  prefixo: 'consulta_cand_2022'
};

/**
 * Baixa o zip se faltar (ou sempre, com `atualizar`) e devolve caminho e data de modificação na fonte.
 * @param {{ url: string, zip: string }} arq @param {string} dirCache @param {boolean} atualizar
 */
export async function baixar(arq, dirCache, atualizar) {
  const caminho = join(dirCache, arq.zip);
  const meta = caminho + '.meta.json';
  if (atualizar || !existsSync(caminho)) {
    const r = await buscar(arq.url);
    await mkdir(dirCache, { recursive: true });
    await writeFile(caminho, Buffer.from(await r.arrayBuffer()));
    await writeFile(meta, JSON.stringify({ lastModified: r.headers.get('last-modified') }));
  }
  /** @type {string | null} */
  let modificado = null;
  try {
    modificado = JSON.parse(readFileSync(meta, 'utf8')).lastModified;
  } catch {
    // Sem o registro do cabeçalho: vale a data do arquivo local (download).
    modificado = statSync(caminho).mtime.toUTCString();
  }
  return { caminho, modificado: modificado ? new Date(modificado).toISOString() : null };
}

/**
 * Linhas de um CSV do zip (latin1, ";").
 * @param {string} caminhoZip @param {string} nomeEntrada
 */
export function lerCsv(caminhoZip, nomeEntrada) {
  const entrada = new AdmZip(caminhoZip).getEntry(nomeEntrada);
  if (!entrada) throw new Error(`${nomeEntrada} não está em ${caminhoZip}`);
  const texto = new TextDecoder('latin1').decode(entrada.getData());
  return /** @type {Record<string, string>[]} */ (parse(texto, { delimiter: ';', columns: true, relax_quotes: true }));
}

/**
 * @param {{ dirCache: string, atualizar: boolean }} opcoes
 */
export async function coletarTSE({ dirCache, atualizar }) {
  const cand = await baixar(ARQUIVOS_TSE.cand, dirCache, atualizar);
  const compl = await baixar(ARQUIVOS_TSE.compl, dirCache, atualizar);

  const complPorSq = new Map(
    lerCsv(compl.caminho, `${ARQUIVOS_TSE.compl.prefixo}_MG.csv`).map((l) => [l.SQ_CANDIDATO, l])
  );
  const linhasMG = lerCsv(cand.caminho, `${ARQUIVOS_TSE.cand.prefixo}_MG.csv`);

  const candidaturas = linhasMG
    .filter((l) => l.SG_UF === 'MG' && l.DS_CARGO === 'DEPUTADO FEDERAL')
    .map((l) => {
      const c = complPorSq.get(l.SQ_CANDIDATO) ?? {};
      return {
        sq: l.SQ_CANDIDATO,
        nomeCivil: l.NM_CANDIDATO,
        nomeUrna: l.NM_URNA_CANDIDATO,
        numero: l.NR_CANDIDATO.padStart(4, '0'),
        partido: l.SG_PARTIDO,
        dataNascimento: dataBr(l.DT_NASCIMENTO),
        cpf: /^\d{11}$/.test(l.NR_CPF_CANDIDATO) ? l.NR_CPF_CANDIDATO : null,
        // Para o feminino do cargo anterior ("Já foi prefeita", WP13).
        genero: l.DS_GENERO ?? null,
        situacao:
          primeiroValor(
            c.DS_DETALHE_SITUACAO_CAND,
            c.DS_SITUACAO_CANDIDATO_TOT,
            c.DS_SITUACAO_JULGAMENTO,
            l.DS_SITUACAO_CANDIDATURA
          ) ?? 'SITUAÇÃO NÃO INFORMADA PELO TSE'
      };
    });

  // Arquivo nacional: nome dos partidos por extenso e candidaturas a outros cargos
  // (motivo de quem não concorre a deputado federal por MG).
  const brasil = lerCsv(cand.caminho, `${ARQUIVOS_TSE.cand.prefixo}_BRASIL.csv`);
  /** @type {Map<string, string>} */
  const nomesPartidos = new Map();
  for (const l of brasil) if (l.SG_PARTIDO && !nomesPartidos.has(l.SG_PARTIDO)) nomesPartidos.set(l.SG_PARTIDO, l.NM_PARTIDO);
  const outrasCandidaturas = brasil
    .filter((l) => !(l.SG_UF === 'MG' && l.DS_CARGO === 'DEPUTADO FEDERAL'))
    .map((l) => ({
      cpf: /^\d{11}$/.test(l.NR_CPF_CANDIDATO) ? l.NR_CPF_CANDIDATO : null,
      cargo: l.DS_CARGO,
      uf: l.SG_UF
    }))
    .filter((o) => o.cpf);

  // Redes sociais registradas pelo candidato (texto livre, uma linha por endereço).
  const redes = await baixar(ARQUIVOS_TSE.redes, dirCache, atualizar);
  /** @type {Map<string, string[]>} */
  const redesPorSq = new Map();
  for (const l of lerCsv(redes.caminho, `${ARQUIVOS_TSE.redes.prefixo}_MG.csv`)) {
    const lista = redesPorSq.get(l.SQ_CANDIDATO) ?? [];
    lista.push(l.DS_URL);
    redesPorSq.set(l.SQ_CANDIDATO, lista);
  }

  return {
    candidaturas,
    redesPorSq,
    nomesPartidos,
    outrasCandidaturas,
    fonte: { zip: ARQUIVOS_TSE.cand.zip, zipComplementar: ARQUIVOS_TSE.compl.zip, modificado: cand.modificado, modificadoComplementar: compl.modificado, zipRedes: ARQUIVOS_TSE.redes.zip, modificadoRedes: redes.modificado }
  };
}

/**
 * SQ_CANDIDATO da candidatura a deputado federal por MG em 2022, por CPF (FR-015).
 * O mapa só vive em memória: o CPF não sai daqui para arquivo versionado (C-006).
 * @param {{ dirCache: string, atualizar: boolean }} opcoes
 */
export async function coletarTSE2022({ dirCache, atualizar }) {
  const arq = await baixar(ARQUIVO_CAND_2022, dirCache, atualizar);
  /** @type {Map<string, string>} */
  const sqPorCpf = new Map();
  for (const l of lerCsv(arq.caminho, `${ARQUIVO_CAND_2022.prefixo}_MG.csv`)) {
    if (l.SG_UF !== 'MG' || l.DS_CARGO !== 'DEPUTADO FEDERAL' || !/^\d{11}$/.test(l.NR_CPF_CANDIDATO)) continue;
    if (sqPorCpf.has(l.NR_CPF_CANDIDATO)) throw new Error(`2022: mais de uma candidatura a deputado federal por MG com o mesmo CPF (SQ ${l.SQ_CANDIDATO})`);
    sqPorCpf.set(l.NR_CPF_CANDIDATO, l.SQ_CANDIDATO);
  }
  return { sqPorCpf, fonte: { zip: ARQUIVO_CAND_2022.zip, modificado: arq.modificado } };
}
