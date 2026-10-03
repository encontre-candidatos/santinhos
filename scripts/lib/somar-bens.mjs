// Soma dos bens declarados ao TSE por candidato (T041), sem rede nem disco: testável à parte.
// Só total e contagem saem daqui (C-008).

/** "1.234,56" ou "1234,56" → centavos inteiros (soma sem erro de ponto flutuante). */
export function centavos(/** @type {string} */ valor) {
  const t = valor.trim();
  if (!/^-?[\d.]*\d(,\d{1,2})?$/.test(t)) throw new Error(`valor de bem ilegível: "${valor}"`);
  const [inteiro, dec = ''] = t.replace(/\./g, '').split(',');
  const sinal = inteiro.startsWith('-') ? -1 : 1;
  return sinal * (Math.abs(Number(inteiro)) * 100 + Number(dec.padEnd(2, '0')));
}

/**
 * Total e quantidade de bens por SQ_CANDIDATO, a partir das linhas do CSV.
 * Sem linha → `{ total: null, itens: 0 }` ("Nenhum bem declarado").
 * @param {Iterable<Record<string, string>>} linhas
 * @param {string[]} sqs candidatos da base
 * @returns {Map<string, { total: number | null, itens: number }>}
 */
export function somarBens(linhas, sqs) {
  const quero = new Set(sqs);
  /** @type {Map<string, { centavos: number, itens: number }>} */
  const soma = new Map();
  for (const l of linhas) {
    if (!quero.has(l.SQ_CANDIDATO)) continue;
    const s = soma.get(l.SQ_CANDIDATO) ?? { centavos: 0, itens: 0 };
    s.centavos += centavos(l.VR_BEM_CANDIDATO);
    s.itens += 1;
    soma.set(l.SQ_CANDIDATO, s);
  }
  return new Map(
    sqs.map((sq) => {
      const s = soma.get(sq);
      return [sq, s ? { total: s.centavos / 100, itens: s.itens } : { total: null, itens: 0 }];
    })
  );
}

/**
 * Patrimônio declarado em 2022 (FR-015): `null` sem candidatura a deputado federal por MG em
 * 2022; `0` quando concorreu sem declarar bens.
 * @param {string | null} cpf CPF da candidatura de 2026 (só em memória, C-006)
 * @param {Map<string, string>} sqPorCpf2022
 * @param {Map<string, { total: number | null }>} porSq2022 saída de `somarBens` para 2022
 * @returns {number | null}
 */
export function patrimonio2022(cpf, sqPorCpf2022, porSq2022) {
  const sq = cpf ? sqPorCpf2022.get(cpf) : undefined;
  if (sq === undefined) return null;
  return porSq2022.get(sq)?.total ?? 0;
}
