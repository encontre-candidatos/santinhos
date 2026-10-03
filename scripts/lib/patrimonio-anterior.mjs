// Declaração de bens mais recente antes de 2026, para o carimbo de patrimônio (FR-062 a FR-064,
// C-031; WP16/T075).
//
// A candidatura vem da varredura de cargos-anteriores.mjs (`anteriores`: ano e SQ_CANDIDATO da
// candidatura mais recente desde 2006, ligada ao registro de 2026 como `cargos_anteriores`).
// O total sai de bem_candidato_<ano>.zip, somado em centavos como somar-bens.mjs.
// Conferido em 03/10/2026: de 2006 a 2024 o leiaute é o de 2026 (um CSV por UF, mais BR e
// BRASIL; SQ_CANDIDATO; VR_BEM_CANDIDATO com vírgula decimal); de 2006 a 2018 o SQ vem sem aspas.
// Daqui só sai `{ ano, valor, fator_ipca }` por candidato (C-008).
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse';
import { readFile } from 'node:fs/promises';
import { centavos } from './somar-bens.mjs';
import { baixar } from './tse.mjs';

const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato';

/** @param {number} ano */
export const arquivoBensAno = (ano) => ({ url: `${CDN}/bem_candidato_${ano}.zip`, zip: `bem_candidato_${ano}.zip` });

/** Endereço da consulta ao SIDRA (tabela 1737, variável 2266 = número-índice), agostos de 2006 a 2026. */
export const URL_SIDRA_IPCA =
  'https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/' +
  Array.from({ length: 21 }, (_, i) => `${2006 + i}08`).join(',');

/**
 * scripts/ipca-agosto.json: `{ consultado_em, fonte, url, indices: { "<ano>": número-índice } }`.
 * @param {string} caminho
 * @returns {Promise<{ consultado_em: string, fonte: string, url: string, indices: Record<string, number> }>}
 */
export async function lerIpca(caminho) {
  const ipca = JSON.parse(await readFile(caminho, 'utf8'));
  if (!ipca.indices?.['2026']) throw new Error(`${caminho}: falta o índice de agosto de 2026`);
  return ipca;
}

/**
 * Fator de agosto do ano a agosto de 2026 (FR-063). Mesma conta de src/lib/formatar/inflacao.ts.
 * @param {Record<string, number>} indices @param {number} ano
 */
export function fatorDoAno(indices, ano) {
  const i = indices[String(ano)];
  if (!i) throw new Error(`sem número-índice do IPCA de agosto de ${ano}`);
  return indices['2026'] / i;
}

/**
 * Valor da declaração de uma pessoa num ano. Mais de um SQ no mesmo ano (registro substituído,
 * candidatura em duas UEs) fica com o maior total; SQ sem nenhum bem conta 0 (FR-015).
 * @param {string[]} sqs @param {Map<string, number>} centavosPorSq
 */
export function valorDoAno(sqs, centavosPorSq) {
  return Math.max(0, ...sqs.map((sq) => centavosPorSq.get(sq) ?? 0)) / 100;
}

/**
 * Soma, em centavos, os bens de cada SQ pedido, em todas as UFs do zip (o BRASIL repete as UFs).
 * Com o csv-parse, não linha a linha: de 2020 em diante há descrição de bem com quebra de linha
 * dentro das aspas (22 mil em 2020, 25 mil em 2024).
 * @param {string} caminhoZip @param {Set<string>} sqs
 */
export async function somarZip(caminhoZip, sqs) {
  /** @type {Map<string, number>} */
  const soma = new Map();
  for (const e of new AdmZip(caminhoZip).getEntries()) {
    if (!/\.csv$/i.test(e.entryName) || /BRASIL/i.test(e.entryName)) continue;
    const texto = new TextDecoder('latin1').decode(e.getData());
    /** @type {Record<string, number> | null} */
    let ix = null;
    for await (const f of parse(texto, { delimiter: ';', relax_quotes: true, relax_column_count: true })) {
      if (!ix) {
        ix = Object.fromEntries(f.map((/** @type {string} */ n, /** @type {number} */ i) => [n, i]));
        continue;
      }
      const sq = f[ix.SQ_CANDIDATO];
      if (!sqs.has(sq)) continue;
      soma.set(sq, (soma.get(sq) ?? 0) + centavos(f[ix.VR_BEM_CANDIDATO]));
    }
  }
  return soma;
}

/**
 * `patrimonio_anterior` de cada candidato de 2026, por SQ de 2026.
 * @param {{ dirCache: string, atualizar: boolean, anteriores: Map<string, { ano: number, sqs: string[] }>, indices: Record<string, number> }} opcoes
 */
export async function coletarPatrimonioAnterior({ dirCache, atualizar, anteriores, indices }) {
  /** @type {Map<number, Set<string>>} */
  const porAno = new Map();
  for (const { ano, sqs } of anteriores.values()) for (const sq of sqs) porAno.set(ano, (porAno.get(ano) ?? new Set()).add(sq));

  /** @type {Map<number, Map<string, number>>} */
  const somas = new Map();
  /** @type {Array<{ ano: number, zip: string, modificado: string | null }>} */
  const fontes = [];
  for (const ano of [...porAno.keys()].sort((a, b) => b - a)) {
    const arq = arquivoBensAno(ano);
    const { caminho, modificado } = await baixar(arq, dirCache, atualizar);
    fontes.push({ ano, zip: arq.zip, modificado });
    somas.set(ano, await somarZip(caminho, /** @type {Set<string>} */ (porAno.get(ano))));
  }

  /** @type {Map<string, { ano: number, valor: number, fator_ipca: number }>} */
  const porSq = new Map();
  for (const [sq2026, { ano, sqs }] of anteriores)
    porSq.set(sq2026, { ano, valor: valorDoAno(sqs, /** @type {Map<string, number>} */ (somas.get(ano))), fator_ipca: fatorDoAno(indices, ano) });
  return { porSq, fontes };
}

/** Mesma regra de src/lib/formatar/crescimento.ts (FR-015, FR-063): ≥ 2× e ≥ meio milhão a mais, sobre o corrigido. */
export function razaoCorrigida(/** @type {{ patrimonio_total: number | null, patrimonio_anterior: { valor: number, fator_ipca: number } | null }} */ c) {
  const p = c.patrimonio_anterior;
  if (!p || c.patrimonio_total === null) return null;
  const antes = Math.round(p.valor * p.fator_ipca * 100) / 100;
  return antes === 0 ? null : { razao: c.patrimonio_total / antes, corrigido: antes, aumento: c.patrimonio_total - antes };
}
export const marcado = (/** @type {Parameters<typeof razaoCorrigida>[0]} */ c) => {
  const r = razaoCorrigida(c);
  return r !== null && r.razao >= 2 && r.aumento >= 500_000;
};

/** Marcador: o que vem depois dele em docs/conferencia-ipca.md é escrito à mão e preservado. */
export const MARCADOR_MANUAL_IPCA = '<!-- conferência à mão: tudo abaixo desta linha é preservado por npm run base -->';

const SECAO_MANUAL_IPCA = `
## Conferência à mão (NFR-041)

Para cada caso da amostra acima: abrir a declaração do ano antigo no DivulgaCand (ano e SQ da
tabela) e conferir o total (diferença máxima de R$ 1); conferir o fator na tabela 1737 do SIDRA e
a razão (diferença máxima de 0,01). Registrar aqui: caso, resultado, data.
`;

const reais = (/** @type {number} */ v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
const casas = (/** @type {number} */ v, /** @type {number} */ n) => v.toFixed(n).replace('.', ',');

/**
 * docs/conferencia-ipca.md (NFR-041): fatores, quem tem carimbo com os valores da conta, quem mudou
 * de ano de comparação entre os da reeleição e a amostra de 8 + 5 para conferir à mão.
 * O SQ antigo (público, sem CPF) vai junto para achar a declaração no DivulgaCand.
 * @param {Array<{ sq_candidato: string, nome_urna: string, reeleicao: boolean, patrimonio_total: number | null, patrimonio_2022: number | null, patrimonio_anterior: { ano: number, valor: number, fator_ipca: number } | null }>} todos
 * @param {{ anteriores: Map<string, { ano: number, uf: string, sqs: string[] }>, ipca: { consultado_em: string, url: string, indices: Record<string, number> } }} extra
 * @param {string} anterior conteúdo atual do arquivo ('' se não existe)
 * @param {string} hoje AAAA-MM-DD
 */
export function conferenciaIpca(todos, { anteriores, ipca }, anterior, hoje) {
  const r = (/** @type {typeof todos[number]} */ c) => razaoCorrigida(c);
  const comCarimbo = todos.filter(marcado).sort((a, b) => (r(b)?.razao ?? 0) - (r(a)?.razao ?? 0));
  const reeleicao = todos.filter((c) => c.reeleicao);
  // Regra antiga (WP09): 2022 nominal, só deputado federal por MG.
  const antigo = (/** @type {typeof todos[number]} */ c) =>
    !!c.patrimonio_2022 && c.patrimonio_total !== null && c.patrimonio_total / c.patrimonio_2022 >= 2 && c.patrimonio_total - c.patrimonio_2022 >= 500_000;
  const mudouAno = reeleicao.filter((c) => c.patrimonio_anterior?.ano !== 2022);
  const saiu = reeleicao.filter((c) => antigo(c) && !marcado(c));
  const entrou = reeleicao.filter((c) => !antigo(c) && marcado(c));
  /** @type {Map<number, number>} */
  const porAno = new Map();
  for (const c of todos) if (c.patrimonio_anterior) porAno.set(c.patrimonio_anterior.ano, (porAno.get(c.patrimonio_anterior.ano) ?? 0) + 1);
  const semAnterior = todos.filter((c) => !c.patrimonio_anterior).length;
  const zero = todos.filter((c) => c.patrimonio_anterior?.valor === 0).length;
  // Amostra estável: os da reeleição com carimbo e 5 dos demais com carimbo, espaçados na ordem do SQ.
  const outros = comCarimbo.filter((c) => !c.reeleicao).sort((a, b) => a.sq_candidato.localeCompare(b.sq_candidato));
  const n = Math.min(5, outros.length);
  const amostra = [...comCarimbo.filter((c) => c.reeleicao), ...Array.from({ length: n }, (_, i) => outros[Math.floor((i * outros.length) / n)])];
  const linha = (/** @type {typeof todos[number]} */ c) => {
    const p = /** @type {NonNullable<typeof c.patrimonio_anterior>} */ (c.patrimonio_anterior);
    const x = /** @type {NonNullable<ReturnType<typeof razaoCorrigida>>} */ (r(c));
    return `| ${c.nome_urna} | ${c.reeleicao ? 'sim' : 'não'} | ${p.ano} | ${reais(p.valor)} | ${casas(p.fator_ipca, 4)} | ${reais(x.corrigido)} | ${reais(/** @type {number} */ (c.patrimonio_total))} | ${casas(x.razao, 2)} |`;
  };
  const manual = anterior.includes(MARCADOR_MANUAL_IPCA) ? anterior.slice(anterior.indexOf(MARCADOR_MANUAL_IPCA) + MARCADOR_MANUAL_IPCA.length) : SECAO_MANUAL_IPCA;
  const data = (/** @type {string} */ d) => d.split('-').reverse().join('/');
  const anosEleicao = Object.keys(ipca.indices).filter((a) => Number(a) % 2 === 0);

  return `# Conferência do patrimônio corrigido pelo IPCA (NFR-041, SC-031)

Gerado por \`npm run base\` em ${data(hoje)}. Compara o total declarado em 2026 com a declaração da
candidatura mais recente antes de 2026 (2006 a 2024, qualquer cargo, ligada como os cargos
anteriores), corrigida pelo IPCA de agosto (FR-062, FR-063). Carimbo quando 2026 ≥ 2 × corrigido
e 2026 − corrigido ≥ R$ 500.000.

## Fatores (SIDRA, tabela 1737, consultada em ${data(ipca.consultado_em)})

| Ago/ano | Número-índice | Fator até ago/2026 |
|---|---:|---:|
${anosEleicao.map((a) => `| ${a} | ${casas(ipca.indices[a], 2)} | ${casas(ipca.indices['2026'] / ipca.indices[a], 4)} |`).join('\n')}

Consulta: <${ipca.url}>

## Declaração usada

| Ano da declaração | Candidatos |
|---|---:|
${[...porAno].sort((a, b) => b[0] - a[0]).map(([a, k]) => `| ${a} | ${k} |`).join('\n')}
| Nenhuma candidatura de 2006 a 2024 | ${semAnterior} |
| **Total** | **${todos.length}** |

Candidatura anterior sem nenhum bem declarado (vale 0, sem carimbo): ${zero}.

## Com carimbo: ${comCarimbo.length}

Razão corrigida mínima: ${comCarimbo.length ? casas(Math.min(...comCarimbo.map((c) => r(c)?.razao ?? 0)), 2) : '—'} (SC-031: nenhuma abaixo de 2).

| Nome de urna | Reeleição | Ano | Declarado no ano | Fator | Em valores de 2026 | 2026 | Razão |
|---|---|---|---:|---:|---:|---:|---:|
${comCarimbo.map(linha).join('\n')}

## Os ${reeleicao.length} da reeleição: o que mudou com a regra de 03/10/2026

- Saíram do carimbo (tinham pela regra de 2022 nominal): ${saiu.map((c) => `${c.nome_urna} (${casas(/** @type {number} */ (c.patrimonio_total) / /** @type {number} */ (c.patrimonio_2022), 2)}× nominal → ${casas(r(c)?.razao ?? 0, 2)}× corrigido)`).join(', ') || 'ninguém'}.
- Entraram: ${entrou.map((c) => `${c.nome_urna} (${c.patrimonio_anterior?.ano}, ${casas(r(c)?.razao ?? 0, 2)}×)`).join(', ') || 'ninguém'}.
- Comparação com outro ano que não 2022: ${mudouAno.map((c) => `${c.nome_urna} (${c.patrimonio_anterior?.ano ?? 'nenhuma'}${c.patrimonio_2022 === null ? '; não concorreu a deputado federal por MG em 2022' : ''})`).join(', ') || 'ninguém'}.

## Amostra para conferir à mão (NFR-041)

Os da reeleição com carimbo e ${n} dos demais com carimbo, espaçados na ordem do SQ de 2026.

| Nome de urna | SQ 2026 | Ano | UF | SQ do ano | Declarado no ano | Fator | Razão |
|---|---|---|---|---|---:|---:|---:|
${amostra.map((c) => {
    const a = anteriores.get(c.sq_candidato);
    const p = /** @type {NonNullable<typeof c.patrimonio_anterior>} */ (c.patrimonio_anterior);
    return `| ${c.nome_urna} | ${c.sq_candidato} | ${p.ano} | ${a?.uf ?? ''} | ${a?.sqs.join(', ') ?? ''} | ${reais(p.valor)} | ${casas(p.fator_ipca, 4)} | ${casas(r(c)?.razao ?? 0, 2)} |`;
  }).join('\n')}

${MARCADOR_MANUAL_IPCA}${manual}`;
}
