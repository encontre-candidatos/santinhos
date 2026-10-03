// Cenário 12 de spec-filtros.md (WP14/T070): esconder quem tem uma marca, contra o build e os
// dados reais; C-020 (nada guardado nem transmitido), NFR-030 a NFR-032.
import { expect, test, type Page } from '@playwright/test';
import { MARCAS, temAlguma } from '../../src/lib/marcas';
import { abrir, abrirMaisFiltros, busca, candidatos, santinho, santinhos, semCompartilhar, siglasMarcadas, tabAte, todos } from './apoio';

const ctx = { siglasMarcadas };
const bloco = (page: Page) => page.getByRole('group', { name: 'Esconder quem tem' });
const chave = (page: Page, rotulo: string) => bloco(page).getByRole('button', { name: new RegExp(`^${rotulo} \\(`) });
const contar = (id: string) => todos.filter((c) => MARCAS.find((m) => m.id === id)!.tem(c, ctx)).length;
const semMarcas = (ligadas: string[]) => candidatos.filter((c) => !temAlguma(c, ligadas, ctx));

test.describe('Cenário 12: esconder quem tem uma marca', () => {
  test('ao abrir: uma chave por marca, todas desligadas, com a quantidade; todos aparecem', async ({ page }) => {
    await abrir(page);
    await abrirMaisFiltros(page);
    await expect(bloco(page).getByRole('button')).toHaveCount(MARCAS.length);
    for (const m of MARCAS) {
      await expect(chave(page, m.rotulo)).toHaveText(new RegExp(`${m.rotulo}\\s*\\(${contar(m.id)}\\)`));
      await expect(chave(page, m.rotulo)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(santinhos(page)).toHaveCount(candidatos.length);
  });

  test('ligar "Extrema direita" tira os cartões com a marca, e o visor conta', async ({ page }) => {
    await abrir(page);
    await abrirMaisFiltros(page);
    await chave(page, 'Extrema direita').click();
    await expect(chave(page, 'Extrema direita')).toHaveAttribute('aria-pressed', 'true');
    const ficam = semMarcas(['extrema-direita']);
    await expect(santinhos(page)).toHaveCount(ficam.length);
    await expect(page.getByText('EXTREMA DIREITA', { exact: true })).toHaveCount(0);
    const n = candidatos.length - ficam.length;
    await expect(page.getByText(`${n} escondidos pelas marcas`, { exact: true })).toBeVisible();
  });

  test('duas chaves: some quem tem qualquer uma das duas', async ({ page }) => {
    await abrir(page);
    await abrirMaisFiltros(page);
    await chave(page, 'Extrema direita').click();
    await chave(page, 'Apoiou enfraquecer a 6x1').click();
    const ficam = semMarcas(['extrema-direita', 'enfraquecer-6x1']);
    await expect(santinhos(page)).toHaveCount(ficam.length);
    const n = candidatos.length - ficam.length;
    await expect(page.getByText(`${n} escondidos pelas marcas`, { exact: true })).toBeVisible();
  });

  test('mesa vazia avisa, e "Limpar filtros" desliga as chaves também', async ({ page }) => {
    const alvo = candidatos.find((c) => siglasMarcadas.includes(c.partido))!;
    await abrir(page);
    await abrirMaisFiltros(page);
    await chave(page, 'Extrema direita').click();
    await busca(page).fill(alvo.numero_urna);
    await expect(santinhos(page)).toHaveCount(0);
    await expect(page.getByText('Nenhum candidato com esses filtros.')).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(santinhos(page)).toHaveCount(candidatos.length);
    await abrirMaisFiltros(page);
    for (const m of MARCAS) await expect(chave(page, m.rotulo)).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('C-020: nada guardado nem transmitido', () => {
  test('chaves não vão para armazenamento, endereço nem "Indicar"; recarregar desliga tudo', async ({ page, context }) => {
    test.skip(test.info().project.name !== 'chromium', 'clipboard só no projeto chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await semCompartilhar(page);
    await abrir(page);
    const inicio = page.url();
    const antes = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]));
    await abrirMaisFiltros(page);
    for (const m of MARCAS) await chave(page, m.rotulo).click();
    expect(page.url()).toBe(inicio);
    expect(await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]))).toBe(antes);

    const c = semMarcas(MARCAS.map((m) => m.id))[0];
    await santinho(page, c).getByRole('button', { name: /^Indicar/ }).click();
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).not.toMatch(/marca|escond|filtr/i);

    await page.reload();
    await abrirMaisFiltros(page);
    for (const m of MARCAS) await expect(chave(page, m.rotulo)).toHaveAttribute('aria-pressed', 'false');
    await expect(santinhos(page)).toHaveCount(candidatos.length);
  });
});

test.describe('NFR-030 a NFR-032', () => {
  test('ligar uma chave atualiza a mesa em menos de 200 ms (NFR-030)', async ({ page }) => {
    await abrir(page);
    await page.waitForLoadState('networkidle');
    await abrirMaisFiltros(page);
    const ms = await page.evaluate(async () => {
      const b = [...document.querySelectorAll('button')].find((x) => /^\s*Extrema direita/.test(x.textContent ?? ''))!;
      const t0 = performance.now();
      b.click();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      return performance.now() - t0;
    });
    expect(ms).toBeLessThan(200);
  });

  test('só com teclado: Tab chega à chave, Espaço liga e o aria-pressed acompanha (NFR-031)', async ({ page }) => {
    await abrir(page);
    await abrirMaisFiltros(page);
    const alvo = chave(page, 'Votou pouco em 2026');
    // Tab de verdade desde o começo da página, conferindo o foco visível a cada passo.
    await tabAte(page, (el) => el.tagName === 'BUTTON' && (el.textContent ?? '').includes('Votou pouco em 2026'));
    await expect(alvo).toBeFocused();
    await page.keyboard.press('Space');
    await expect(alvo).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(alvo).toHaveAttribute('aria-pressed', 'false');
    const altura = (await alvo.boundingBox())!.height;
    if (test.info().project.name === 'celular') expect(altura).toBeGreaterThanOrEqual(44);
  });

  test('em 360 px o bloco fica em "Mais filtros", fechado, sem rolagem horizontal (NFR-032)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await abrir(page);
    await expect(bloco(page)).toBeHidden();
    await page.getByText('Mais filtros').click();
    await expect(bloco(page)).toBeVisible();
    const [rolagem, janela] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(rolagem).toBeLessThanOrEqual(janela);
  });
});
