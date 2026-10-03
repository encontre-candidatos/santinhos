// Montagem dos links de fonte, num só lugar.
//
// DivulgaCandContas, conferido em 30/09/2026 (T008): a rota da página do candidato no
// aplicativo é `#/candidato/:regiao/:uf/:eleicaoID/:candidatoID/:ano/:sgUe` (bundle
// 829.*.js do site), e o código da eleição geral de 2026 é 20322002026 (API
// /divulga/rest/v1/candidatura/buscar/2026/<UF>/20322002026/candidato/<SQ>). Para cargo
// estadual, sgUe é a própria UF. Em 2022 o código era 2040602022 — muda a cada eleição.
export const ELEICAO_DIVULGACAND_2026 = '20322002026';

/** @param {number} id */
export const urlCamara = (id) => `https://www.camara.leg.br/deputados/${id}`;

/** @param {string} sq */
export const urlDivulgaCand = (sq) =>
  `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/SUDESTE/MG/${ELEICAO_DIVULGACAND_2026}/${sq}/2026/MG`;

/** Foto oficial do parlamentar na Câmara. @param {number} id */
export const urlFoto = (id) => `https://www.camara.leg.br/internet/deputado/bandep/${id}.jpg`;
