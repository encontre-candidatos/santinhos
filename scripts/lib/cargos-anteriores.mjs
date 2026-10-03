// Cargos para os quais cada candidato de 2026 já foi eleito, nos arquivos de candidatos do TSE
// de 2000 a 2024 (FR-036, FR-038; WP13/T062).
//
// Medido em 02/10/2026 (research/medicao-cargos-2026-10-02.py): um zip por ano, um CSV por UF
// (latin1, ";", texto entre aspas e número sem). A situação vem em DS_SIT_TOT_TURNO ("ELEITO",
// "ELEITO POR QP", "ELEITO POR MÉDIA"). CPF em NR_CPF_CANDIDATO: 2024 sem nenhum, 2012 com 71%,
// os demais anos entre 98% e 100%.
//
// Ligação com o registro de 2026: pelo CPF quando a linha antiga tem CPF; sem CPF na linha, por
// nome completo normalizado + data de nascimento, só quando um único candidato de 2026 casa. O
// CPF e o nome civil das linhas antigas só vivem em memória (C-006): daqui sai `{ cargo, lugar, ano }`.
import AdmZip from 'adm-zip';
import { normalizarNome } from './cruzar.mjs';
import { baixar } from './tse.mjs';

const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand';

/** Anos de eleição com arquivo de candidatos no TSE, do mais recente ao mais antigo. */
export const ANOS_CARGOS = [2024, 2022, 2020, 2018, 2016, 2014, 2012, 2010, 2008, 2006, 2004, 2002, 2000];

/** @param {number} ano */
export const arquivoCandAno = (ano) => ({ url: `${CDN}/consulta_cand_${ano}.zip`, zip: `consulta_cand_${ano}.zip` });

/** Cargos eleitos na esfera municipal: o lugar é o município; nos demais, a UF. */
const MUNICIPAIS = new Set(['PREFEITO', 'VICE-PREFEITO', 'VEREADOR']);

/** Feminino dos cargos, para "Já foi prefeita de …" (DS_GENERO do registro de 2026). */
const FEMININO = new Map([
  ['vereador', 'vereadora'],
  ['prefeito', 'prefeita'],
  ['vice-prefeito', 'vice-prefeita'],
  ['deputado estadual', 'deputada estadual'],
  ['deputado distrital', 'deputada distrital'],
  ['deputado federal', 'deputada federal'],
  ['senador', 'senadora'],
  ['governador', 'governadora'],
  ['vice-governador', 'vice-governadora'],
  ['presidente', 'presidenta'],
  ['vice-presidente', 'vice-presidenta']
]);

/** Partículas que ficam minúsculas no nome do município. */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * CPF utilizável: 11 dígitos, não zerado (o TSE usa "-4", "#NULO" e zeros para "sem CPF").
 * @param {string | null | undefined} v
 */
export function cpfValido(v) {
  const d = String(v ?? '').replace(/\D/g, '');
  return /^\d{11}$/.test(d) && d !== '00000000000' && !String(v).trim().startsWith('-') ? d : null;
}

/** @param {string | null | undefined} sit */
export const ehEleito = (sit) => /^ELEITO/i.test(String(sit ?? '').trim());

/**
 * "SÃO JOÃO DEL-REI" → "São João del-Rei"; "PINGO-D'ÁGUA" → "Pingo-d'Água".
 * @param {string} s
 */
export function tituloMunicipio(s) {
  const palavras = s.trim().toLowerCase().split(/\s+/);
  return palavras
    .map((p, i) => {
      if (i > 0 && PARTICULAS.has(p)) return p;
      // Hífen e apóstrofo: "d'água" → "d'Água"; "del-rei" → "del-Rei".
      return p
        .split('-')
        .map((parte, j) => {
          if (/^d'/.test(parte)) return "d'" + maiuscula(parte.slice(2));
          if (j > 0 && /^(d[aeo]s?|del)$/.test(parte)) return parte;
          if (i > 0 && j === 0 && parte === 'del') return parte;
          return maiuscula(parte);
        })
        .join('-');
    })
    .join(' ');
}
/** @param {string} s */
const maiuscula = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Cargo em minúsculas, no gênero do registro de 2026. "1º SUPLENTE" e "2º SUPLENTE" são de senador.
 * @param {string} dsCargo @param {string | null | undefined} genero
 */
export function cargoNoGenero(dsCargo, genero) {
  let c = dsCargo.trim().toLowerCase();
  if (/suplente/.test(c)) c = `${c} de senador`;
  return /FEMININO/i.test(genero ?? '') ? (FEMININO.get(c) ?? c) : c;
}

/**
 * `{ cargo, lugar, ano }` de uma linha eleita.
 * @param {Record<string, string>} l @param {number} ano @param {string | null | undefined} genero
 */
export function cargoDaLinha(l, ano, genero) {
  const municipal = MUNICIPAIS.has(l.DS_CARGO.trim().toUpperCase());
  return {
    cargo: cargoNoGenero(l.DS_CARGO, genero),
    // Município de MG pelo nome; de outro estado, com a UF ("Salvador/BA").
    lugar: municipal ? tituloMunicipio(l.NM_UE) + (l.SG_UF === 'MG' ? '' : `/${l.SG_UF}`) : l.SG_UF,
    ano
  };
}

/**
 * Sem repetição (1º e 2º turno são duas linhas), do mais recente ao mais antigo.
 * @param {Array<{ cargo: string, lugar: string, ano: number }>} lista
 */
export function ordenarCargos(lista) {
  const vistos = new Set();
  const unicos = [];
  for (const c of lista) {
    const k = `${c.ano}|${c.cargo}|${c.lugar}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    unicos.push(c);
  }
  return unicos.sort((a, b) => b.ano - a.ano || a.cargo.localeCompare(b.cargo, 'pt-BR'));
}

/**
 * Índices do registro de 2026 para ligar linhas antigas.
 * @param {Array<{ sq: string, cpf: string | null, nomeCivil: string, dataNascimento: string | null }>} candidaturas
 */
export function criarLigador(candidaturas) {
  /** @type {Map<string, string>} */
  const porCpf = new Map();
  /** @type {Map<string, string[]>} */
  const porNome = new Map();
  for (const c of candidaturas) {
    if (c.cpf) porCpf.set(c.cpf, c.sq);
    if (!c.dataNascimento) continue;
    const k = `${normalizarNome(c.nomeCivil)}|${c.dataNascimento}`;
    porNome.set(k, [...(porNome.get(k) ?? []), c.sq]);
  }
  return {
    /**
     * SQ de 2026 da pessoa da linha antiga, e por qual via; `ambiguo` quando nome + nascimento
     * casa mais de um candidato de 2026 (fica sem ligação).
     * @param {{ cpf: string | null, nome: string, nascimento: string | null }} linha
     * @returns {{ sq: string, via: 'cpf' | 'nome+nascimento' } | { ambiguo: string[] } | null}
     */
    ligar({ cpf, nome, nascimento }) {
      if (cpf) {
        const sq = porCpf.get(cpf);
        return sq ? { sq, via: 'cpf' } : null;
      }
      if (!nascimento) return null;
      const sqs = porNome.get(`${normalizarNome(nome)}|${nascimento}`) ?? [];
      if (sqs.length === 1) return { sq: sqs[0], via: 'nome+nascimento' };
      return sqs.length > 1 ? { ambiguo: sqs } : null;
    }
  };
}

/** dd/mm/aaaa → aaaa-mm-dd (as datas antigas vêm assim); outro formato → null. */
const dataIso = (/** @type {string} */ s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/**
 * Percorre as linhas de um CSV do TSE sem decodificar o arquivo inteiro numa string: os de 2012
 * e 2016 passam de 1 GB. Texto vem entre aspas e número sem; corte simples no ";" e, quando um
 * texto traz ";" dentro e a contagem não bate com o cabeçalho, o corte que respeita as aspas.
 * @param {Buffer} buf
 * @param {(cabecalho: string[]) => void} aoCabecalho
 * @param {(campos: string[]) => void} cada
 */
function percorrer(buf, aoCabecalho, cada) {
  const dec = new TextDecoder('latin1');
  const tirarAspas = (/** @type {string} */ f) =>
    f.length > 1 && f[0] === '"' && f.endsWith('"') ? f.slice(1, -1).replaceAll('""', '"') : f;
  let n = 0;
  const separar = (/** @type {string} */ linha) => {
    const t = linha.replace(/\r$/, '');
    const simples = t.split(';');
    if (n === 0 || simples.length === n) return simples.map(tirarAspas);
    return [...t.matchAll(/("(?:[^"]|"")*"|[^;]*)(?:;|$)/g)].slice(0, n).map((m) => tirarAspas(m[1]));
  };
  let fim = buf.indexOf(10);
  const cab = separar(dec.decode(buf.subarray(0, fim)));
  n = cab.length;
  aoCabecalho(cab);
  let ini = fim + 1;
  while (ini < buf.length) {
    fim = buf.indexOf(10, ini);
    if (fim < 0) fim = buf.length;
    if (fim > ini + 1) cada(separar(dec.decode(buf.subarray(ini, fim))));
    ini = fim + 1;
  }
}

/**
 * @typedef {{ ano: number, linhas: number, comCpf: number, eleitos: number, porCpf: number, porNome: number, ambiguos: number }} Cobertura
 */

/** Primeira eleição com declaração de bens no TSE (WP16): antes dela, a candidatura não entra em `anteriores`. */
export const ANO_MIN_BENS = 2006;

/**
 * Candidatura mais recente de cada candidato de 2026: guarda o ano e os SQ_CANDIDATO daquele ano
 * (eleito ou não); um ano mais antigo não substitui um mais recente.
 * @param {Map<string, { ano: number, uf: string, sqs: string[] }>} anteriores
 * @param {string} sq2026 @param {number} ano @param {string} sq @param {string} uf
 */
export function registrarAnterior(anteriores, sq2026, ano, sq, uf) {
  const atual = anteriores.get(sq2026);
  if (atual && atual.ano > ano) return;
  if (!atual || atual.ano < ano) anteriores.set(sq2026, { ano, uf, sqs: [sq] });
  else if (!atual.sqs.includes(sq)) atual.sqs.push(sq);
}

/**
 * Cargos eleitos de cada candidato de 2026, por SQ_CANDIDATO de 2026; e, para o carimbo de
 * patrimônio (WP16), a candidatura mais recente de cada um desde 2006, eleito ou não.
 * @param {{ dirCache: string, atualizar: boolean, candidaturas: Array<{ sq: string, cpf: string | null, nomeCivil: string, dataNascimento: string | null, genero?: string | null }>, anos?: number[] }} opcoes
 */
export async function coletarCargos({ dirCache, atualizar, candidaturas, anos = ANOS_CARGOS }) {
  const ligador = criarLigador(candidaturas);
  const generoPorSq = new Map(candidaturas.map((c) => [c.sq, c.genero ?? null]));
  /** @type {Map<string, Array<{ cargo: string, lugar: string, ano: number }>>} */
  const brutos = new Map();
  /** @type {Map<string, 'cpf' | 'nome+nascimento'>} vias usadas por SQ de 2026 */
  const viasPorSq = new Map();
  /** @type {Cobertura[]} */
  const cobertura = [];
  /** @type {Array<{ ano: number, sqs: string[] }>} */
  const ambiguos = [];
  /** @type {Array<{ ano: number, zip: string, modificado: string | null }>} */
  const fontes = [];
  /** @type {Map<string, { ano: number, uf: string, sqs: string[] }>} */
  const anteriores = new Map();

  for (const ano of anos) {
    const arq = arquivoCandAno(ano);
    const { caminho, modificado } = await baixar(arq, dirCache, atualizar);
    fontes.push({ ano, zip: arq.zip, modificado });
    const cob = { ano, linhas: 0, comCpf: 0, eleitos: 0, porCpf: 0, porNome: 0, ambiguos: 0 };
    const zip = new AdmZip(caminho);
    for (const e of zip.getEntries()) {
      if (!/\.(csv|txt)$/i.test(e.entryName) || /BRASIL/i.test(e.entryName)) continue;
      /** @type {Record<string, number>} */
      let ix = {};
      percorrer(e.getData(), (c) => (ix = Object.fromEntries(c.map((n, i) => [n, i]))), (f) => {
        cob.linhas++;
        const cpf = cpfValido(f[ix.NR_CPF_CANDIDATO]);
        if (cpf) cob.comCpf++;
        const eleito = ehEleito(f[ix.DS_SIT_TOT_TURNO]);
        if (!eleito && ano < ANO_MIN_BENS) return;
        if (eleito) cob.eleitos++;
        const r = ligador.ligar({ cpf, nome: f[ix.NM_CANDIDATO], nascimento: dataIso(f[ix.DT_NASCIMENTO]) });
        if (r && !('ambiguo' in r) && ano >= ANO_MIN_BENS) registrarAnterior(anteriores, r.sq, ano, f[ix.SQ_CANDIDATO], f[ix.SG_UF]);
        if (!eleito || !r) return;
        if ('ambiguo' in r) {
          cob.ambiguos++;
          ambiguos.push({ ano, sqs: r.ambiguo });
          return;
        }
        if (r.via === 'cpf') cob.porCpf++;
        else cob.porNome++;
        if (!viasPorSq.has(r.sq) || r.via === 'cpf') viasPorSq.set(r.sq, r.via);
        const linha = { DS_CARGO: f[ix.DS_CARGO], NM_UE: f[ix.NM_UE], SG_UF: f[ix.SG_UF] };
        brutos.set(r.sq, [...(brutos.get(r.sq) ?? []), cargoDaLinha(linha, ano, generoPorSq.get(r.sq))]);
      });
    }
    cobertura.push(cob);
  }

  /** @type {Map<string, Array<{ cargo: string, lugar: string, ano: number }>>} */
  const porSq = new Map();
  for (const [sq, lista] of brutos) porSq.set(sq, ordenarCargos(lista));
  return { porSq, viasPorSq, cobertura, ambiguos, fontes, anteriores };
}

/** Marcador: o que vem depois dele em docs/conferencia-cargos.md é escrito à mão e preservado. */
export const MARCADOR_MANUAL = '<!-- conferência à mão: tudo abaixo desta linha é preservado por npm run base -->';

const SECAO_MANUAL_INICIAL = `
## Conferência à mão (DivulgaCand)

Para cada um dos 20 casos da amostra acima, abrir o link do DivulgaCand e conferir se o histórico
de candidaturas confirma a classificação e o cargo mostrado. Registrar aqui: caso, resultado, data.
`;

/**
 * docs/conferencia-cargos.md (NFR-021): contagens, cobertura da ligação por ano e a amostra de 20
 * casos (10 ocultos, 10 com cargo) para conferir à mão. Nada de CPF nem nome civil de terceiro.
 * @param {Array<{ sq_candidato: string, nome_urna: string, numero_urna: string, reeleicao: boolean, cargos_anteriores: Array<{ cargo: string, lugar: string, ano: number }>, url_divulgacand: string }>} todos
 * @param {{ cobertura: Cobertura[], viasPorSq: Map<string, string>, ambiguos: Array<{ ano: number, sqs: string[] }> }} cargos
 * @param {string} anterior conteúdo atual do arquivo ('' se não existe)
 * @param {string} hoje AAAA-MM-DD
 */
export function conferenciaCargos(todos, cargos, anterior, hoje) {
  const oculto = (/** @type {typeof todos[number]} */ c) => !c.reeleicao && c.cargos_anteriores.length === 0;
  const ocultos = todos.filter(oculto);
  const reeleicao = todos.filter((c) => c.reeleicao);
  const comCargo = todos.filter((c) => !c.reeleicao && c.cargos_anteriores.length > 0);
  const pct = (/** @type {number} */ a, /** @type {number} */ b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  const vias = { cpf: 0, nome: 0 };
  for (const v of cargos.viasPorSq.values()) v === 'cpf' ? vias.cpf++ : vias.nome++;
  /** @type {Map<string, number>} */
  const recentes = new Map();
  for (const c of todos) {
    const r = c.cargos_anteriores[0];
    if (r) recentes.set(r.cargo, (recentes.get(r.cargo) ?? 0) + 1);
  }
  // Amostra estável: espaçada ao longo da lista em ordem de SQ, para não depender do nome.
  const amostra = (/** @type {typeof todos} */ l, /** @type {number} */ n) => {
    const ord = [...l].sort((a, b) => a.sq_candidato.localeCompare(b.sq_candidato));
    return Array.from({ length: Math.min(n, ord.length) }, (_, i) => ord[Math.floor((i * ord.length) / Math.min(n, ord.length))]);
  };
  const casos = [...amostra(ocultos, 10), ...amostra(comCargo, 10)];
  const mostrado = (/** @type {typeof todos[number]} */ c) =>
    c.cargos_anteriores[0] ? `${c.cargos_anteriores[0].cargo}, ${c.cargos_anteriores[0].lugar} (${c.cargos_anteriores[0].ano})` : '—';
  const manual = anterior.includes(MARCADOR_MANUAL) ? anterior.slice(anterior.indexOf(MARCADOR_MANUAL) + MARCADOR_MANUAL.length) : SECAO_MANUAL_INICIAL;

  return `# Conferência de "já teve cargo" (NFR-021)

Gerado por \`npm run base\` em ${hoje.split('-').reverse().join('/')}, a partir dos arquivos de candidatos do TSE
(${cargos.cobertura.map((c) => c.ano).join(', ')}). "Já teve cargo" = eleito (situação de totalização
começando por "ELEITO") em alguma dessas eleições, em qualquer estado (*Limitação aceita* de 02/10/2026).

## Contagem

| Grupo | Candidatos |
|---|---:|
| Tentam a reeleição (deputados em exercício) | ${reeleicao.length} |
| Já foram eleitos para algum cargo | ${comCargo.length} |
| Nunca foram eleitos (ocultos por padrão) | ${ocultos.length} |
| **Total** | **${todos.length}** |

Visíveis por padrão: ${todos.length - ocultos.length}. Pessoas ligadas a alguma eleição antiga: ${vias.cpf} pelo CPF
(em ao menos um ano) e ${vias.nome} só por nome completo + data de nascimento.

## Cobertura da ligação por ano

| Ano | Linhas (todas as UFs) | Com CPF | Eleitos | Ligados por CPF | Por nome + nascimento | Sem ligação por homônimo |
|---|---:|---:|---:|---:|---:|---:|
${cargos.cobertura.map((c) => `| ${c.ano} | ${c.linhas} | ${pct(c.comCpf, c.linhas)} | ${c.eleitos} | ${c.porCpf} | ${c.porNome} | ${c.ambiguos} |`).join('\n')}

Linha com CPF liga só pelo CPF; sem CPF, por nome + nascimento quando um único candidato de 2026 casa.
${cargos.ambiguos.length ? `Homônimos sem ligação: ${cargos.ambiguos.map((a) => `${a.ano} (SQ 2026 ${a.sqs.join(', ')})`).join('; ')}.` : 'Nenhum homônimo (mesmo nome e nascimento) entre os candidatos de 2026.'}

## Cargo mais recente de quem já foi eleito

| Cargo | Candidatos |
|---|---:|
${[...recentes].sort((a, b) => b[1] - a[1]).map(([cargo, n]) => `| ${cargo} | ${n} |`).join('\n')}

## Amostra para conferir à mão

10 ocultos e 10 com cargo, espaçados na ordem do SQ.

| Nome de urna | Número | SQ | Classificação | Cargo mostrado | DivulgaCand |
|---|---|---|---|---|---|
${casos.map((c) => `| ${c.nome_urna} | ${c.numero_urna} | ${c.sq_candidato} | ${oculto(c) ? 'nunca teve (oculto)' : 'já teve cargo'} | ${mostrado(c)} | [abrir](${c.url_divulgacand}) |`).join('\n')}

${MARCADOR_MANUAL}${manual}`;
}
