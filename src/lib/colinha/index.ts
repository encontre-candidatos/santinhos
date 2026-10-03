// Colinha (versão 4310, 03/10/2026; docs/eleitor-indeciso.md, melhoria 6): o número escolhido
// fica só no aparelho, em localStorage, chave `colinha`. Armazenamento pode faltar (aba anônima,
// dados bloqueados): toda leitura e escrita vai em try/catch e a página funciona sem ele.
import type { Candidato } from '$lib/tipos';

export const CHAVE_COLINHA = 'colinha';

export interface Colinha {
  sq_candidato: string;
  numero_urna: string;
  nome_urna: string;
  partido: string;
}

type Armazem = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function armazemPadrao(): Armazem | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function colinhaDe(c: Pick<Candidato, 'sq_candidato' | 'numero_urna' | 'nome_urna' | 'partido'>): Colinha {
  return { sq_candidato: c.sq_candidato, numero_urna: c.numero_urna, nome_urna: c.nome_urna, partido: c.partido };
}

function valida(v: unknown): v is Colinha {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.sq_candidato === 'string' &&
    typeof o.numero_urna === 'string' &&
    /^\d{4}$/.test(o.numero_urna) &&
    typeof o.nome_urna === 'string' &&
    typeof o.partido === 'string'
  );
}

export function lerColinha(armazem: Armazem | null = armazemPadrao()): Colinha | null {
  try {
    const t = armazem?.getItem(CHAVE_COLINHA);
    if (!t) return null;
    const v = JSON.parse(t);
    return valida(v) ? v : null;
  } catch {
    return null;
  }
}

/** Grava; devolve false se não deu (a tela da colinha abre do mesmo jeito). */
export function gravarColinha(c: Colinha, armazem: Armazem | null = armazemPadrao()): boolean {
  try {
    if (!armazem) return false;
    armazem.setItem(CHAVE_COLINHA, JSON.stringify(colinhaDe(c)));
    return true;
  } catch {
    return false;
  }
}

export function apagarColinha(armazem: Armazem | null = armazemPadrao()): void {
  try {
    armazem?.removeItem(CHAVE_COLINHA);
  } catch {
    /* sem armazenamento: nada a apagar */
  }
}
