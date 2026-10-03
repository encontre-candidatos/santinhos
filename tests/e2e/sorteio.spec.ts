// Cenário 13 (WP15/T074): mesa em ordem sorteada a cada abertura, estável sob filtro; FR-061 e SC-030.
import { expect, test, type Page } from '@playwright/test';
import { textoIndicacao } from '../../src/lib/regras/indicar';
import { abrir, abrirMaisFiltros, busca, candidatos, santinho, santinhos, semCompartilhar, todos, verTodos } from './apoio';

/**
 * Números de urna da mesa, na ordem em que aparecem, depois de a mesa completar `n` cartões.
 * A mesa entra em lotes por quadro (NFR-020); com a máquina carregada, 756 cartões passam dos 5 s padrão.
 */
async function ordem(page: Page, n: number): Promise<string[]> {
  await expect(santinhos(page)).toHaveCount(n, { timeout: 60_000 }); // os 756 cartões montam aos poucos; com a máquina carregada passam dos 5 s do expect
  return santinhos(page).evaluateAll((arts) =>
    arts.map((a) => a.querySelector('[aria-label^="Número "]')!.getAttribute('aria-label')!.slice(7))
  );
}
const relativa = (lista: string[], manter: Set<string>) => lista.filter((n) => manter.has(n));

test.describe('Cenário 13: mesa sem ninguém fixo no topo', () => {
  test('duas aberturas dão ordens diferentes, e nenhuma é a ordem de nome', async ({ page }) => {
    await abrir(page);
    const a = (await ordem(page, candidatos.length)).slice(0, 20);
    await page.reload();
    await verTodos(page);
    const b = (await ordem(page, candidatos.length)).slice(0, 20);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(candidatos.slice(0, 20).map((c) => c.numero_urna));
  });

  test('buscar e apagar volta à mesma ordem; partido e ocultos mantêm a ordem relativa (FR-060)', async ({ page }) => {
    test.setTimeout(180_000);
    await abrir(page);
    const inicial = await ordem(page, candidatos.length);

    await busca(page).fill(candidatos[0].nome_urna.split(/\s+/)[0]);
    await busca(page).fill('');
    expect(await ordem(page, candidatos.length)).toEqual(inicial);

    const sigla = 'PT';
    const doPartido = new Set(candidatos.filter((c) => c.partido === sigla).map((c) => c.numero_urna));
    await abrirMaisFiltros(page);
    await page.getByRole('button', { name: sigla, exact: true }).click();
    expect(await ordem(page, doPartido.size)).toEqual(relativa(inicial, doPartido));
    await page.getByRole('button', { name: sigla, exact: true }).click();

    await page.getByRole('complementary', { name: 'Filtros' }).getByRole('button', { name: /quem nunca teve cargo/ }).click();
    const comOcultos = await ordem(page, todos.length);
    expect(relativa(comOcultos, new Set(inicial))).toEqual(inicial);
  });

  test('a ordem não vai para armazenamento, endereço nem "Indicar"; o rodapé explica (FR-061)', async ({ page, context }) => {
    test.skip(test.info().project.name !== 'chromium', 'clipboard só no projeto chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await semCompartilhar(page);
    await abrir(page);
    expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    const c = candidatos[0];
    await santinho(page, c).getByRole('button', { name: /^Indicar/ }).click();
    // A área de transferência do Windows devolve CRLF.
    const copiado = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
    expect(copiado).toBe(textoIndicacao(c, page.url()));
    await expect(page.getByRole('contentinfo').getByText('A ordem dos candidatos é sorteada a cada vez que a página abre.', { exact: true })).toBeVisible();
  });

  test('SC-030: em 20 aberturas, ninguém aparece em primeiro mais de 2 vezes', async ({ page }) => {
    test.skip(test.info().project.name !== 'chromium', 'uma vez basta');
    test.setTimeout(180_000);
    const primeiros = new Map<string, number>();
    await abrir(page);
    for (let i = 0; i < 20; i++) {
      // Em "Todos" (221), como antes do WP17: com os 48 da reeleição, um sorteio perfeito passa de 2
      // em ~40% das séries de 20 (SC-030 foi escrito para a mesa de 221).
      if (i > 0) {
        await page.reload();
        await verTodos(page);
      }
      await expect(santinhos(page).first()).toBeVisible({ timeout: 15_000 });
      const n = (await santinhos(page).first().locator('[aria-label^="Número "]').getAttribute('aria-label'))!.slice(7);
      primeiros.set(n, (primeiros.get(n) ?? 0) + 1);
    }
    expect(Math.max(...primeiros.values())).toBeLessThanOrEqual(2);
  });
});
