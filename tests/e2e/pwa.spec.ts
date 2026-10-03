import { expect, test } from '@playwright/test';

// Fumaça do PWA (FR-013, NFR-001, NFR-006). Só no Chromium desktop: setOffline com
// service worker é confiável ali.
test.describe('PWA', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'chromium', 'só no projeto chromium');
  });

  test('manifest responde com nome, start_url, standalone e ícones 192/512', async ({ request }) => {
    const resp = await request.get('/manifest.webmanifest');
    expect(resp.status()).toBe(200);
    const m = await resp.json();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBe('/');
    expect(m.display).toBe('standalone');
    const tamanhos = (m.icons as { sizes: string }[]).map((i) => i.sizes);
    expect(tamanhos).toContain('192x192');
    expect(tamanhos).toContain('512x512');
  });

  test('service worker fica ativo', async ({ page }) => {
    await page.goto('/');
    const ativo = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active));
    expect(ativo).toBe(true);
  });

  test('recarrega offline depois da primeira visita', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    // espera o SW controlar a página, para o reload passar por ele
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: /Santinhos MG 2026/ })).toBeVisible();
    await context.setOffline(false);
  });
});
