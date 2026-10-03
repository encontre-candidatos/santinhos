// Patrimônio declarado ao TSE em 2026, como aparece no cartão (FR-014, T043).
// Reais inteiros, meio real para cima, milhar com ponto: 2500000.5 → "R$ 2.500.001".
// Sem Intl de propósito: o separador e o espaço não dependem do ICU de quem roda.

export const SEM_BENS = 'Nenhum bem declarado';

export function formatarPatrimonio(total: number | null): string {
  if (total === null) return SEM_BENS;
  const reais = Math.floor(total + 0.5);
  return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
