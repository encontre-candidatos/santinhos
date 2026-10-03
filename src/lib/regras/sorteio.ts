// Ordem sorteada da mesa (FR-060, NFR-040; WP15/T071): nenhum candidato fica sempre no topo só
// por começar com "A" (C-030). Sorteada uma vez por abertura, no navegador; nada é guardado.

/**
 * Inteiro sem viés em [0, n), de `crypto.getRandomValues`: descarta os valores do fim da faixa
 * de 32 bits que não completam um múltiplo de n (rejeição), em vez do `% n` direto.
 */
export function inteiroSeguro(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 2 ** 32) throw new RangeError(`n fora da faixa: ${n}`);
  const limite = Math.floor(2 ** 32 / n) * n;
  const u = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(u);
    if (u[0] < limite) return u[0] % n;
  }
}

/**
 * Fisher-Yates sobre uma cópia; não muta a entrada. `inteiro(n)` devolve um inteiro em [0, n):
 * nos testes, uma sequência fixa; no app, `inteiroSeguro`.
 */
export function embaralhar<T>(lista: readonly T[], inteiro: (n: number) => number = inteiroSeguro): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = inteiro(i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
