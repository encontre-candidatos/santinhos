// Qualidade (T034): NFR-002, NFR-003, NFR-004 (axe e teclado) e SC-001 (proxy).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  abrir,
  abrirMaisFiltros,
  busca,
  candidatos,
  casam,
  deputados,
  marcados,
  santinhos,
  semCompartilhar,
  tabAte,
  teclaLimpar,
  verTodos
} from './apoio';

test.describe('NFR-003: 360 px sem rolagem horizontal', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('mesa inteira, com os santinhos marcados', async ({ page }) => {
    await abrir(page);
    const largura = () => page.evaluate(() => document.documentElement.scrollWidth);
    expect(await largura()).toBeLessThanOrEqual(360);
    // a marca "EXTREMA DIREITA" cabe na largura do santinho, sem estourar
    const marcas = page.getByText('EXTREMA DIREITA', { exact: true });
    await expect(marcas).toHaveCount(marcados.length);
    const estouradas = await marcas.evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth + 1).length
    );
    expect(estouradas).toBe(0);
    expect(await largura()).toBeLessThanOrEqual(360);
  });
});

// 30/09/2026: o WP06 achou --muted (#4f5752) sobre --urna a 4,30:1 no tema claro; o token foi
// corrigido para #454c48 (5,09:1) em src/lib/estilo/tokens.css e o teste voltou a ser estrito.

async function axe(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
}

async function preparar(page: Page, tema: 'light' | 'dark', filtrado: boolean) {
  await page.emulateMedia({ colorScheme: tema });
  await abrir(page);
  if (filtrado) {
    await busca(page).fill(marcados[0].nome_urna.split(/\s+/)[0]);
    await expect(santinhos(page).first()).toBeVisible();
  }
}

test.describe('NFR-004: axe WCAG 2 A/AA', () => {
  for (const tema of ['light', 'dark'] as const) {
    for (const filtrado of [false, true]) {
      test(`tema ${tema === 'light' ? 'claro' : 'escuro'}, ${filtrado ? 'com busca' : 'mesa inteira'}`, async ({
        page
      }) => {
        test.setTimeout(120_000); // axe sobre os 221 cartões (WP13) passa de 30 s com a máquina carregada
        await preparar(page, tema, filtrado);
        const r = await axe(page);
        const resumo = r.violations
          .map((v) => ({
            id: v.id,
            alvos: v.nodes.map((n) => `${n.target.join(' ')} — ${n.failureSummary ?? ''}`)
          }))
          .filter((v) => v.alvos.length > 0);
        expect(resumo).toEqual([]);
      });
    }

    // Chave ligada (NFR-031): fundo --tecla, texto --tecla-tx e o "(N)" por cima, nos dois temas.
    test(`tema ${tema === 'light' ? 'claro' : 'escuro'}, com uma chave de "Esconder quem tem" ligada`, async ({ page }) => {
      test.setTimeout(120_000);
      await preparar(page, tema, false);
      await abrirMaisFiltros(page);
      const ligada = page
        .getByRole('group', { name: 'Esconder quem tem' })
        .getByRole('button', { name: /^Extrema direita \(/ });
      await ligada.click();
      await expect(ligada).toHaveAttribute('aria-pressed', 'true');
      const r = await axe(page);
      const resumo = r.violations.map((v) => ({
        id: v.id,
        alvos: v.nodes.map((n) => `${n.target.join(' ')} — ${n.failureSummary ?? ''}`)
      }));
      expect(resumo).toEqual([]);
    });
  }
});

test('teclado: busca, Limpar filtros e Indicar só com Tab/Enter/Espaço, foco sempre visível', async ({
  page,
  context,
  browserName
}) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await semCompartilhar(page);
  await abrir(page);

  const alvo = candidatos[0];
  const termo = alvo.nome_urna.split(/\s+/)[0];

  await tabAte(page, (el) => el.id === 'busca');
  await page.keyboard.type(termo);
  await expect(busca(page)).toHaveValue(termo);
  await expect(santinhos(page)).toHaveCount(casam(candidatos, termo).length);

  await tabAte(page, (el) => el.tagName === 'BUTTON' && /^Limpar filtros/.test(el.textContent ?? ''));
  await page.keyboard.press('Space');
  await expect(busca(page)).toHaveValue('');
  await expect(teclaLimpar(page)).toHaveCount(0);
  await expect(busca(page)).toBeFocused();
  await expect(santinhos(page)).toHaveCount(candidatos.length);

  await tabAte(page, (el) => el.tagName === 'BUTTON' && /^Indicar/.test(el.textContent ?? ''));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText(/Copiado: .+\. Cole na conversa\.|Selecione e copie/);
});

test('NFR-002: busca e Limpar filtros atualizam a lista em menos de 200 ms', async ({ page }) => {
  await abrir(page);
  // Mede a interação, não a carga: com 221 cartões, fotos e pré-cache ainda ocupavam a página (WP13).
  await page.waitForLoadState('networkidle');
  const termo = candidatos[0].nome_urna.split(/\s+/)[0];
  const esperado = casam(candidatos, termo).length;

  const msBusca = await page.evaluate(
    async ({ termo, esperado }) => {
      const input = document.getElementById('busca') as HTMLInputElement;
      const t0 = performance.now();
      input.value = termo;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      // Mesa em lotes (WP13): no primeiro quadro entram até 12; o resto completa depois.
      const n = document.querySelectorAll('article:not([hidden])').length;
      if (n !== Math.min(esperado, 12)) throw new Error(`lista não atualizada: ${n} ≠ ${Math.min(esperado, 12)}`);
      return performance.now() - t0;
    },
    { termo, esperado }
  );
  expect(msBusca).toBeLessThan(200);

  const msCorrige = await page.evaluate(async (total) => {
    const botao = [...document.querySelectorAll('button')].find((b) =>
      /^Limpar filtros/.test(b.textContent ?? '')
    )!;
    const t0 = performance.now();
    botao.click();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const n = document.querySelectorAll('article:not([hidden])').length;
    if (n < Math.min(total, 12)) throw new Error(`lista não atualizada: ${n} < ${Math.min(total, 12)}`);
    return performance.now() - t0;
  }, candidatos.length);
  expect(msCorrige).toBeLessThan(200);
  await expect(santinhos(page)).toHaveCount(candidatos.length);
});

test('SC-001 (proxy): lista inteira visível em menos de 3 s no celular', async ({ page }) => {
  test.skip(test.info().project.name !== 'celular', 'medida só no perfil celular');
  const t0 = Date.now();
  await page.goto('/');
  await expect(santinhos(page).first()).toBeVisible();
  await expect(santinhos(page)).toHaveCount(deputados.length);
  // A lista inteira de antes (221) fica a um toque, em "Todos os candidatos" (WP17).
  await verTodos(page);
  expect(Date.now() - t0).toBeLessThan(3000);
});
