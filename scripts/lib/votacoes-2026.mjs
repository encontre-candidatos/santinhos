// Participação nas votações nominais do Plenário em 2026 (WP12, T058; FR-031 a FR-034).
// Dados Abertos da Câmara, coletados uma vez pelo `npm run base`:
//   - GET /votacoes?idOrgao=180, mês a mês (a API recusa intervalo longo), de 1/1/2026 à data
//     de conferência, paginado;
//   - GET /votacoes/{id}/votos de cada uma: lista vazia ou 404 = votação simbólica, fica de fora;
//   - GET /deputados?siglaUf=MG&dataInicio=D&dataFim=D de cada data com votação nominal.
// `total` = nominais em datas em que o candidato estava em exercício por MG; `votou` = dessas,
// em quantas ele aparece na lista de votos, com qualquer tipo de voto (abstenção e obstrução
// contam; ver a Limitação aceita da participação na spec). `total = 0` → null.
// A rede entra por parâmetro (montar-base.mjs passa jsonComCache e mapLimitado): este módulo
// não importa http.mjs, para os testes usarem as funções puras sem puxar o cliente HTTP.

export const ORGAO_PLENARIO = 180;
export const INICIO_2026 = '2026-01-01';

/**
 * Intervalos de um mês, de `inicio` até `fim` (AAAA-MM-DD), o último cortado em `fim`.
 * @param {string} inicio @param {string} fim @returns {Array<[string, string]>}
 */
export function mesesEntre(inicio, fim) {
  /** @type {Array<[string, string]>} */
  const saida = [];
  let [a, m] = inicio.split('-').map(Number);
  for (;;) {
    const primeiro = `${a}-${String(m).padStart(2, '0')}-01`;
    if (primeiro > fim) break;
    const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const ultimo = `${a}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    saida.push([primeiro < inicio ? inicio : primeiro, ultimo > fim ? fim : ultimo]);
    if (++m > 12) [a, m] = [a + 1, 1];
  }
  return saida;
}

/**
 * Conta votou/total de cada deputado.
 * @param {Array<{ id: string, data: string, votantes: Set<number> }>} nominais votações com lista de votos
 * @param {Map<string, Set<number>>} emExercicioPorData data → ids em exercício por MG
 * @param {Iterable<number>} ids deputados a contar
 * @returns {Map<number, { votou: number, total: number } | null>}
 */
export function contarParticipacao(nominais, emExercicioPorData, ids) {
  const saida = new Map();
  for (const id of ids) {
    let votou = 0;
    let total = 0;
    for (const v of nominais) {
      if (!emExercicioPorData.get(v.data)?.has(id)) continue;
      total++;
      if (v.votantes.has(id)) votou++;
    }
    saida.set(id, total === 0 ? null : { votou, total });
  }
  return saida;
}

/**
 * Votos registrados fora do período em exercício (não entram na conta; aparecem no relatório
 * para a conferência).
 * @param {Array<{ id: string, data: string, votantes: Set<number> }>} nominais
 * @param {Map<string, Set<number>>} emExercicioPorData
 * @param {Iterable<number>} ids
 */
export function votosForaDoExercicio(nominais, emExercicioPorData, ids) {
  const saida = [];
  for (const id of ids)
    for (const v of nominais)
      if (v.votantes.has(id) && !emExercicioPorData.get(v.data)?.has(id)) saida.push({ id_camara: id, votacao: v.id, data: v.data });
  return saida;
}

/** 404 só quer dizer "simbólica" na lista de votos; em qualquer outro endpoint derruba a coleta. */
const obrigatorio = (/** @type {any} */ j, /** @type {string} */ url) => {
  if (j === null) throw new Error(`HTTP 404 em ${url}`);
  return j;
};

/**
 * @typedef {{
 *   json: (url: string, arquivo: string) => Promise<any | null>,
 *   mapLimitado: <T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>) => Promise<R[]>
 * }} Rede
 * `json` devolve o JSON da URL (com cache em `arquivo`, relativo ao diretório do cache desta
 * coleta) ou null quando a API responde 404.
 */

/**
 * @param {Rede} rede
 * @param {{ api: string, fim: string, ids: number[] }} opcoes
 */
export async function coletarVotacoes2026(rede, { api, fim, ids }) {
  // 1. Votações do Plenário, mês a mês, paginadas.
  /** @type {Array<{ id: string, data: string, descricao: string }>} */
  const todas = [];
  for (const [ini, fimMes] of mesesEntre(INICIO_2026, fim))
    for (let pagina = 1; ; pagina++) {
      const url = `${api}/votacoes?idOrgao=${ORGAO_PLENARIO}&dataInicio=${ini}&dataFim=${fimMes}` +
        `&ordem=ASC&ordenarPor=dataHoraRegistro&itens=100&pagina=${pagina}`;
      // O fim do intervalo vai no nome: com --cache, o mês corrente não fica parado na data da coleta anterior.
      const j = obrigatorio(await rede.json(url, `lista-${ini}-${fimMes}-${pagina}.json`), url);
      for (const v of j.dados ?? []) todas.push({ id: v.id, data: v.data, descricao: v.descricao ?? '' });
      if (!(j.links ?? []).some((/** @type {any} */ l) => l.rel === 'next') || !j.dados?.length) break;
    }
  const unicas = [...new Map(todas.map((v) => [v.id, v])).values()];

  // 2. Lista de votos de cada uma; vazia ou 404 = simbólica.
  let com404 = 0;
  const votos = await rede.mapLimitado(unicas, 4, async (v) => {
    const j = await rede.json(`${api}/votacoes/${v.id}/votos`, `votos-${v.id}.json`);
    if (j === null) com404++;
    return new Set((j?.dados ?? []).map((/** @type {any} */ x) => x.deputado_.id));
  });
  const nominais = unicas
    .map((v, i) => ({ ...v, votantes: votos[i] }))
    .filter((v) => v.votantes.size > 0)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.id < b.id ? -1 : 1));

  // 3. Quem estava em exercício por MG em cada data com votação nominal.
  const datas = [...new Set(nominais.map((v) => v.data))].sort();
  const listas = await rede.mapLimitado(datas, 4, async (d) => {
    const url = `${api}/deputados?siglaUf=MG&dataInicio=${d}&dataFim=${d}&itens=100`;
    return obrigatorio(await rede.json(url, `em-exercicio-${d}.json`), url);
  });
  /** @type {Map<string, Set<number>>} */
  const emExercicioPorData = new Map(
    datas.map((d, i) => [d, new Set((listas[i].dados ?? []).map((/** @type {{ id: number }} */ x) => x.id))])
  );

  return {
    porId: contarParticipacao(nominais, emExercicioPorData, ids),
    foraDoExercicio: votosForaDoExercicio(nominais, emExercicioPorData, ids),
    periodo: { inicio: INICIO_2026, fim },
    totalPlenario: unicas.length,
    simbolicas404: com404,
    nominais: nominais.map(({ id, data, descricao }) => ({ id, data, descricao })),
    datas
  };
}

/** N de 0 a 10, como no app ($lib/formatar/participacao): 10 só com todas. */
export const nDe = (/** @type {{ votou: number, total: number }} */ v) =>
  v.votou === v.total ? 10 : Math.min(9, Math.round((v.votou / v.total) * 10));

/**
 * docs/conferencia-participacao.md (NFR-019), gerado pelo `npm run base`: não editar à mão.
 * @param {Awaited<ReturnType<typeof coletarVotacoes2026>>} p
 * @param {Array<{ id_camara: number, nome_urna: string, votacoes_2026: { votou: number, total: number } | null }>} candidatos
 * @param {string} hoje
 */
export function relatorioParticipacao(p, candidatos, hoje) {
  const br = (/** @type {string} */ d) => d.split('-').reverse().join('/');
  const ord = [...candidatos].sort((a, b) => a.nome_urna.localeCompare(b.nome_urna, 'pt-BR'));
  const com = ord.filter((c) => c.votacoes_2026);
  const abaixo = com.filter((c) => nDe(/** @type {any} */ (c.votacoes_2026)) <= 4);
  const nomeDe = new Map(candidatos.map((c) => [c.id_camara, c.nome_urna]));
  const linhas = [
    '# Conferência da participação nas votações de 2026 (NFR-019)',
    '',
    `Gerado por \`npm run base\` (scripts/lib/votacoes-2026.mjs) em ${br(hoje)}. Não editar à mão.`,
    '',
    `- Período: ${br(p.periodo.inicio)} a ${br(p.periodo.fim)}.`,
    `- Votações do Plenário (idOrgao=${ORGAO_PLENARIO}) no período: ${p.totalPlenario}.`,
    `- Nominais (com lista de votos): ${p.nominais.length}, em ${p.datas.length} dias. As outras ` +
      `${p.totalPlenario - p.nominais.length} são simbólicas: lista vazia ou 404 (${p.simbolicas404} com 404).`,
    `- Candidatos: ${candidatos.length}; com votações no mandato: ${com.length}; sem nenhuma (sem bolinhas): ` +
      `${ord.filter((c) => !c.votacoes_2026).map((c) => c.nome_urna).join(', ') || 'nenhum'}.`,
    `- Abaixo do corte de 5 em 10 (vermelho): ${abaixo.length} — ${abaixo.map((c) => c.nome_urna).join(', ') || 'nenhum'}.`,
    `- Votos registrados fora do período em exercício (fora da conta): ${p.foraDoExercicio.length}` +
      (p.foraDoExercicio.length
        ? ` — ${p.foraDoExercicio.map((f) => `${nomeDe.get(f.id_camara)} em ${f.votacao} (${br(f.data)})`).join('; ')}.`
        : '.'),
    '',
    '## Contagem por candidato',
    '',
    '`total` = votações nominais em datas em que o candidato estava em exercício por MG; `votou` = dessas, ' +
      'em quantas ele aparece na lista de votos, com qualquer tipo de voto. N = votou/total × 10, ' +
      'arredondado; 10 só com todas.',
    '',
    '| Candidato | id Câmara | Votou | Total | % | N em 10 |',
    '|---|---:|---:|---:|---:|---:|',
    ...ord.map((c) => {
      const v = c.votacoes_2026;
      return v
        ? `| ${c.nome_urna} | ${c.id_camara} | ${v.votou} | ${v.total} | ${((v.votou / v.total) * 100).toFixed(1).replace('.', ',')} | ${nDe(v)}${nDe(v) <= 4 ? ' (vermelho)' : ''} |`
        : `| ${c.nome_urna} | ${c.id_camara} | — | 0 | — | sem bolinhas |`;
    }),
    '',
    `## Votações nominais usadas (${p.nominais.length})`,
    '',
    '| Data | Votação | Descrição |',
    '|---|---|---|',
    ...p.nominais.map((v) => `| ${br(v.data)} | ${v.id} | ${v.descricao.replace(/\s+/g, ' ').replace(/\|/g, '/').trim()} |`),
    ''
  ];
  return linhas.join('\n');
}
