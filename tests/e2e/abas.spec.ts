// Cenário 14 da spec (WP17/T080): abrir na reeleição, com "Todos os candidatos" a um toque;
// FR-065 a FR-069 e NFR-042, contra o build e os dados reais.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  abrirMaisFiltros,
  abrirReeleicao,
  busca,
  candidatos,
  casam,
  deputados,
  santinho,
  santinhos,
  siglasMarcadas,
  teclaLimpar,
  teclaReeleicao,
  teclaTodos,
  todos,
  verTodos
} from './apoio';

const AVISO = 'Esse número é de quem não tenta a reeleição.';
const botaoVerEmTodos = (page: Page) => page.getByRole('button', { name: 'Ver em Todos os candidatos', exact: true });
const visor = (page: Page, exibidos: number, total: number) =>
  page.getByRole('complementary', { name: 'Filtros' }).getByText(`${exibidos} de ${total}`, { exact: true });

/** Números de urna da mesa, na ordem em que aparecem, depois de a mesa completar `n` cartões. */
async function ordem(page: Page, n: number): Promise<string[]> {
  await expect(santinhos(page)).toHaveCount(n);
  return santinhos(page).evaluateAll((arts) =>
    arts.map((a) => a.querySelector('[aria-label^="Número "]')!.getAttribute('aria-label')!.slice(7))
  );
}

/** Quem não tenta a reeleição, já teve cargo e tem número só seu (aparece em "Todos" sem mexer nos ocultos). */
const foraDaReeleicao = candidatos.find(
  (c) => !c.reeleicao && todos.filter((o) => o.numero_urna === c.numero_urna).length === 1
)!;

test.describe('Cenário 14: começar pela reeleição e escolher ver todos', () => {
  test('base: 48 na reeleição, 756 ao todo', () => {
    expect(deputados).toHaveLength(48);
    expect(todos).toHaveLength(756);
  });

  test('ao abrir: "Reeleição" marcada e só os da reeleição na mesa (FR-065, FR-066)', async ({ page }) => {
    await abrirReeleicao(page);
    await expect(teclaReeleicao(page)).toHaveText(`Reeleição (${deputados.length})`);
    await expect(teclaTodos(page)).toHaveText(`Todos os candidatos (${todos.length})`);
    await expect(teclaReeleicao(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(teclaTodos(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('group', { name: 'Quais candidatos ver' })).toBeVisible();
    await expect(visor(page, deputados.length, deputados.length)).toBeVisible();
    const numeros = new Set(deputados.map((c) => c.numero_urna));
    for (const n of await ordem(page, deputados.length)) expect(numeros.has(n), n).toBe(true);
    // Não há ocultos entre os da reeleição: o botão de ocultos não aparece.
    await expect(page.getByRole('button', { name: /quem nunca teve cargo/ })).toHaveCount(0);
  });

  test('um toque em "Todos" segue as regras do WP13, sem recarregar e na mesma ordem (FR-067)', async ({ page }) => {
    await abrirReeleicao(page);
    const antes = await ordem(page, deputados.length);
    await page.evaluate(() => ((window as unknown as { marcaSemRecarregar: boolean }).marcaSemRecarregar = true));
    await verTodos(page);
    await expect(teclaTodos(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(teclaReeleicao(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(visor(page, candidatos.length, todos.length)).toBeVisible();
    await expect(page.getByRole('button', { name: /quem nunca teve cargo/ })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { marcaSemRecarregar?: boolean }).marcaSemRecarregar)).toBe(true);
    // A ordem sorteada é uma só: os da reeleição ficam na mesma ordem relativa.
    const depois = await ordem(page, candidatos.length);
    const daReeleicao = new Set(antes);
    expect(depois.filter((n) => daReeleicao.has(n))).toEqual(antes);
  });

  test('voltar para "Reeleição": busca, partido e chave de marca continuam e valem sobre os 48 (FR-067)', async ({ page }) => {
    // Partido sem a marca: a chave "Extrema direita" ligada não esvazia a mesa.
    const sigla = deputados.find((c) => !siglasMarcadas.includes(c.partido))!.partido;
    await abrirReeleicao(page);
    await verTodos(page);
    await abrirMaisFiltros(page);
    await page.getByRole('button', { name: sigla, exact: true }).click();
    const chave = page.getByRole('button', { name: /^Extrema direita/ });
    await chave.click();
    await expect(chave).toHaveAttribute('aria-pressed', 'true');

    await teclaReeleicao(page).click();
    await expect(page.getByRole('button', { name: sigla, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(chave).toHaveAttribute('aria-pressed', 'true');
    const esperados = new Set(deputados.filter((c) => c.partido === sigla).map((c) => c.numero_urna));
    expect(new Set(await ordem(page, esperados.size))).toEqual(esperados);

    const termo = deputados[0].nome_urna.split(/\s+/)[0];
    await page.getByRole('button', { name: sigla, exact: true }).click();
    await chave.click();
    await busca(page).fill(termo);
    await expect(santinhos(page)).toHaveCount(casam(deputados, termo).length);
    await teclaTodos(page).click();
    await expect(busca(page)).toHaveValue(termo);
    await expect(santinhos(page)).toHaveCount(casam(candidatos, termo).length);
  });

  test('"Limpar filtros" não mexe na opção do topo', async ({ page }) => {
    await abrirReeleicao(page);
    await busca(page).fill('silva');
    await teclaLimpar(page).click();
    await expect(teclaReeleicao(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(santinhos(page)).toHaveCount(deputados.length);

    await verTodos(page);
    await busca(page).fill('silva');
    await teclaLimpar(page).click();
    await expect(teclaTodos(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(santinhos(page)).toHaveCount(candidatos.length);
  });

  test('número de quem não tenta a reeleição: aviso e "Ver em Todos os candidatos" (FR-068)', async ({ page }) => {
    await abrirReeleicao(page);
    await busca(page).fill(foraDaReeleicao.numero_urna);
    await expect(page.getByText(AVISO, { exact: true })).toBeVisible();
    await expect(santinhos(page)).toHaveCount(0);
    await expect(page.getByText('Nenhum candidato com esses filtros.')).toHaveCount(0);

    // O aviso fica numa região viva, para o leitor de tela anunciar (FR-068).
    await expect(page.locator('[aria-live="polite"]').getByText(AVISO, { exact: true })).toBeVisible();
    await botaoVerEmTodos(page).focus();
    await page.keyboard.press('Enter');
    await expect(teclaTodos(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(busca(page)).toHaveValue(foraDaReeleicao.numero_urna);
    // O botão some com o aviso: o foco volta à busca, não ao <body>.
    await expect(busca(page)).toBeFocused();
    await expect(santinho(page, foraDaReeleicao)).toHaveCount(1);
    await expect(page.getByText(AVISO)).toHaveCount(0);
  });

  test('com outro partido escolhido, o número de fora da reeleição não mostra o aviso', async ({ page }) => {
    const outro = deputados.find((c) => c.partido !== foraDaReeleicao.partido)!.partido;
    await abrirReeleicao(page);
    await abrirMaisFiltros(page);
    await page.getByRole('button', { name: outro, exact: true }).click();
    await busca(page).fill(foraDaReeleicao.numero_urna);
    await expect(page.getByText('Nenhum candidato com esses filtros.')).toBeVisible();
    await expect(page.getByText(AVISO)).toHaveCount(0);
  });

  test('número parcial ou de quem tenta a reeleição não mostra o aviso', async ({ page }) => {
    await abrirReeleicao(page);
    await busca(page).fill(foraDaReeleicao.numero_urna.slice(0, 3));
    await expect(page.getByText(AVISO)).toHaveCount(0);
    await busca(page).fill(deputados[0].numero_urna);
    await expect(santinho(page, deputados[0])).toHaveCount(1);
    await expect(page.getByText(AVISO)).toHaveCount(0);
  });

  test('recarregar volta para "Reeleição"; nada no aparelho nem no endereço (FR-069)', async ({ page }) => {
    await abrirReeleicao(page);
    const inicio = page.url();
    await verTodos(page);
    expect(page.url()).toBe(inicio);
    expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    await page.reload();
    await expect(teclaReeleicao(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(santinhos(page)).toHaveCount(deputados.length);
  });
});

test.describe('NFR-042: troca de opção', () => {
  test('com CPU 4× mais lenta e os 756, trocar atualiza a mesa em menos de 300 ms', async ({ page }) => {
    test.skip(test.info().project.name !== 'celular', 'medida só no perfil celular (Chromium)');
    await abrirReeleicao(page);
    await page.waitForLoadState('networkidle');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    try {
      const medir = (rotulo: RegExp) =>
        page.evaluate(async (fonte) => {
          const re = new RegExp(fonte);
          const b = [...document.querySelectorAll('button')].find((x) => re.test(x.textContent?.trim() ?? ''))!;
          const t0 = performance.now();
          b.click();
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          return performance.now() - t0;
        }, rotulo.source);
      // Espera a mesa assentar: cartão que sai fica escondido e é desmontado aos poucos (WP13);
      // medir no meio disso mede a desmontagem, não a troca.
      const assentar = (n: number) =>
        expect.poll(() => page.evaluate(() => document.querySelectorAll('article').length), { timeout: 30_000 }).toBe(n);
      const tempos: Record<string, number> = {};
      tempos.paraTodos = await medir(/^Todos os candidatos \(/);
      await assentar(candidatos.length);
      tempos.paraReeleicao = await medir(/^Reeleição \(/);
      await assentar(deputados.length);
      // Com os ocultos à mostra, os 756 na mesa.
      await medir(/^Todos os candidatos \(/);
      await page.getByRole('button', { name: /quem nunca teve cargo/ }).click();
      await assentar(todos.length);
      tempos.de756ParaReeleicao = await medir(/^Reeleição \(/);
      await assentar(deputados.length);
      tempos.paraOs756 = await medir(/^Todos os candidatos \(/);
      console.log('NFR-042 (ms, CPU 4×):', JSON.stringify(tempos));
      for (const [k, ms] of Object.entries(tempos)) expect(ms, k).toBeLessThan(300);
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });

  test('teclado: Tab chega às duas opções, foco visível, Espaço e Enter trocam', async ({ page }) => {
    await abrirReeleicao(page);
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      if (await teclaTodos(page).evaluate((el) => el === document.activeElement)) break;
    }
    await expect(teclaTodos(page)).toBeFocused();
    expect(await teclaTodos(page).evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await page.keyboard.press('Space');
    await expect(teclaTodos(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(santinhos(page)).toHaveCount(candidatos.length);
    await page.keyboard.press('Shift+Tab');
    await expect(teclaReeleicao(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(teclaReeleicao(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(santinhos(page)).toHaveCount(deputados.length);
  });

  for (const tema of ['light', 'dark'] as const) {
    test(`axe WCAG 2 A/AA nas duas opções, tema ${tema === 'light' ? 'claro' : 'escuro'}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
      await abrirReeleicao(page);
      await page.evaluate(() => document.fonts.ready);
      const violacoes = async () =>
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.map((v) => ({
          id: v.id,
          alvos: v.nodes.map((n) => n.target.join(' '))
        }));
      expect(await violacoes()).toEqual([]);
      await busca(page).fill(foraDaReeleicao.numero_urna);
      await expect(page.getByText(AVISO, { exact: true })).toBeVisible();
      expect(await violacoes()).toEqual([]);
      // "Todos" (221 cartões) já passa pelo axe em qualidade.spec.ts, que abre nessa opção.
    });
  }

  test.describe('360 px', () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test('as duas opções à vista sem rolar, com 44 px de toque, e sem rolagem horizontal', async ({ page }) => {
      await abrirReeleicao(page);
      for (const tecla of [teclaReeleicao(page), teclaTodos(page)]) {
        const caixa = (await tecla.boundingBox())!;
        expect(caixa.y + caixa.height).toBeLessThanOrEqual(740);
        expect(caixa.height).toBeGreaterThanOrEqual(44);
      }
      const largura = () => page.evaluate(() => document.documentElement.scrollWidth);
      expect(await largura()).toBeLessThanOrEqual(360);
      await verTodos(page);
      expect(await largura()).toBeLessThanOrEqual(360);
    });
  });
});
