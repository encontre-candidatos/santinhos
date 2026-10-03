// Raio-X da reeleição no cartão (03/10/2026), contra o build e os dados reais. O que cada cartão
// deve mostrar sai de candidatos.json pelas mesmas funções do app ($lib/formatar/raio-x); a
// paridade com a página do Raio-X está em tests/unit/raio-x.test.ts.
import { expect, test } from '@playwright/test';
import { brlCurto, contarAlertas, EXPLICA, linhasRaioX, pct, presenca, presencaAlerta, quaisAlertas } from '../../src/lib/formatar/raio-x';
import { abrir, deputados, marcados, santinho, todos } from './apoio';

const porNome = (n: string) => deputados.find((c) => c.nome_urna === n)!;
const linha = (s: ReturnType<typeof santinho>, rotulo: string) => s.getByRole('button', { name: new RegExp(`^${rotulo}`) });

test.describe('Raio-X: o cartão de quem tenta a reeleição', () => {
  test('todo cartão traz os alertas, o extrato e as quatro votações com o veredito da regra', async ({ page }) => {
    test.setTimeout(180_000);
    await abrir(page);
    for (const c of deputados) {
      const s = santinho(page, c);
      const n = contarAlertas(c);
      const selo = s.locator('.alertas');
      await expect(selo, c.nome_urna).toContainText(`${n}${n === 1 ? 'alerta' : 'alertas'}`);
      await expect(selo, c.nome_urna).toHaveClass(n === 0 ? /zero/ : /tem/);
      if (n > 0) await expect(selo.getByText(`${n} ${n === 1 ? 'alerta' : 'alertas'}: ${quaisAlertas(c).join(', ')}`), c.nome_urna).toHaveCount(1);
      await expect(s.getByText('Presença em 2026', { exact: true }).locator('xpath=following-sibling::dd'), c.nome_urna).toHaveText(
        pct(presenca(c.votacoes_2026))
      );
      await expect(s.getByText(`Patrimônio 2026 (em 2022: ${brlCurto(c.patrimonio_2022)})`, { exact: true }), c.nome_urna).toBeVisible();
      for (const l of linhasRaioX(c)) {
        const b = linha(s, l.rotulo);
        await expect(b, `${c.nome_urna} ${l.rotulo}`).toHaveText(new RegExp(`${l.rotulo}\\s*${l.veredito.replace(/[()]/g, '\\$&')}`));
        await expect(b, `${c.nome_urna} ${l.rotulo}`).toHaveClass(new RegExp(`\\b${l.classe}\\b`));
      }
    }
  });

  test('presença abaixo de 75% em vermelho; sem carimbos nem cinza sobre a foto', async ({ page }) => {
    await abrir(page);
    for (const c of deputados) {
      const s = santinho(page, c);
      const dd = s.getByText('Presença em 2026', { exact: true }).locator('xpath=following-sibling::dd');
      expect(await dd.evaluate((el) => el.classList.contains('alerta')), c.nome_urna).toBe(presencaAlerta(c.votacoes_2026));
      await expect(s.locator('.foto > :not(img):not(.iniciais)'), c.nome_urna).toHaveCount(0);
      const filtro = await s.locator('.foto img, .foto .iniciais').first().evaluate((el) => getComputedStyle(el).filter);
      expect(filtro.includes('grayscale'), c.nome_urna).toBe(false);
    }
  });

  test('extrema direita (FR-006) fica na linha de cima do cartão, em vermelho', async ({ page }) => {
    await abrir(page);
    const re = marcados.filter((c) => c.reeleicao);
    expect(re.length).toBeGreaterThan(0);
    for (const c of deputados) {
      const ed = santinho(page, c).locator('.papel .ed');
      await expect(ed, c.nome_urna).toHaveCount(re.includes(c) ? 1 : 0);
      if (re.includes(c)) await expect(ed).toHaveText('Extrema direita');
    }
  });

  test('o "?" abre a explicação com a regra do alerta; Esc e Fechar fecham e o foco volta', async ({ page }) => {
    await abrir(page);
    const s = santinho(page, porNome('NIKOLAS FERREIRA'));
    const b = linha(s, 'PL da Devastação');
    await b.click();
    const janela = page.getByRole('dialog', { name: 'PL da Devastação' });
    await expect(janela).toBeVisible();
    await expect(janela.getByText(EXPLICA.devastacao.texto, { exact: true })).toBeVisible();
    await expect(janela.getByText(EXPLICA.devastacao.regra, { exact: true })).toBeVisible();
    await expect(janela.getByRole('link', { name: /Ver na Câmara/ })).toHaveAttribute('href', EXPLICA.devastacao.link);
    await page.keyboard.press('Escape');
    await expect(janela).toHaveCount(0);
    await expect(b).toBeFocused();
    await linha(s, 'Reforma tributária').click();
    const outra = page.getByRole('dialog', { name: 'Reforma tributária' });
    await expect(outra.getByText(EXPLICA.reforma.regra, { exact: true })).toBeVisible();
    await outra.getByRole('button', { name: 'Fechar' }).click();
    await expect(outra).toHaveCount(0);
  });

  test('a 360 px o cartão não estoura a largura e as linhas têm 44 px de toque', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await abrir(page);
    const s = santinho(page, porNome('NIKOLAS FERREIRA'));
    for (const l of linhasRaioX(porNome('NIKOLAS FERREIRA'))) {
      const h = await linha(s, l.rotulo).evaluate((el) => (el as HTMLElement).offsetHeight);
      expect(h).toBeGreaterThanOrEqual(44);
    }
    const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(larguras[0]).toBeLessThanOrEqual(larguras[1]);
  });

  test('cartão de quem não tenta a reeleição fica sem Raio-X', async ({ page }) => {
    const c = todos.find((x) => !x.reeleicao && x.cargos_anteriores.length > 0)!;
    await page.goto('/?n=' + c.numero_urna);
    const s = santinho(page, c);
    await expect(s).toBeVisible();
    await expect(s.locator('.alertas')).toHaveCount(0);
    await expect(s.getByRole('button', { name: /^PEC da Blindagem/ })).toHaveCount(0);
  });
});
