import { describe, expect, it, vi } from 'vitest';
import type { Candidato } from '$lib/tipos';
import { indicar, linkIndicacao, numeroDoLink, textoIndicacao } from '$lib/regras/indicar';
import dados from '../../fixtures/candidatos-ficticios.json';

const c = (dados as Candidato[])[0];
const RAIZ = 'https://exemplo.org/santinhos';
const LINK = 'https://exemplo.org/santinhos/?n=2201';

function abort(): Error {
  const e = new Error('cancelado');
  e.name = 'AbortError';
  return e;
}

const area = (writeText: unknown) => ({ writeText }) as unknown as Clipboard;

describe('textoIndicacao', () => {
  it('traz nome, partido, número e o link da própria vitrine', () => {
    expect(textoIndicacao(c, RAIZ)).toBe(
      `Tião do Cerrado (PL) — nº 2201, deputado(a) federal por MG, candidato(a) à reeleição.\nConfira: ${LINK}`
    );
  });
});

describe('linkIndicacao e numeroDoLink', () => {
  it('link com e sem barra no fim da raiz dá o mesmo endereço', () => {
    expect(linkIndicacao(c, RAIZ)).toBe(LINK);
    expect(linkIndicacao(c, RAIZ + '/')).toBe(LINK);
    expect(linkIndicacao(c, 'http://localhost:4173')).toBe('http://localhost:4173/?n=2201');
  });
  it('o número volta do link; o que não é número de urna é ignorado', () => {
    expect(numeroDoLink(new URL(LINK).search)).toBe('2201');
    expect(numeroDoLink('')).toBeNull();
    expect(numeroDoLink('?n=22')).toBeNull();
    expect(numeroDoLink('?n=abcd')).toBeNull();
    expect(numeroDoLink('?n=<b>')).toBeNull();
  });
});

describe('indicar', () => {
  it('com share → compartilhado', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await indicar(c, RAIZ, { share, clipboard: area(writeText) })).toBe('compartilhado');
    expect(share).toHaveBeenCalledWith({
      title: c.nome_urna,
      text: textoIndicacao(c, RAIZ),
      url: LINK
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('share rejeita AbortError → cancelado, sem copiar', async () => {
    const writeText = vi.fn();
    const r = await indicar(c, RAIZ, {
      share: vi.fn().mockRejectedValue(abort()),
      clipboard: area(writeText)
    });
    expect(r).toBe('cancelado');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('share falha por outro motivo → tenta copiar', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const r = await indicar(c, RAIZ, {
      share: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      clipboard: area(writeText)
    });
    expect(r).toBe('copiado');
    expect(writeText).toHaveBeenCalledWith(textoIndicacao(c, RAIZ));
  });

  it('sem share → copiado, texto com número e link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await indicar(c, RAIZ, { clipboard: area(writeText) })).toBe('copiado');
    const texto = writeText.mock.calls[0][0] as string;
    expect(texto).toContain('2201');
    expect(texto).toContain(LINK);
  });

  it('clipboard falha → falhou', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('negado'));
    expect(await indicar(c, RAIZ, { clipboard: area(writeText) })).toBe('falhou');
  });

  it('sem share nem clipboard → falhou', async () => {
    expect(await indicar(c, RAIZ, {})).toBe('falhou');
  });
});
