// Leitura pura (sem rede) da posição na PEC 221/2019 (WP10, T050): tipo de voto e a quais
// emendas cada pedido de retirada de assinatura se refere. Separado de votacao-6x1.mjs para os
// testes não puxarem o cliente HTTP.

/** Emenda → id da proposição e código de autenticação que alguns pedidos de retirada citam. */
export const EMENDAS = {
  1: { id: 2624861, codigo: 'CD268682715700' },
  2: { id: 2624863, codigo: 'CD266254769000' }
};

/** "Sim" e "Não" valem como vieram; abstenção, obstrução ou fora da lista contam como ausente (FR-019). */
export function tipoDeVoto(/** @type {string | undefined} */ tipo) {
  if (tipo === 'Sim') return 'sim';
  if (tipo === 'Não') return 'nao';
  return 'ausente';
}

const RE_RETIRADA = /(retirada|exclus[aã]o|retirar|excluir)/i;
const RE_APOIO = /(assinatura|apoiamento)/i;

/**
 * O pedido é de retirada de assinatura ou apoiamento a uma emenda? Fica de fora quem só
 * acrescenta assinatura a outro requerimento (ex.: REQ 3159/2026 entrando no REQ 3131/2026,
 * que pede a retirada de tramitação da Emenda 1, sem despacho: não tira assinatura de ninguém).
 */
export function ehRetirada(/** @type {string} */ ementa) {
  return RE_RETIRADA.test(ementa) && RE_APOIO.test(ementa) && !/inclus[aã]o de assinatura/i.test(ementa);
}

/**
 * Emendas (1 e/ou 2) a que um pedido de retirada se refere, lidas da ementa.
 * Aceita "Emenda nº 1", "EMC n. 2", "emenda 01/2026", "Emendas n° 1 e 2", "EMENDA n° 01 e
 * EMENDA n° 02" e o código de autenticação (CD…). "Proposta de Emenda à Constituição" não conta.
 * O número escrito vale mais que o código: no REQ 2929/2026 o texto diz "Emenda nº 2 … de
 * autoria do Deputado Tião Medeiros" com o código da Emenda 1. O código só decide quando não
 * há número.
 * @param {string} ementa @returns {number[]}
 */
export function emendasDaRetirada(ementa) {
  const achadas = new Set();
  const num = String.raw`(?:n\s*[º°o.]*\s*)?0?([12])(?!\d)`;
  const re = new RegExp(String.raw`(?:emendas?|EMC)\s*` + num + String.raw`(?:\s*(?:e|,)\s*(?:(?:emenda|EMC)\s*)?` + num + ')?', 'gi');
  for (const m of ementa.matchAll(re)) {
    if (m[1]) achadas.add(Number(m[1]));
    if (m[2]) achadas.add(Number(m[2]));
  }
  if (achadas.size === 0)
    for (const [n, { codigo }] of Object.entries(EMENDAS)) if (codigosDe(ementa).includes(codigo)) achadas.add(Number(n));
  return [...achadas].sort();
}

/** Códigos de autenticação (CD + 12 dígitos) citados na ementa. */
export const codigosDe = (/** @type {string} */ ementa) => /** @type {string[]} */ (ementa.replace(/\s/g, '').match(/CD\d{12}/g) ?? []);
export const CODIGOS_6X1 = Object.values(EMENDAS).map((e) => e.codigo);
