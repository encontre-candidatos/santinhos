// Cenário 7 da spec (T049): carimbo de crescimento do patrimônio declarado, contra o build e os
// dados reais. Quem leva carimbo sai de candidatos.json pela mesma regra do app; a lista de nomes
// abaixo é a conta de 03/10/2026 (≥ 2× o valor anterior corrigido pelo IPCA e aumento ≥ meio
// milhão, WP16) e só confere a base daquela data (SC-006, SC-031).
// Os casos "sem declaração anterior" e "1,99" com valores fictícios estão nos testes unitários;
// o Cenário 13 (IPCA, ano no carimbo) em tests/e2e/patrimonio-ipca.spec.ts.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { crescimentoPatrimonio, fraseCrescimento, marcaCrescimento, nomeEmFrase, textoLeitorCrescimento, textoMultiplicador } from '../../src/lib/formatar/crescimento';
import { valorCorrigido } from '../../src/lib/formatar/inflacao';
import { formatarPatrimonio } from '../../src/lib/formatar/patrimonio';
import { selo6x1 } from '../../src/lib/formatar/selo6x1';
import { abrir, candidatos, MARCA, marcados, santinho } from './apoio';

// Marcelo Álvaro Antônio saiu em 03/10/2026: 2,07× nominal, 1,73× com o IPCA (Cenário 13).
const ESPERADOS_03_10_2026 = [
  'NIKOLAS FERREIRA',
  'SAMUEL VIANA',
  'MAURÍCIO DO VÔLEI',
  'PAULO ABI-ACKEL',
  'NEWTON CARDOSO JR',
  'NELY AQUINO',
  'PEDRO AIHARA',
  'DELEGADO MARCELO FREITAS'
];

// Desde o WP13 a mesa tem quem não é deputado: o carimbo segue a mesma regra para todos.
// Raio-X (03/10/2026): o cartão de quem tenta a reeleição não leva mais o carimbo (o patrimônio
// de 2022 e de 2026 está no extrato dele); a regra continua valendo para "Esconder quem tem".
const comCarimbo = candidatos.filter((c) => !c.reeleicao && marcaCrescimento(c));
const deputadosComCarimbo = candidatos.filter((c) => c.reeleicao && marcaCrescimento(c));
const semCarimbo = candidatos.filter((c) => c.reeleicao || !marcaCrescimento(c));
const exemplo = comCarimbo[0];
const porNome = (nome: string) => candidatos.find((c) => c.nome_urna === nome)!;

const selo = (s: Locator) =>
  s.getByRole('button', { name: /^Patrimônio declarado .+ vezes maior que em \d{4}, já descontada a inflação \(IPCA\): de R\$/ });

test.describe('Cenário 7: ver quem multiplicou o patrimônio declarado', () => {
  test('na base de 03/10/2026, exatamente os 8 deputados da conta têm a marca; carimbo só fora da reeleição', async ({ page }) => {
    expect(deputadosComCarimbo.map((c) => c.nome_urna).sort()).toEqual([...ESPERADOS_03_10_2026].sort());
    await abrir(page);
    await expect(selo(page.locator('body'))).toHaveCount(comCarimbo.length);
    for (const c of comCarimbo) {
      const s = santinho(page, c);
      await expect(selo(s), c.nome_urna).toHaveAccessibleName(`${textoLeitorCrescimento(c)!}. Ver detalhes`);
      await expect(s.getByText(textoMultiplicador(crescimentoPatrimonio(c)!), { exact: true }), c.nome_urna).toBeVisible();
    }
    for (const c of semCarimbo) await expect(selo(santinho(page, c)), c.nome_urna).toHaveCount(0);
  });

  test('foto em cinza só com carimbo de patrimônio, partido marcado ou selo "enfraquecer" da 6x1', async ({ page }) => {
    await abrir(page);
    const siglas = new Set(marcados.map((c) => c.partido));
    for (const c of candidatos) {
      const filtro = await santinho(page, c)
        .locator('.foto img, .foto .iniciais')
        .first()
        .evaluate((el) => getComputedStyle(el).filter);
      const cinza =
        !c.reeleicao &&
        (marcaCrescimento(c) || siglas.has(c.partido) || (c.voto_6x1 !== null && selo6x1(c.voto_6x1).situacao === 'enfraquecer'));
      expect(filtro.includes('grayscale'), c.nome_urna).toBe(cinza);
    }
  });

  test('89× (106× sem o IPCA) é conta da base; no cartão do Raio-X, o patrimônio vai no extrato', async ({ page }) => {
    const c = porNome('NIKOLAS FERREIRA');
    expect(textoLeitorCrescimento(c)).toBe(
      'Patrimônio declarado 89 vezes maior que em 2022, já descontada a inflação (IPCA): ' +
        'de R$ 36.820 em 2022 (R$ 43.992 em valores de 2026) para R$ 3.898.457'
    );
    await abrir(page);
    const s = santinho(page, c);
    await expect(selo(s)).toHaveCount(0);
    await expect(s.getByText('Patrimônio 2026 (em 2022: R$ 37 mil)', { exact: true })).toBeVisible();
    await expect(s.getByText('R$ 3,9 milhões', { exact: true })).toBeVisible();
    // Fora da reeleição, o carimbo com o ano da declaração anterior.
    const o = santinho(page, exemplo);
    await expect(o.getByText('PATRIMÔNIO DECLARADO', { exact: true })).toBeVisible();
    await expect(o.getByText(textoMultiplicador(crescimentoPatrimonio(exemplo)!), { exact: true })).toBeVisible();
    await expect(o.getByText(`QUE EM ${exemplo.patrimonio_anterior!.ano}`, { exact: true })).toBeVisible();
  });

  test('o carimbo abre o balão com o ano antigo (nominal e corrigido), 2026, a frase e o DivulgaCand; Esc fecha', async ({ page }) => {
    await abrir(page);
    const c = exemplo;
    const s = santinho(page, c);
    await selo(s).click();
    await expect(selo(s)).toHaveAttribute('aria-expanded', 'true');
    const balao = s.getByRole('dialog', { name: 'Patrimônio declarado ao TSE' });
    await expect(balao).toBeVisible();
    await expect(balao.getByRole('heading')).toBeFocused();
    await expect(balao.getByText(formatarPatrimonio(c.patrimonio_anterior!.valor), { exact: true })).toBeVisible();
    await expect(balao.getByText(`${c.patrimonio_anterior!.ano} corrigido`, { exact: true })).toBeVisible();
    await expect(balao.getByText(formatarPatrimonio(valorCorrigido(c.patrimonio_anterior)), { exact: true })).toBeVisible();
    await expect(balao.getByText(formatarPatrimonio(c.patrimonio_total), { exact: true })).toBeVisible();
    await expect(balao.getByText(fraseCrescimento(c, nomeEmFrase(c.nome_urna))!, { exact: true })).toBeVisible();
    await expect(balao.getByRole('link', { name: /DivulgaCand/ })).toHaveAttribute('href', c.url_divulgacand);
    await page.keyboard.press('Escape');
    await expect(balao).toHaveCount(0);
    await expect(selo(s)).toBeFocused();
  });

  test('o × e o clique fora fecham o balão; abrir outro fecha o primeiro', async ({ page }) => {
    await abrir(page);
    const [a, b] = [santinho(page, comCarimbo[0]), santinho(page, comCarimbo[1])];
    await selo(a).click();
    await a.getByRole('button', { name: 'Fechar' }).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await selo(a).click();
    await page.getByRole('contentinfo').click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await selo(a).click();
    await selo(b).click();
    await expect(a.getByRole('dialog')).toHaveCount(0);
    await expect(b.getByRole('dialog')).toBeVisible();
  });

  test('abaixo de 2× corrigido e declaração anterior zerada ficam sem carimbo', async ({ page }) => {
    const bruno = porNome('BRUNO FARIAS');
    const miguel = porNome('MIGUEL ÂNGELO');
    expect(crescimentoPatrimonio(bruno)).toBeGreaterThan(1.5);
    expect(crescimentoPatrimonio(bruno)).toBeLessThan(2);
    expect(miguel.patrimonio_anterior?.valor).toBe(0);
    await abrir(page);
    await expect(selo(santinho(page, bruno))).toHaveCount(0);
    await expect(selo(santinho(page, miguel))).toHaveCount(0);
  });

  test('≥ 2× com menos de meio milhão a mais fica sem carimbo', async ({ page }) => {
    await abrir(page);
    for (const nome of ['ANA PAULA LEÃO', 'DANDARA', 'PADRE JOÃO']) {
      const c = porNome(nome);
      expect(crescimentoPatrimonio(c), nome).toBeGreaterThanOrEqual(2);
      expect(c.patrimonio_total! - valorCorrigido(c.patrimonio_anterior)!, nome).toBeLessThan(500_000);
      await expect(selo(santinho(page, c)), nome).toHaveCount(0);
    }
  });

  test('convive com "EXTREMA DIREITA": as duas marcas legíveis, sem uma cobrir a outra', async ({ page }) => {
    const ambos = comCarimbo.filter((c) => marcados.includes(c));
    expect(ambos.length).toBeGreaterThan(0);
    await abrir(page);
    for (const c of ambos) {
      const s = santinho(page, c);
      await s.scrollIntoViewIfNeeded();
      const marca = s.getByText(MARCA, { exact: true });
      await expect(marca, c.nome_urna).toBeVisible();
      await expect(selo(s), c.nome_urna).toBeVisible();
      const a = (await marca.boundingBox())!;
      const b = (await selo(s).boundingBox())!;
      const sobrepoe = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(sobrepoe, c.nome_urna).toBe(false);
    }
  });
});

/** Altura de cada cartão que tem carimbo, por id do título. */
const alturas = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('article')]
      .filter((a) => a.querySelector('.selo-patrimonio') !== null)
      .map((a) => `${a.getAttribute('aria-labelledby')}: ${(a as HTMLElement).offsetHeight}`)
  );

for (const largura of [360, 1280]) {
  test(`NFR-010: em ${largura} px o carimbo não muda a altura do cartão`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page);
    const com = await alturas(page);
    expect(com.length).toBe(comCarimbo.length);
    await page.addStyleTag({ content: '.selo-patrimonio { display: none !important; }' });
    await expect(selo(page.locator('body')).first()).toBeHidden();
    expect(await alturas(page)).toEqual(com);
  });

  test(`NFR-010: em ${largura} px o balão aberto não muda a altura do cartão e cabe na foto`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page);
    for (const c of comCarimbo) {
      const s = santinho(page, c);
      await s.scrollIntoViewIfNeeded();
      // Altura de layout: a caixa visual muda com o hover, que desentorta o cartão.
      const altura = () => s.evaluate((el) => (el as HTMLElement).offsetHeight);
      const antes = await altura();
      await selo(s).click();
      const balao = s.getByRole('dialog');
      await expect(balao).toBeVisible();
      expect(await altura(), c.nome_urna).toBe(antes);
      const cabe = await balao.evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
      expect(cabe, `${c.nome_urna}: o texto do balão não cabe sem rolar`).toBe(true);
      await page.keyboard.press('Escape');
    }
  });

  test(`em ${largura} px o carimbo cabe dentro da foto`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page);
    for (const c of comCarimbo) {
      const s = santinho(page, c);
      await s.scrollIntoViewIfNeeded();
      const caixa = await selo(s).evaluate((el) => {
        const foto = el.closest('.foto')!.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return { dentro: r.left >= foto.left - 1 && r.right <= foto.right + 1 && r.top >= foto.top - 1 && r.bottom <= foto.bottom + 1 };
      });
      expect(caixa.dentro, c.nome_urna).toBe(true);
    }
  });
}

test('o rodapé explica o critério do carimbo (2× e meio milhão a mais)', async ({ page }) => {
  await abrir(page);
  const rodape = page.getByRole('contentinfo');
  await expect(rodape).toContainText('pelo menos o dobro do que declarou na candidatura anterior mais recente');
  await expect(rodape).toContainText('pelo menos meio milhão de reais maior');
});

test('C-009: nenhuma palavra de conduta na página', async ({ page }) => {
  await abrir(page);
  const html = await page.content();
  // Início de palavra: "HENRIQUE", nome civil, contém "enriqu".
  expect(html).not.toMatch(/(?<!\p{L})(enriqu|suspeit)/iu);
});
