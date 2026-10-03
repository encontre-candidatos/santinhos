// Colinha (versão 4310, docs/eleitor-indeciso.md, melhoria 6): "Vou votar neste" guarda o número
// no aparelho (localStorage, chave `colinha`) e abre a tela tipo urna; a etiqueta do topo reabre.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { abrir, semCompartilhar } from './apoio';

const colinha = (page: Page) => page.getByRole('dialog', { name: 'Sua colinha' });

/** Guia no caminho mais curto e "Vou votar neste" no primeiro nome; devolve nome e número escolhidos. */
async function escolherPeloGuia(page: Page) {
  await abrir(page);
  await page.getByRole('button', { name: /Me ajude a escolher/ }).click();
  const guia = page.getByRole('dialog');
  await guia.getByRole('button', { name: 'Pular' }).click();
  await guia.getByRole('button', { name: /tanto faz/ }).click();
  await guia.getByRole('button', { name: 'Pular' }).click();
  await guia.getByRole('button', { name: 'Ver resultado' }).click();
  const botao = guia.getByRole('button', { name: /^Vou votar neste/ }).first();
  const rotulo = (await botao.getAttribute('aria-label')) ?? (await botao.textContent())!;
  const [, nome, numero] = rotulo.match(/Vou votar neste: (.+), (\d{4})$/)!;
  await botao.click();
  return { nome, numero };
}

test('"Vou votar neste" abre a colinha com número grande, nome, partido e o aviso da cabine', async ({ page }) => {
  const { nome, numero } = await escolherPeloGuia(page);
  await expect(colinha(page)).toBeVisible();
  await expect(colinha(page).getByRole('img', { name: new RegExp(`número ${numero}, ${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toBeVisible();
  await expect(colinha(page).getByText('Deputado federal', { exact: true })).toBeVisible();
  await expect(colinha(page).getByText('Celular não entra na cabine: anote o número no papel ou decore.')).toBeVisible();
  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('colinha') ?? 'null'));
  expect(guardado).toMatchObject({ numero_urna: numero, nome_urna: nome });
});

test('etiqueta "Sua colinha" fica depois de fechar e de recarregar; reabre; "Trocar" apaga', async ({ page }) => {
  const { numero } = await escolherPeloGuia(page);
  await colinha(page).getByRole('button', { name: 'Fechar' }).click();
  await expect(colinha(page)).toHaveCount(0);
  const etiqueta = page.getByRole('button', { name: new RegExp(`Sua colinha: ${numero}`) });
  await expect(etiqueta).toBeVisible();

  await page.reload();
  await expect(etiqueta).toBeVisible();
  await etiqueta.click();
  await expect(colinha(page)).toBeVisible();
  await colinha(page).getByRole('button', { name: 'Fechar' }).click();

  await page.getByRole('button', { name: 'Trocar', exact: true }).click();
  await expect(etiqueta).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('colinha'))).toBeNull();
});

test('Compartilhar sem Web Share copia o texto, com o número', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'permissão de área de transferência só no Chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await semCompartilhar(page);
  const { nome, numero } = await escolherPeloGuia(page);
  await colinha(page).getByRole('button', { name: 'Compartilhar' }).click();
  await expect(page.getByRole('status')).toContainText(`Copiado: ${nome}`);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`número *${numero}*`);
});

test('na impressão sai só o papel da colinha', async ({ page }) => {
  await escolherPeloGuia(page);
  await page.emulateMedia({ media: 'print' });
  const visivel = (sel: string) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).visibility === 'visible');
  expect(await visivel('.colinha-papel')).toBe(true);
  expect(await visivel('article')).toBe(false);
  expect(await visivel('.cabine')).toBe(false);
});

test('sem armazenamento (bloqueado), a colinha abre do mesmo jeito e nada quebra', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('bloqueado', 'SecurityError');
      }
    });
  });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await escolherPeloGuia(page);
  await expect(colinha(page)).toBeVisible();
  expect(erros).toEqual([]);
});

test('colinha sem violações do axe', async ({ page }) => {
  test.setTimeout(120_000);
  await escolherPeloGuia(page);
  const r = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

test.describe('360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  test('colinha cabe sem rolagem horizontal', async ({ page }) => {
    await escolherPeloGuia(page);
    expect(await colinha(page).evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(360);
  });
});
