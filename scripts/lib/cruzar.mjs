// Funções puras de cruzamento Câmara × TSE. Sem I/O: testadas em tests/unit/cruzar.test.ts.

/** Valores que o TSE usa para "sem informação". */
const VAZIOS = new Set(['', '#NE', '#NULO', '#NULO#']);

/**
 * Primeiro valor com conteúdo real (ignora vazio, #NE, #NULO).
 * @param {...(string | null | undefined)} valores
 */
export function primeiroValor(...valores) {
  for (const v of valores) if (v != null && !VAZIOS.has(String(v).trim())) return String(v).trim();
  return null;
}

/**
 * dd/mm/aaaa → aaaa-mm-dd; outro formato → null.
 * @param {string | null | undefined} s
 */
export function dataBr(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * NFD, sem acento, minúsculas, sem pontuação, espaços colapsados.
 * @param {string | null | undefined} s
 */
export function normalizarNome(s) {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Situações do TSE que significam que a candidatura não segue. */
const DESISTENCIA = /REN[UÚ]NCIA|CANCELAD|FALECID|CASSAD/i;

/** @param {string | null | undefined} situacao */
export const ehDesistencia = (situacao) => DESISTENCIA.test(situacao ?? '');

/**
 * Sigla do partido na posse: registro mais antigo da legislatura.
 * @param {Array<{ idLegislatura: number, dataHora: string, siglaPartido: string | null }>} historico
 * @param {number} legislatura
 */
export function partidoNaPosse(historico, legislatura) {
  const da = historico
    .filter((r) => r.idLegislatura === legislatura && r.siglaPartido)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  return da[0]?.siglaPartido ?? null;
}

/**
 * Legislaturas distintas exercidas. Conta a legislatura quando há registro com situação
 * "Exercício", ou quando ela só tem o registro-resumo (situação nula): a Câmara não traz
 * movimentação detalhada das legislaturas antigas (até a 51ª), e esse registro só existe
 * para quem integrou a legislatura (conferido em 30/09/2026; ex.: Aécio Neves, 48ª a 51ª).
 * @param {Array<{ idLegislatura: number, situacao: string | null }>} historico
 */
export function contarMandatos(historico) {
  /** @type {Map<number, { exercicio: boolean, comMovimento: boolean }>} */
  const porLeg = new Map();
  for (const r of historico) {
    const e = porLeg.get(r.idLegislatura) ?? { exercicio: false, comMovimento: false };
    if (r.situacao) e.comMovimento = true;
    if (r.situacao === 'Exercício') e.exercicio = true;
    porLeg.set(r.idLegislatura, e);
  }
  let n = 0;
  for (const e of porLeg.values()) if (e.exercicio || !e.comMovimento) n++;
  return Math.max(n, 1);
}

/**
 * @typedef {{ id: number, nomeCivil: string, dataNascimento: string | null, cpf: string | null }} Dep
 * @typedef {{ sq: string, nomeCivil: string, dataNascimento: string | null, cpf: string | null, situacao: string }} Cand
 * @typedef {{ id_camara: number, sq_candidato: string | null, motivo: string, decidido_em: string }} Decisao
 */

/**
 * CPF dos dois lados e diferentes: é outra pessoa, com certeza.
 * @param {Dep} d @param {Cand} c
 */
const cpfDiverge = (d, c) => Boolean(c.cpf && d.cpf && c.cpf !== d.cpf);

/**
 * Casa deputados com candidaturas.
 * 1. CPF igual, quando os dois lados têm CPF;
 * 2. senão, nome civil normalizado igual e mesma data de nascimento;
 * 3. sem casamento exato, candidatura com a mesma data de nascimento ou o mesmo nome vira
 *    "duvidoso" — exceto quando os dois lados têm CPF e ele difere (é outra pessoa).
 * Decisões manuais (scripts/decisoes-manuais.json) valem antes de tudo.
 * Candidatura em desistência (renúncia, cancelamento, falecimento, cassação) não casa: o
 * deputado vai para `semCandidatura` com o texto do TSE como motivo. Indeferimento e recurso
 * continuam casados, com a situação como veio.
 *
 * @template {Dep} D
 * @template {Cand} C
 * @param {D[]} deputados
 * @param {C[]} candidaturas
 * @param {Decisao[]} [decisoes]
 */
export function cruzar(deputados, candidaturas, decisoes = []) {
  /** @type {Array<{ deputado: D, candidatura: C, via: string }>} */
  const casados = [];
  /** @type {Array<{ deputado: D, motivo: string }>} */
  const semCandidatura = [];
  /** @type {Array<{ deputado: D, opcoes: C[] }>} */
  const duvidosos = [];
  const decisaoPorId = new Map(decisoes.map((d) => [d.id_camara, d]));
  const porSq = new Map(candidaturas.map((c) => [c.sq, c]));

  for (const dep of deputados) {
    const decisao = decisaoPorId.get(dep.id);
    if (decisao) {
      if (decisao.sq_candidato == null) {
        semCandidatura.push({ deputado: dep, motivo: decisao.motivo });
      } else {
        const c = porSq.get(String(decisao.sq_candidato));
        if (!c) throw new Error(`decisão manual para ${dep.id}: SQ ${decisao.sq_candidato} não está no arquivo do TSE`);
        if (ehDesistencia(c.situacao)) semCandidatura.push({ deputado: dep, motivo: c.situacao });
        else casados.push({ deputado: dep, candidatura: c, via: 'decisão manual' });
      }
      continue;
    }

    const nome = normalizarNome(dep.nomeCivil);
    /** @type {C[]} */
    let exatos = [];
    let via = '';
    if (dep.cpf) {
      exatos = candidaturas.filter((c) => c.cpf && c.cpf === dep.cpf);
      via = 'CPF';
    }
    if (exatos.length === 0) {
      exatos = candidaturas.filter(
        (c) =>
          !cpfDiverge(dep, c) &&
          c.dataNascimento != null &&
          c.dataNascimento === dep.dataNascimento &&
          normalizarNome(c.nomeCivil) === nome
      );
      via = 'nome civil + nascimento';
    }

    if (exatos.length > 0) {
      const ativas = exatos.filter((c) => !ehDesistencia(c.situacao));
      if (ativas.length === 1) casados.push({ deputado: dep, candidatura: ativas[0], via });
      else if (ativas.length === 0) semCandidatura.push({ deputado: dep, motivo: exatos.map((c) => c.situacao).join('; ') });
      else duvidosos.push({ deputado: dep, opcoes: ativas });
      continue;
    }

    const parecidos = candidaturas.filter(
      (c) =>
        !cpfDiverge(dep, c) &&
        ((c.dataNascimento != null && c.dataNascimento === dep.dataNascimento) || normalizarNome(c.nomeCivil) === nome)
    );
    if (parecidos.length > 0) duvidosos.push({ deputado: dep, opcoes: parecidos });
    else semCandidatura.push({ deputado: dep, motivo: 'não encontrado' });
  }
  return { casados, semCandidatura, duvidosos };
}

/**
 * @typedef {{ sigla: string, nome: string, extrema_direita: boolean, classificado_em: string, motivo: string }} PartidoJson
 */

/**
 * Funde a lista de partidos sem nunca alterar classificação existente (FR-004).
 * @param {PartidoJson[] | null} existentes conteúdo atual de partidos.json (null na 1ª execução)
 * @param {string[]} siglas siglas presentes nos candidatos
 * @param {Map<string, string>} nomes sigla → nome por extenso (TSE)
 * @param {string} hoje AAAA-MM-DD
 * @returns {PartidoJson[]}
 */
export function fundirPartidos(existentes, siglas, nomes, hoje) {
  const lista = existentes
    ? existentes.map((p) => ({ ...p }))
    : ['PL', 'PRTB'].map((sigla) => ({
        sigla,
        nome: nomes.get(sigla) ?? sigla,
        extrema_direita: true,
        classificado_em: '2026-09-30',
        motivo: 'decisão da usuária, 30/09/2026'
      }));
  const tem = new Set(lista.map((p) => p.sigla));
  for (const sigla of siglas) {
    if (tem.has(sigla)) continue;
    lista.push({ sigla, nome: nomes.get(sigla) ?? sigla, extrema_direita: false, classificado_em: hoje, motivo: 'não classificado' });
    tem.add(sigla);
  }
  // Só o nome pode ser completado (quando vazio ou igual à sigla); a classificação nunca muda.
  for (const p of lista) {
    const nome = nomes.get(p.sigla);
    if ((!p.nome || p.nome === p.sigla) && nome) p.nome = nome;
  }
  return lista.sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'));
}
