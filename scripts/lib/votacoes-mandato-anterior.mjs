// Participação de quem já foi deputado federal, no último mandato (WP18, T081; FR-070 a FR-073).
//
// Medido em 03/10/2026 (research/medicao-mandato-anterior-2026-10-03.md): os arquivos anuais dos
// Dados Abertos (votacoes-<ano>.csv, votacoesVotos-<ano>.csv) não têm todas as votações nominais:
// em 2003–2006, cerca de metade das que a página do deputado lista; em 2015–2018, 92%; em
// 2019–2022, 99%. A fonte das votações é por isso a lista "Votações nominais em Plenário" da
// página de cada deputado na Câmara (camara.leg.br/deputados/{id}/votacoes-nominais-plenario/{ano}),
// a mesma contra a qual a NFR-043 confere. Uma página por deputado e ano, 44 no total.
//
// Para cada candidato de 2026 fora do mandato e já eleito deputado federal (cargos_anteriores):
//   - vale o mandato mais recente (`ano` da eleição; período ano+1 a ano+4, legislatura
//     51 + (ano − 1998) / 4);
//   - ligação (FR-072): GET /deputados?idLegislatura=L&siglaUf=UF e GET /deputados/{id};
//     pelo CPF do registro de 2026; sem CPF, nome civil normalizado + nascimento, só com um único
//     deputado casando. CPF só em memória (C-006);
//   - exercício: GET /deputados/{id}/historico dá os intervalos em "Exercício" (a página lista
//     também as votações dos dias de licença, marcadas como ausência);
//   - `total` = votações da lista com data dentro de algum intervalo; `votou` = dessas, em quantas
//     ele tem voto registrado, de qualquer tipo (sim, não, abstenção, obstrução, secreto), a mesma
//     conta de votacoes-2026.mjs, cujas funções são reusadas.
// Sem ligação ou sem votação da lista dentro do exercício → `{ sem_dados: true }` (FR-073), e o
// relatório diz o motivo. A rede entra por parâmetro, como no WP12: este módulo não importa http.mjs.
import { normalizarNome } from './cruzar.mjs';
import { contarParticipacao, nDe } from './votacoes-2026.mjs';

export const PORTAL_CAMARA = 'https://www.camara.leg.br';
export const urlVotacoesDeputado = (/** @type {number} */ id, /** @type {number} */ ano) =>
  `${PORTAL_CAMARA}/deputados/${id}/votacoes-nominais-plenario/${ano}`;

const FEDERAL = /^deputad[oa] federal$/i;

/**
 * @typedef {{ cargo: string, lugar: string, ano: number }} CargoAnterior
 * @typedef {{ votou: number, total: number, de: number, ate: number } | { sem_dados: true, de: number, ate: number }} MandatoAnterior
 * @typedef {{ id: number, cpf: string | null, nomeCivil: string, dataNascimento: string | null }} DeputadoCamara
 */

/**
 * Último mandato de deputado federal para o qual foi eleito, ou null.
 * @param {CargoAnterior[]} cargos
 * @returns {{ ano: number, uf: string, de: number, ate: number, legislatura: number } | null}
 */
export function ultimoMandatoFederal(cargos) {
  const fed = cargos.filter((c) => FEDERAL.test(c.cargo)).sort((a, b) => b.ano - a.ano)[0];
  if (!fed) return null;
  return { ano: fed.ano, uf: fed.lugar, de: fed.ano + 1, ate: fed.ano + 4, legislatura: 51 + (fed.ano - 1998) / 4 };
}

/**
 * Deputado da Câmara que é a pessoa do registro de 2026 (FR-072).
 * Pelo CPF; sem casamento por CPF, nome civil normalizado + nascimento entre os deputados cujo CPF
 * não desmente (ausente ou igual), só com um único casando.
 * @param {{ cpf: string | null, nomeCivil: string, dataNascimento: string | null }} cand
 * @param {DeputadoCamara[]} deputados
 * @returns {{ id: number, via: 'cpf' | 'nome+nascimento' } | { motivo: string }}
 */
export function ligarDeputado(cand, deputados) {
  if (cand.cpf) {
    const porCpf = deputados.filter((d) => d.cpf === cand.cpf);
    if (porCpf.length === 1) return { id: porCpf[0].id, via: 'cpf' };
  }
  if (!cand.dataNascimento) return { motivo: 'sem CPF que case e sem data de nascimento no registro de 2026' };
  const nome = normalizarNome(cand.nomeCivil);
  const porNome = deputados.filter(
    (d) => normalizarNome(d.nomeCivil) === nome && d.dataNascimento === cand.dataNascimento && (!d.cpf || !cand.cpf || d.cpf === cand.cpf)
  );
  if (porNome.length === 1) return { id: porNome[0].id, via: 'nome+nascimento' };
  return { motivo: porNome.length ? `nome e nascimento casam ${porNome.length} deputados` : 'nenhum deputado da legislatura casa' };
}

/**
 * Intervalos em exercício na legislatura, [inicio, fim) em AAAA-MM-DD, a partir do histórico da
 * Câmara: abre num registro "Exercício", fecha no primeiro registro com outra situação (licença,
 * afastamento, fim do mandato). Registros sem situação (resumo da legislatura) não contam.
 * @param {Array<{ idLegislatura: number, dataHora: string, situacao: string | null }>} historico
 * @param {number} legislatura
 * @returns {Array<[string, string]>}
 */
export function intervalosEmExercicio(historico, legislatura) {
  const regs = historico
    .filter((r) => r.idLegislatura === legislatura && r.situacao)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  /** @type {Array<[string, string]>} */
  const saida = [];
  /** @type {string | null} */
  let aberto = null;
  for (const r of regs) {
    const dia = r.dataHora.slice(0, 10);
    if (r.situacao === 'Exercício') aberto ??= dia;
    else if (aberto !== null) {
      if (dia > aberto) saida.push([aberto, dia]);
      aberto = null;
    }
  }
  // Sem registro de saída: até o fim da legislatura (31/01 do quinto ano).
  if (aberto !== null) saida.push([aberto, `${1998 + 4 * (legislatura - 51) + 5}-02-01`]);
  return saida;
}

const dentro = (/** @type {string} */ dia, /** @type {Array<[string, string]>} */ ints) => ints.some(([i, f]) => dia >= i && dia < f);

const ENTIDADES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' });
const texto = (/** @type {string} */ h) =>
  h
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e.toLowerCase()] ?? m
    )
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Votações de uma página "Votações nominais em Plenário" do deputado: cada sessão é uma âncora de
 * evento ("25/02/2003 - SESSÃO ORDINÁRIA Nº 006") seguida da tabela, com uma linha por votação:
 * o que foi votado e o voto ("---" = não votou). Página sem a lista e sem o aviso de ano vazio
 * derruba a coleta: layout mudado não pode virar "não votou em nada".
 * @param {string} html
 * @returns {Array<{ data: string, evento: string, descricao: string, voto: string | null }>}
 */
export function lerPaginaVotacoes(html) {
  if (!/Vota\S*es Nominais em Plen\S*rio/i.test(html)) throw new Error('página sem o título "Votações Nominais em Plenário"');
  const partes = html.split(/<a href="[^"]*\/evento-legislativo\/(\d+)">\s*(\d{2})\/(\d{2})\/(\d{4})[^<]*<\/a>/);
  /** @type {Array<{ data: string, evento: string, descricao: string, voto: string | null }>} */
  const saida = [];
  for (let k = 1; k < partes.length; k += 5) {
    const [evento, dd, mm, aaaa, corpo] = partes.slice(k, k + 5);
    for (const [, linha] of corpo.matchAll(/<tr class="g-table__row">([\s\S]*?)<\/tr>/g)) {
      const tds = [...linha.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => texto(m[1]));
      if (tds.length < 2) continue;
      saida.push({ data: `${aaaa}-${mm}-${dd}`, evento, descricao: tds[0], voto: tds[1] && tds[1] !== '---' ? tds[1] : null });
    }
  }
  if (!saida.length && !/Nenhum resultado encontrado/i.test(html)) throw new Error('página sem votações e sem o aviso de ano vazio');
  return saida;
}

/**
 * votou/total de cada deputado sobre as nominais do período, só nas datas em exercício. Monta o
 * mapa data → ids em exercício a partir dos intervalos e reusa contarParticipacao (WP12).
 * @param {Array<{ id: string, data: string, votantes: Set<number> }>} nominais
 * @param {Map<number, Array<[string, string]>>} intervalosPorId
 */
export function contarNoMandato(nominais, intervalosPorId) {
  /** @type {Map<string, Set<number>>} */
  const emExercicioPorData = new Map();
  for (const v of nominais) {
    if (emExercicioPorData.has(v.data)) continue;
    const s = new Set();
    for (const [id, ints] of intervalosPorId) if (dentro(v.data, ints)) s.add(id);
    emExercicioPorData.set(v.data, s);
  }
  return contarParticipacao(nominais, emExercicioPorData, intervalosPorId.keys());
}

/**
 * @typedef {{
 *   json: (url: string, arquivo: string) => Promise<any>,
 *   html: (url: string, arquivo: string) => Promise<string>,
 *   mapLimitado: <T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>) => Promise<R[]>
 * }} RedeAnterior
 * `json` devolve o JSON da URL e `html` o texto da página, os dois com cache em `arquivo`.
 */

/**
 * @typedef {{ sq: string, nome_urna: string, cpf: string | null, nomeCivil: string, dataNascimento: string | null, cargos_anteriores: CargoAnterior[] }} CandidatoAnterior
 * @typedef {{ sq: string, nome_urna: string, ano: number, uf: string, de: number, ate: number,
 *   id_camara: number | null, via: string | null, motivo: string | null, intervalos: Array<[string, string]>,
 *   porAno: Array<{ ano: number, listadas: number, emExercicio: number, votou: number }>,
 *   resultado: MandatoAnterior }} LinhaRelatorio
 */

/**
 * @param {RedeAnterior} rede
 * @param {{ api: string, candidatos: CandidatoAnterior[] }} opcoes
 */
export async function coletarMandatoAnterior(rede, { api, candidatos }) {
  const alvos = candidatos
    .map((c) => ({ c, m: ultimoMandatoFederal(c.cargos_anteriores) }))
    .filter((/** @type {any} */ x) => x.m !== null)
    .map((x) => ({ c: x.c, m: /** @type {NonNullable<ReturnType<typeof ultimoMandatoFederal>>} */ (x.m) }));

  // 1. Deputados de cada legislatura × UF envolvida, com CPF e nascimento.
  /** @type {Map<string, DeputadoCamara[]>} */
  const porGrupo = new Map();
  for (const chave of new Set(alvos.map(({ m }) => `${m.legislatura}|${m.uf}`))) {
    const [leg, uf] = chave.split('|');
    const ids = new Set();
    for (let pagina = 1; ; pagina++) {
      const j = await rede.json(`${api}/deputados?idLegislatura=${leg}&siglaUf=${uf}&itens=100&pagina=${pagina}`, `lista-${leg}-${uf}-${pagina}.json`);
      for (const d of j.dados ?? []) ids.add(d.id);
      if (!(j.links ?? []).some((/** @type {any} */ l) => l.rel === 'next') || !j.dados?.length) break;
    }
    const det = await rede.mapLimitado([...ids], 4, async (id) => (await rede.json(`${api}/deputados/${id}`, `${id}.json`)).dados);
    porGrupo.set(chave, det.map((/** @type {any} */ d) => ({
      id: d.id,
      cpf: /^\d{11}$/.test(d.cpf ?? '') ? d.cpf : null,
      nomeCivil: d.nomeCivil ?? '',
      dataNascimento: d.dataNascimento ?? null
    })));
  }

  // 2. Ligação, intervalos em exercício e votações da página, ano a ano do período.
  /** @type {LinhaRelatorio[]} */
  const linhas = [];
  for (const { c, m } of alvos) {
    const lig = ligarDeputado(c, porGrupo.get(`${m.legislatura}|${m.uf}`) ?? []);
    /** @type {LinhaRelatorio} */
    const linha = { sq: c.sq, nome_urna: c.nome_urna, ano: m.ano, uf: m.uf, de: m.de, ate: m.ate, id_camara: null, via: null,
      motivo: null, intervalos: [], porAno: [], resultado: { sem_dados: true, de: m.de, ate: m.ate } };
    linhas.push(linha);
    if ('motivo' in lig) {
      linha.motivo = `sem ligação com a Câmara: ${lig.motivo}`;
      continue;
    }
    Object.assign(linha, { id_camara: lig.id, via: lig.via });
    const hist = (await rede.json(`${api}/deputados/${lig.id}/historico`, `${lig.id}-historico.json`)).dados ?? [];
    linha.intervalos = intervalosEmExercicio(hist, m.legislatura);
    if (!linha.intervalos.length) {
      linha.motivo = `nenhum período em exercício na ${m.legislatura}ª legislatura no histórico da Câmara`;
      continue;
    }
    /** @type {Array<{ id: string, data: string, votantes: Set<number> }>} */
    const nominais = [];
    for (let ano = m.de; ano <= m.ate; ano++) {
      const lista = lerPaginaVotacoes(await rede.html(urlVotacoesDeputado(lig.id, ano), `pagina-${lig.id}-${ano}.html`));
      const em = lista.filter((v) => dentro(v.data, linha.intervalos));
      linha.porAno.push({ ano, listadas: lista.length, emExercicio: em.length, votou: em.filter((v) => v.voto).length });
      em.forEach((v, i) => nominais.push({ id: `${ano}-${i}`, data: v.data, votantes: new Set(v.voto ? [lig.id] : []) }));
    }
    const r = contarNoMandato(nominais, new Map([[lig.id, linha.intervalos]])).get(lig.id);
    if (!r) linha.motivo = `a página da Câmara não lista votação nominal em Plenário nos períodos em exercício de ${m.de}–${m.ate}`;
    else linha.resultado = { votou: r.votou, total: r.total, de: m.de, ate: m.ate };
  }

  /** @type {Map<string, MandatoAnterior>} */
  const porSq = new Map(linhas.map((l) => [l.sq, l.resultado]));
  return { porSq, linhas: linhas.sort((a, b) => b.ano - a.ano || a.nome_urna.localeCompare(b.nome_urna, 'pt-BR')) };
}

export const MARCADOR_MANUAL_ANTERIOR = '<!-- conferência à mão: tudo abaixo desta linha é preservado por npm run base -->';

const SECAO_MANUAL_INICIAL = `

## Conferência à mão (NFR-043)

Ligação de cada um com a página do deputado na Câmara, e \`votou\`/\`total\` de 3 sorteados
contra a mesma página (diferença aceita: até 2 votações).
`;

/**
 * docs/conferencia-mandato-anterior.md (NFR-043): a parte de cima é gerada pelo `npm run base`;
 * a conferência à mão, abaixo do marcador, é preservada entre execuções.
 * @param {Awaited<ReturnType<typeof coletarMandatoAnterior>>} r
 * @param {string} anterior conteúdo atual do arquivo ('' se não existe)
 * @param {string} hoje
 */
export function conferenciaMandatoAnterior(r, anterior, hoje) {
  const br = (/** @type {string} */ d) => d.split('-').reverse().join('/');
  const i = anterior.indexOf(MARCADOR_MANUAL_ANTERIOR);
  const manual = i >= 0 ? anterior.slice(i + MARCADOR_MANUAL_ANTERIOR.length) : SECAO_MANUAL_INICIAL;
  const com = r.linhas.filter((l) => !('sem_dados' in l.resultado));
  const sem = r.linhas.filter((l) => 'sem_dados' in l.resultado);
  const linhas = [
    '# Conferência da participação no mandato anterior (NFR-043)',
    '',
    `Gerado por \`npm run base\` (scripts/lib/votacoes-mandato-anterior.mjs) em ${br(hoje)}. A parte de cima não se edita à mão.`,
    '',
    `- Candidatos fora do mandato e já eleitos deputado federal: ${r.linhas.length}; com bloco: ${com.length}; ` +
      `com "sem dados": ${sem.length}${sem.length ? ` — ${sem.map((l) => l.nome_urna).join(', ')}` : ''}.`,
    '- Fonte das votações: a lista "Votações nominais em Plenário" da página de cada deputado na Câmara, ' +
      'um ano por página; exercício pelo histórico da Câmara (`GET /deputados/{id}/historico`).',
    '',
    '## Ligação e contagem por candidato',
    '',
    '`total` = votações da lista com data em que ele estava em exercício; `votou` = dessas, em quantas tem voto registrado, ' +
      'de qualquer tipo. N = votou/total × 10, arredondado; 10 só com todas. "Em exercício" vai do dia de entrada ao dia da saída, ' +
      'este fora da conta.',
    '',
    '| Candidato | SQ 2026 | Último mandato | UF | id Câmara | Ligação | Em exercício | Votou | Total | N em 10 | Motivo sem dados |',
    '|---|---|---|---|---:|---|---|---:|---:|---:|---|',
    ...r.linhas.map((l) => {
      const v = l.resultado;
      const ints = l.intervalos.map(([a, b]) => `${br(a)} a ${br(b)}`).join('; ') || '—';
      return 'sem_dados' in v
        ? `| ${l.nome_urna} | ${l.sq} | ${l.de}–${l.ate} | ${l.uf} | ${l.id_camara ?? '—'} | ${l.via ?? '—'} | ${ints} | — | — | — | ${l.motivo ?? ''} |`
        : `| ${l.nome_urna} | ${l.sq} | ${l.de}–${l.ate} | ${l.uf} | ${l.id_camara} | ${l.via} | ${ints} | ${v.votou} | ${v.total} | ${nDe(v)}${nDe(v) <= 4 ? ' (vermelho)' : ''} | |`;
    }),
    '',
    '## Por ano: votações listadas na página / em exercício / votou',
    '',
    '| Candidato | 1º ano | 2º ano | 3º ano | 4º ano |',
    '|---|---|---|---|---|',
    ...r.linhas
      .filter((l) => l.porAno.length)
      .map((l) => `| ${l.nome_urna} | ${l.porAno.map((a) => `${a.ano}: ${a.listadas} / ${a.emExercicio} / ${a.votou}`).join(' | ')} |`),
    '',
    MARCADOR_MANUAL_ANTERIOR
  ];
  return linhas.join('\n') + manual;
}
