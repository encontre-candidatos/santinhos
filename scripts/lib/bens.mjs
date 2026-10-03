// Patrimônio declarado ao TSE no registro de 2026 (FR-014, NFR-009, C-008).
//
// Conferido em 02/10/2026 (T041): bem_candidato_2026.zip, um CSV por UF (latin1, ";", campos
// entre aspas), uma linha por bem, ligada por SQ_CANDIDATO; VR_BEM_CANDIDATO com vírgula
// decimal ("15000,00"). Daqui só saem total e contagem por candidato: descrição, tipo e valor de
// cada bem ficam no zip do cache, fora do git (C-008).
import { somarBens } from './somar-bens.mjs';
import { baixar, lerCsv } from './tse.mjs';

const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele';
export const ARQUIVO_BENS = {
  url: `${CDN}/bem_candidato/bem_candidato_2026.zip`,
  zip: 'bem_candidato_2026.zip',
  prefixo: 'bem_candidato_2026'
};
// Mesmo leiaute em 2022 (conferido em 02/10/2026, T046), ligado ao SQ_CANDIDATO de 2022.
export const ARQUIVO_BENS_2022 = {
  url: `${CDN}/bem_candidato/bem_candidato_2022.zip`,
  zip: 'bem_candidato_2022.zip',
  prefixo: 'bem_candidato_2022'
};

/**
 * @param {{ dirCache: string, atualizar: boolean, sqs: string[], arquivo?: typeof ARQUIVO_BENS }} opcoes
 */
export async function coletarBens({ dirCache, atualizar, sqs, arquivo = ARQUIVO_BENS }) {
  const arq = await baixar(arquivo, dirCache, atualizar);
  const porSq = somarBens(lerCsv(arq.caminho, `${arquivo.prefixo}_MG.csv`), sqs);
  return { porSq, fonte: { zip: arquivo.zip, modificado: arq.modificado } };
}
