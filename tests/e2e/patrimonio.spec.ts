// Cenário 6 da spec (T045): patrimônio declarado no cartão, contra o build e os dados reais.
// O valor esperado sai de candidatos.json pelo mesmo formatador do app; "Nenhum bem declarado"
// só é exercitado aqui se a base tiver alguém sem bens (em 02/10/2026, ninguém): o caso null
// está coberto em tests/unit/patrimonio.test.ts.
import { expect, test } from '@playwright/test';
import { formatarPatrimonio, SEM_BENS } from '../../src/lib/formatar/patrimonio';
import { brlCurto } from '../../src/lib/formatar/raio-x';
import { abrir, candidatos, santinho } from './apoio';

test.describe('Cenário 6: ver o patrimônio declarado', () => {
  test('todo cartão mostra rótulo e valor total, sem a referência TSE 2026', async ({ page }) => {
    test.setTimeout(180_000); // 221 cartões conferidos um a um desde o WP13
    await abrir(page);
    for (const c of candidatos) {
      const s = santinho(page, c);
      if (c.reeleicao) {
        // Raio-X (03/10/2026): extrato com 2026 e 2022, valores curtos como na página do Raio-X.
        await expect(s.locator('dt').getByText(`Patrimônio 2026 (em 2022: ${brlCurto(c.patrimonio_2022)})`), c.nome_urna).toBeVisible();
        await expect(s.locator('dd').getByText(brlCurto(c.patrimonio_total), { exact: true }), c.nome_urna).toBeVisible();
        continue;
      }
      // Só no rótulo (dt): o carimbo do WP09 também diz "PATRIMÔNIO DECLARADO".
      await expect(s.locator('dt').getByText('Patrimônio declarado'), c.nome_urna).toBeVisible();
      await expect(s.getByText('TSE 2026', { exact: true })).toHaveCount(0);
      const valor = s.getByText(formatarPatrimonio(c.patrimonio_total), { exact: true });
      await expect(valor, c.nome_urna).toBeVisible();
      if (c.patrimonio_total === null) await expect(s.getByText(SEM_BENS, { exact: true })).toBeVisible();
      else await expect(valor).toHaveText(/^R\$ \d{1,3}(\.\d{3})*$/);
    }
  });

  test('o maior patrimônio cabe no cartão sem rolagem lateral a 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await abrir(page);
    const maior = candidatos.reduce((a, b) => ((b.patrimonio_total ?? 0) > (a.patrimonio_total ?? 0) ? b : a));
    const s = santinho(page, maior);
    await s.scrollIntoViewIfNeeded();
    const caixaCartao = (await s.boundingBox())!;
    const texto = maior.reeleicao ? brlCurto(maior.patrimonio_total) : formatarPatrimonio(maior.patrimonio_total);
    const caixaValor = (await s.getByText(texto, { exact: true }).boundingBox())!;
    expect(caixaValor.x + caixaValor.width).toBeLessThanOrEqual(caixaCartao.x + caixaCartao.width + 1);
    const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(larguras[0]).toBeLessThanOrEqual(larguras[1]);
  });
});
