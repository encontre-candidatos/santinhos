// Sorteio da mesa (WP15/T071; FR-060, NFR-040).
import { describe, expect, it } from 'vitest';
import { embaralhar, inteiroSeguro } from '$lib/regras/sorteio';

describe('embaralhar', () => {
  it('com a sequência fixa, a saída é a esperada e a entrada não muda', () => {
    const entrada = ['a', 'b', 'c', 'd'] as const;
    // i = 3, 2, 1 → j = 0, 2, 0: troca 3↔0 (d b c a), 2↔2, 1↔0 (b d c a)
    const seq = [0, 2, 0];
    const r = embaralhar(entrada, () => seq.shift()!);
    expect(r).toEqual(['b', 'd', 'c', 'a']);
    expect(entrada).toEqual(['a', 'b', 'c', 'd']);
  });

  it('nada some nem duplica', () => {
    const lista = Array.from({ length: 756 }, (_, i) => i);
    expect([...embaralhar(lista)].sort((a, b) => a - b)).toEqual(lista);
  });

  it('lista vazia e de um elemento', () => {
    expect(embaralhar([])).toEqual([]);
    expect(embaralhar(['x'])).toEqual(['x']);
  });

  it('NFR-040: em 100.000 sorteios de 10, cada um cai em cada posição entre 9% e 11% das vezes', () => {
    const N = 100_000;
    const lista = Array.from({ length: 10 }, (_, i) => i);
    const conta = Array.from({ length: 10 }, () => new Array<number>(10).fill(0));
    for (let k = 0; k < N; k++) embaralhar(lista).forEach((v, pos) => conta[v][pos]++);
    const fora = conta.flatMap((linha, v) => linha.map((n, pos) => ({ v, pos, p: n / N }))).filter(({ p }) => p < 0.09 || p > 0.11);
    expect(fora).toEqual([]);
  }, 60_000); // 1 milhão de trocas: passa dos 5 s padrão com a máquina carregada
});

describe('inteiroSeguro', () => {
  it('fica em [0, n) e recusa n inválido', () => {
    for (let k = 0; k < 1000; k++) {
      const v = inteiroSeguro(7);
      expect(Number.isInteger(v) && v >= 0 && v < 7).toBe(true);
    }
    expect(inteiroSeguro(1)).toBe(0);
    expect(() => inteiroSeguro(0)).toThrow(RangeError);
  });
});

describe('NFR-040 (tempo)', () => {
  // O que prova: o sorteio dos 756 é linear e barato — a mediana de 21 rodadas fica na casa de
  // 1 ms nesta máquina, e o limite de 20 ms por sorteio só cai se o algoritmo virar O(n²) ou
  // pior. O que não prova: o NFR (20 ms com a CPU 4× mais lenta) — isso é do navegador, não do
  // teste unitário. Mediana, e não média de uma só medição, para que a carga da máquina num
  // instante não reprove o teste.
  it('a mediana de sortear os 756 fica abaixo de 20 ms', () => {
    const lista = Array.from({ length: 756 }, (_, i) => ({ i }));
    embaralhar(lista); // aquece
    const tempos: number[] = [];
    for (let k = 0; k < 21; k++) {
      const t0 = performance.now();
      embaralhar(lista);
      tempos.push(performance.now() - t0);
    }
    tempos.sort((a, b) => a - b);
    expect(tempos[10]).toBeLessThan(20);
  });
});
