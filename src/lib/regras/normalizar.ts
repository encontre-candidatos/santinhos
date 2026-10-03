/**
 * Normaliza texto para busca: sem acento, minúsculo, pontuação vira espaço,
 * espaços colapsados. Usa NFKD (e não só NFD) para que ordinais como "ª" virem "a".
 */
export function normalizar(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
