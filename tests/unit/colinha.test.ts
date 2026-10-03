// Colinha (versão 4310): guarda no aparelho, chave `colinha`, e aguenta armazenamento ausente ou quebrado.
import { describe, expect, it } from 'vitest';
import { apagarColinha, CHAVE_COLINHA, gravarColinha, lerColinha } from '$lib/colinha';

function memoria() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k)
  };
}
const quebrado = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  }
};
const escolha = { sq_candidato: '130001', numero_urna: '1314', nome_urna: 'FULANA', partido: 'PT' };

describe('colinha', () => {
  it('grava, lê e apaga, só os quatro campos, na chave "colinha"', () => {
    const a = memoria();
    expect(gravarColinha({ ...escolha, extra: 'x' } as typeof escolha, a)).toBe(true);
    expect(JSON.parse(a.m.get(CHAVE_COLINHA)!)).toEqual(escolha);
    expect(lerColinha(a)).toEqual(escolha);
    apagarColinha(a);
    expect(lerColinha(a)).toBeNull();
  });

  it('armazenamento quebrado ou ausente: não lança, lê null, grava false', () => {
    expect(gravarColinha(escolha, quebrado)).toBe(false);
    expect(lerColinha(quebrado)).toBeNull();
    expect(() => apagarColinha(quebrado)).not.toThrow();
    expect(gravarColinha(escolha, null)).toBe(false);
    expect(lerColinha(null)).toBeNull();
  });

  it('conteúdo inválido vira null', () => {
    const a = memoria();
    for (const v of ['{', '"1314"', JSON.stringify({ ...escolha, numero_urna: '13' }), JSON.stringify({ numero_urna: '1314' })]) {
      a.m.set(CHAVE_COLINHA, v);
      expect(lerColinha(a), v).toBeNull();
    }
  });
});
