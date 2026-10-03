// Cenário 8 da spec (T053): selo do fim da escala 6x1 no santinho, contra o build e os dados reais.
// A situação esperada de cada cartão sai de candidatos.json pela mesma função do app; as
// situações que a base real não tem ("só faltou", "contra") estão em tests/unit/selo6x1.test.ts.
import { expect, test, type Locator } from '@playwright/test';
import {
  EMENDAS_6X1,
  frase6x1,
  LINHA_FALTOU,
  LINK_6X1,
  selo6x1,
  TEXTO_6X1,
  textoEmendas,
  textoVoto,
  type Situacao6x1
} from '../../src/lib/formatar/selo6x1';
import { abrir, deputados as candidatos, santinho } from './apoio';

const botao6x1 = (s: Locator) => s.getByRole('button', { name: /^Fim da escala 6x1: .+ Ver detalhes$/ });
const porNome = (n: string) => candidatos.find((c) => c.nome_urna === n)!;
const porSituacao = (s: Situacao6x1) => candidatos.filter((c) => selo6x1(c.voto_6x1!).situacao === s);

test.describe('Cenário 8: ver como o candidato votou no fim da 6x1', () => {
  test('todo cartão traz o selo da sua situação, com a frase para leitor de tela', async ({ page }) => {
    await abrir(page);
    for (const c of candidatos) {
      const selo = selo6x1(c.voto_6x1!);
      const s = santinho(page, c);
      await expect(s.getByText(frase6x1(selo), { exact: true }), c.nome_urna).toHaveCount(1);
      await expect(s.getByText(TEXTO_6X1[selo.situacao].texto, { exact: true }), c.nome_urna).toBeVisible();
      await expect(s.getByText(LINHA_FALTOU, { exact: true }), c.nome_urna).toHaveCount(selo.faltou ? 1 : 0);
    }
  });

  test('base de 02/10/2026: 28 a favor, 17 enfraquecer (2 com falta), 3 sem mandato (NFR-014)', () => {
    const nomes = (s: Situacao6x1) => porSituacao(s).map((c) => c.nome_urna).sort();
    expect(nomes('favor')).toHaveLength(28);
    expect(nomes('enfraquecer')).toHaveLength(17);
    expect(nomes('sem_mandato')).toEqual(['EUCLYDES PETTERSEN', 'GILMAR MACHADO', 'LUIS TIBÉ']);
    expect(nomes('faltou')).toEqual([]);
    expect(nomes('contra')).toEqual([]);
    expect(candidatos.filter((c) => selo6x1(c.voto_6x1!).faltou).map((c) => c.nome_urna).sort()).toEqual([
      'DIEGO ANDRADE',
      'NEWTON CARDOSO JR'
    ]);
    // Exemplos do cenário 8.
    const de = (n: string) => selo6x1(candidatos.find((c) => c.nome_urna === n)!.voto_6x1!).situacao;
    expect(de('REGINALDO LOPES')).toBe('favor');
    expect(de('NIKOLAS FERREIRA')).toBe('enfraquecer');
    expect(de('PINHEIRINHO')).toBe('enfraquecer');
    expect(de('MÁRIO HERINGER')).toBe('favor');
    expect(de('PEDRO AIHARA')).toBe('favor');
  });

  for (const largura of [360, 1280]) {
    test(`selo com no máximo 72 px e a linha de falta com no máximo 22 px a ${largura} px (NFR-012)`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrir(page);
      // O texto mais longo é o de "enfraquecer"; a linha de falta só existe nesses cartões.
      for (const c of [...porSituacao('enfraquecer'), ...porSituacao('favor').slice(0, 3), ...porSituacao('sem_mandato')]) {
        const s = santinho(page, c);
        const situacao = selo6x1(c.voto_6x1!).situacao;
        const faixa = s.getByText(TEXTO_6X1[situacao].texto, { exact: true }).locator('xpath=ancestor::*[contains(@class,"faixa")]');
        // Altura sem o giro do cartão: com a mesa sorteada (WP15) o ângulo muda e o boundingBox cresce.
        const altura = await faixa.evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(altura, c.nome_urna).toBeLessThanOrEqual(72);
        if (selo6x1(c.voto_6x1!).faltou) {
          const linha = await s.getByText(LINHA_FALTOU, { exact: true }).evaluate((el) => (el as HTMLElement).offsetHeight);
          expect(linha, c.nome_urna).toBeLessThanOrEqual(22);
        }
      }
      const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(larguras[0]).toBeLessThanOrEqual(larguras[1]);
    });
  }

  test('o selo abre o balão com os dois turnos, as emendas e a votação; Esc fecha', async ({ page }) => {
    await abrir(page);
    const c = porNome('NIKOLAS FERREIRA');
    const s = santinho(page, c);
    await botao6x1(s).click();
    await expect(botao6x1(s)).toHaveAttribute('aria-expanded', 'true');
    const balao = s.getByRole('dialog', { name: 'Fim da escala 6x1' });
    await expect(balao).toBeVisible();
    await expect(balao.getByRole('heading')).toBeFocused();
    await expect(balao.getByText('1º turno', { exact: true })).toBeVisible();
    await expect(balao.getByText(textoVoto(c.voto_6x1!.final), { exact: true }).first()).toBeVisible();
    await expect(balao.getByText(textoEmendas(c.voto_6x1!.emendas), { exact: true })).toBeVisible();
    await expect(balao.getByText(EMENDAS_6X1, { exact: true })).toBeVisible();
    await expect(balao.getByRole('link', { name: /Ver a votação na Câmara/ })).toHaveAttribute('href', LINK_6X1);
    await page.keyboard.press('Escape');
    await expect(balao).toHaveCount(0);
    await expect(botao6x1(s)).toBeFocused();
  });

  test('o × e o clique fora fecham o balão; quem votou a favor não vê a explicação das emendas', async ({ page }) => {
    await abrir(page);
    const s = santinho(page, porNome('REGINALDO LOPES'));
    await botao6x1(s).click();
    const balao = s.getByRole('dialog', { name: 'Fim da escala 6x1' });
    await expect(balao.getByText('Não assinou', { exact: true })).toBeVisible();
    await expect(balao.getByText(EMENDAS_6X1, { exact: true })).toHaveCount(0);
    await s.getByRole('button', { name: 'Fechar' }).click();
    await expect(balao).toHaveCount(0);
    await botao6x1(s).click();
    await page.getByRole('contentinfo').click();
    await expect(balao).toHaveCount(0);
  });

  test('o balão aberto não muda a altura do cartão nem passa do topo dele', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await abrir(page);
    for (const c of [porNome('NIKOLAS FERREIRA'), porNome('DIEGO ANDRADE'), porNome('GILMAR MACHADO')]) {
      const s = santinho(page, c);
      await s.scrollIntoViewIfNeeded();
      const altura = () => s.evaluate((el) => (el as HTMLElement).offsetHeight);
      const antes = await altura();
      await botao6x1(s).click();
      const balao = s.getByRole('dialog');
      await expect(balao).toBeVisible();
      expect(await altura(), c.nome_urna).toBe(antes);
      // Aberto para cima: o topo do balão fica dentro do cartão (caixa do cartão girado é maior).
      const [topoBalao, topoCartao] = await Promise.all([
        balao.evaluate((el) => el.getBoundingClientRect().top),
        s.evaluate((el) => el.getBoundingClientRect().top)
      ]);
      expect(topoBalao, c.nome_urna).toBeGreaterThanOrEqual(topoCartao);
      await page.keyboard.press('Escape');
    }
  });

  test('o rodapé explica as situações e leva à votação na Câmara (FR-023)', async ({ page }) => {
    await abrir(page);
    const rodape = page.getByRole('contentinfo');
    await expect(rodape.getByRole('heading', { name: 'Fim da escala 6x1' })).toBeVisible();
    for (const t of ['Votou a favor:', 'Apoiou mudanças para enfraquecer:', 'Faltou na votação:', 'Não era deputado na votação:'])
      await expect(rodape.getByText(t, { exact: true })).toBeVisible();
    await expect(rodape.getByText(/não da intenção de quem assinou/)).toBeVisible();
    await expect(rodape.getByRole('link', { name: 'Ver a votação na Câmara' })).toHaveAttribute(
      'href',
      'https://www.camara.leg.br/propostas-legislativas/2233802'
    );
  });
});
