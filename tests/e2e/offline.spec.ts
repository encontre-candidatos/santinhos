// Offline e instalação (T035), só no Chromium desktop: setOffline com service worker é
// confiável ali. A troca de versão do SW (NFR-007) é teste manual: docs/revisao-design.md.
import { expect, test } from '@playwright/test';
import {
  abrir,
  busca,
  candidatos,
  deputados,
  santinho,
  casam,
  santinhos,
  teclaLimpar,
  verTodos,
  visorContagem
} from './apoio';

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'chromium', 'só no projeto chromium');
});

test('NFR-001: depois da primeira visita, a vitrine funciona sem rede', async ({ page, context }) => {
  await abrir(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // para o SW controlar a página
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Santinhos MG 2026/ })).toBeVisible();
    await verTodos(page);
    await expect(visorContagem(page, candidatos.length)).toBeVisible();

    // ao menos uma foto vem do cache: a de um deputado (as do TSE ficam fora do pré-cache, NFR-022)
    const primeira = santinho(page, deputados[0]).getByRole('img', { name: /^Foto de / });
    await primeira.scrollIntoViewIfNeeded();
    await expect
      .poll(() => primeira.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);

    const termo = candidatos[0].nome_urna.split(/\s+/)[0];
    await busca(page).fill(termo);
    await expect(santinhos(page)).toHaveCount(casam(candidatos, termo).length);

    await teclaLimpar(page).click();
    await expect(santinhos(page)).toHaveCount(candidatos.length);
  } finally {
    await context.setOffline(false);
  }
});

test('NFR-006 (automatizável): manifest standalone com ícone maskable e apple-touch-icon', async ({
  page,
  request
}) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const m = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(m.display).toBe('standalone');
  const icones = m.icons as { purpose?: string; src: string }[];
  expect(icones.some((i) => (i.purpose ?? '').split(/\s+/).includes('maskable'))).toBe(true);

  const toque = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(toque).toBeTruthy();
  const r = await request.get(new URL(toque!, page.url()).toString());
  expect(r.status()).toBe(200);
});
