// Guia "Me ajude a escolher" (versão 4310, docs/eleitor-indeciso.md, melhoria 1). Os números
// esperados saem dos JSON reais; a regra de pontos tem teste unitário em tests/unit/guia.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Candidato, Municipio } from '../../src/lib/tipos';
import { abrir, deputados, santinho } from './apoio';

const municipios = JSON.parse(
  readFileSync(new URL('../../src/lib/dados/municipios.json', import.meta.url), 'utf-8')
) as Municipio[];
const MONTES_CLAROS = municipios.find((m) => m.nome === 'Montes Claros')!;

/** Mesma régua de src/lib/formatar/governo.ts. */
const de10 = (c: Candidato) => {
  const g = c.governo_2026;
  if (!g) return null;
  if (g.com === g.total) return 10;
  if (g.com === 0) return 0;
  return Math.max(1, Math.min(9, Math.round((g.com / g.total) * 10)));
};
const blindou = (c: Candidato) => !!c.blindagem && (c.blindagem.t1 === 'sim' || c.blindagem.t2 === 'sim');

const guia = (page: Page) => page.getByRole('dialog');
const opcao = (page: Page, nome: RegExp | string) => guia(page).getByRole('button', { name: nome });

async function abrirGuia(page: Page) {
  await abrir(page);
  await page.getByRole('button', { name: /Me ajude a escolher/ }).click();
  await expect(guia(page)).toBeVisible();
}

test('o botão do guia é a primeira coisa da página, acima do painel e dos cartões', async ({ page }) => {
  await abrir(page);
  const botao = page.getByRole('button', { name: /Me ajude a escolher/ });
  const b = (await botao.boundingBox())!;
  const painel = (await page.getByRole('complementary', { name: 'Filtros' }).boundingBox())!;
  const cartao = (await page.getByRole('article').first().boundingBox())!;
  expect(b.y).toBeLessThan(painel.y);
  expect(b.y).toBeLessThan(cartao.y);
  await page.keyboard.press('Tab');
  await expect(botao).toBeFocused();
});

test('fluxo completo: cidade sem acento, lado, 2 prioridades, marca descartada e até 5 nomes com motivos', async ({ page }) => {
  await abrirGuia(page);
  await expect(guia(page).getByText('1 de 4', { exact: true })).toBeVisible();
  await guia(page).getByRole('searchbox', { name: 'Sua cidade' }).fill('MONTES cla');
  await opcao(page, 'Montes Claros').click();

  await expect(guia(page).getByText('2 de 4', { exact: true })).toBeVisible();
  await expect(guia(page).getByRole('heading', { name: /você prefere alguém que/ })).toBeFocused();
  await opcao(page, /vote com o governo Lula/).click();

  await expect(guia(page).getByText('3 de 4', { exact: true })).toBeVisible();
  await opcao(page, /Trabalho e salário/).click();
  await opcao(page, /Que seja da minha região/).click();
  // No máximo 2: com duas marcadas, as outras ficam indisponíveis.
  await expect(opcao(page, /Que trabalhe e vote/)).toHaveAttribute('aria-disabled', 'true');
  await expect(opcao(page, /Que trabalhe e vote/)).toHaveAttribute('aria-pressed', 'false');
  await guia(page).getByRole('button', { name: 'Continuar' }).click();

  await expect(guia(page).getByText('4 de 4', { exact: true })).toBeVisible();
  await opcao(page, /Votou para dificultar processo contra deputado/).click();
  await guia(page).getByRole('button', { name: 'Ver resultado' }).click();

  await expect(guia(page).getByText('A ordem vem das suas respostas. Ninguém pagou para aparecer aqui.')).toBeVisible();
  const itens = guia(page).getByRole('listitem').filter({ has: page.getByRole('button', { name: /Vou votar neste/ }) });
  const n = await itens.count();
  const elegiveis = deputados.filter((c) => (de10(c) ?? 0) >= 6 && !blindou(c));
  expect(n).toBe(Math.min(5, elegiveis.length));
  const nomes = new Set(elegiveis.map((c) => c.nome_urna));
  for (const nome of await itens.getByRole('heading', { level: 3 }).allTextContents()) expect(nomes.has(nome), nome).toBe(true);
  // Cada nome com 1 a 3 motivos, em palavras simples.
  for (let i = 0; i < n; i++) {
    const motivos = itens.nth(i).getByRole('list', { name: 'Por que aparece' }).getByRole('listitem');
    const k = await motivos.count();
    expect(k).toBeGreaterThanOrEqual(1);
    expect(k).toBeLessThanOrEqual(3);
  }
  await expect(guia(page).getByText(/Votou com o governo em \d+ de cada 10 votações/).first()).toBeVisible();
});

test('Voltar volta um passo e mantém a resposta; Esc fecha', async ({ page }) => {
  await abrirGuia(page);
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await opcao(page, /tanto faz/).click();
  await expect(guia(page).getByText('3 de 4', { exact: true })).toBeVisible();
  await guia(page).getByRole('button', { name: 'Voltar' }).click();
  await expect(guia(page).getByText('2 de 4', { exact: true })).toBeVisible();
  await expect(opcao(page, /tanto faz/)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(guia(page)).toHaveCount(0);
});

test('"tanto faz" sem prioridades: todos empatam e o guia diz que a ordem é sorteio', async ({ page }) => {
  await abrirGuia(page);
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await opcao(page, /tanto faz/).click();
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await guia(page).getByRole('button', { name: 'Ver resultado' }).click();
  await expect(guia(page).getByText('Suas respostas não separam esses candidatos: a ordem é sorteio.')).toBeVisible();
  await expect(guia(page).getByRole('button', { name: /Vou votar neste/ })).toHaveCount(5);
});

test('ninguém combina: diz isso e oferece não descartar ninguém', async ({ page }) => {
  // "contra o governo" + descartar todas as marcas: conferido nos dados que ninguém sobra.
  const contra = deputados.filter((c) => (de10(c) ?? 10) <= 4);
  test.skip(contra.length === 0, 'base sem ninguém do lado "contra"');
  await abrirGuia(page);
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await opcao(page, /vote contra o governo Lula/).click();
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  for (const nome of [/^Extrema direita/, /^Votou para dificultar/, /^Patrimônio multiplicado/, /^Apoiou enfraquecer/]) await opcao(page, nome).click();
  await guia(page).getByRole('button', { name: 'Ver resultado' }).click();
  await expect(guia(page).getByRole('heading', { name: 'Ninguém combinou com tudo' })).toBeVisible();
  await guia(page).getByRole('button', { name: 'Não descartar ninguém' }).click();
  await expect(guia(page).getByRole('button', { name: /Vou votar neste/ })).toHaveCount(Math.min(5, contra.length));
});

test('"Ver todos os candidatos" volta à vitrine com a cidade: o cartão diz a posição dele nela em 2022', async ({ page }) => {
  const c = deputados.find((d) => d.regiao_2022?.top[MONTES_CLAROS.cd])!;
  const [votos, pos] = c.regiao_2022!.top[MONTES_CLAROS.cd];
  await abrirGuia(page);
  await guia(page).getByRole('searchbox', { name: 'Sua cidade' }).fill('montes claros');
  await opcao(page, 'Montes Claros').click();
  await opcao(page, /tanto faz/).click();
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await guia(page).getByRole('button', { name: 'Ver resultado' }).click();
  await guia(page).getByRole('button', { name: 'Ver todos os candidatos' }).click();
  await expect(guia(page)).toHaveCount(0);
  const votosTxt = String(votos).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  await expect(santinho(page, c).getByText(`Ficou em ${pos}º lugar em Montes Claros em 2022 (${votosTxt} votos)`)).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Filtros' }).getByText('Montes Claros', { exact: true })).toBeVisible();
});

test('guia sem violações do axe (passo 1 e resultado)', async ({ page }) => {
  test.setTimeout(120_000);
  await abrirGuia(page);
  const analisar = async () => {
    const r = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  };
  await analisar();
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await opcao(page, /tanto faz/).click();
  await guia(page).getByRole('button', { name: 'Pular' }).click();
  await guia(page).getByRole('button', { name: 'Ver resultado' }).click();
  await analisar();
});

test.describe('360 px', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  test('guia sem rolagem horizontal', async ({ page }) => {
    await abrirGuia(page);
    for (const passo of ['Pular', null, 'Pular', 'Ver resultado']) {
      const largura = await guia(page).evaluate((el) => el.scrollWidth);
      expect(largura).toBeLessThanOrEqual(360);
      if (passo === null) await opcao(page, /tanto faz/).click();
      else await guia(page).getByRole('button', { name: passo }).click();
    }
    expect(await guia(page).evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(360);
  });
});
