import type { Candidato } from '$lib/tipos';

/**
 * Quem nunca foi eleito para nenhum cargo e não tenta a reeleição fica oculto por padrão
 * (FR-036). Oculto é só estado de exibição: ninguém sai da base (C-015).
 */
export function oculto(c: Candidato): boolean {
  return !c.reeleicao && c.cargos_anteriores.length === 0;
}

/**
 * Busca de número de urna (FR-008, FR-037): 4 dígitos = número exato; 1 a 3 = começo do número
 * (os dois primeiros são o partido); outra coisa = null (busca por nome). Recebe a busca já
 * normalizada.
 */
export function buscaNumero(q: string): string | null {
  return /^\d{1,4}$/.test(q) ? q : null;
}

/** O número completo de um oculto o mostra mesmo com os ocultos escondidos (FR-037). */
export function achadoPeloNumero(c: Candidato, numero: string | null): boolean {
  return numero !== null && numero.length === 4 && c.numero_urna === numero;
}

/**
 * Cartão meio transparente: oculto que só aparece porque a pessoa buscou o número completo
 * (FR-037). Com o botão de ocultos ligado, ninguém fica transparente.
 */
export function transparente(c: Candidato, mostrarOcultos: boolean): boolean {
  return !mostrarOcultos && oculto(c);
}
