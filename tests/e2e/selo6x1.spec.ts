// Cenário 8 da spec (T053): selo do fim da escala 6x1 no santinho, contra o build e os dados reais.
// A situação esperada de cada cartão sai de candidatos.json pela mesma função do app; as
// situações que a base real não tem ("só faltou", "contra") estão em tests/unit/selo6x1.test.ts.
import { expect, test, type Locator } from '@playwright/test';
import { LINK_6X1, selo6x1, type Situacao6x1 } from '../../src/lib/formatar/selo6x1';
import { EXPLICA, linha6x1 } from '../../src/lib/formatar/raio-x';
import { abrir, deputados as candidatos, santinho } from './apoio';

// Raio-X (03/10/2026): no cartão de quem tenta a reeleição, o selo virou a linha "Fim da escala
// 6x1" do Raio-X, com o veredito da página do Raio-X e a explicação num <dialog>.
const linha6 = (s: Locator) => s.getByRole('button', { name: /^Fim da escala 6x1: / });
const porNome = (n: string) => candidatos.find((c) => c.nome_urna === n)!;
const porSituacao = (s: Situacao6x1) => candidatos.filter((c) => selo6x1(c.voto_6x1!).situacao === s);

test.describe('Cenário 8: ver como o candidato votou no fim da 6x1', () => {
  test('todo cartão traz a linha da 6x1 com o veredito da sua situação', async ({ page }) => {
    await abrir(page);
    for (const c of candidatos) {
      const l = linha6x1(c.voto_6x1);
      const b = linha6(santinho(page, c));
      await expect(b, c.nome_urna).toHaveAccessibleName(`Fim da escala 6x1: ${l.veredito}. O que é isso?`);
      await expect(b, c.nome_urna).toHaveClass(new RegExp(`\\b${l.classe}\\b`));
      // "enfraquecer" é alerta (vermelho), com ou sem a falta na votação final.
      expect(l.classe === 'bad', c.nome_urna).toBe(['enfraquecer', 'contra'].includes(selo6x1(c.voto_6x1!).situacao));
      expect(l.veredito.endsWith('e faltou'), c.nome_urna).toBe(selo6x1(c.voto_6x1!).faltou);
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
    test(`linha da 6x1 com no máximo 72 px a ${largura} px (NFR-012)`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrir(page);
      for (const c of [...porSituacao('enfraquecer'), ...porSituacao('favor').slice(0, 3), ...porSituacao('sem_mandato')]) {
        // Altura sem o giro do cartão: com a mesa sorteada (WP15) o ângulo muda e o boundingBox cresce.
        const altura = await linha6(santinho(page, c)).evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(altura, c.nome_urna).toBeLessThanOrEqual(72);
      }
      const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(larguras[0]).toBeLessThanOrEqual(larguras[1]);
    });
  }

  test('a linha abre a explicação com a regra das emendas e a votação; Esc fecha e devolve o foco', async ({ page }) => {
    await abrir(page);
    const s = santinho(page, porNome('NIKOLAS FERREIRA'));
    await linha6(s).click();
    const janela = page.getByRole('dialog', { name: 'Fim da escala 6x1' });
    await expect(janela).toBeVisible();
    await expect(janela.getByText(EXPLICA['6x1'].texto, { exact: true })).toBeVisible();
    await expect(janela.getByText(EXPLICA['6x1'].regra, { exact: true })).toBeVisible();
    await expect(janela.getByRole('link', { name: /Ver na Câmara/ })).toHaveAttribute('href', LINK_6X1);
    await page.keyboard.press('Escape');
    await expect(janela).toHaveCount(0);
    await expect(linha6(s)).toBeFocused();
  });

  test('Fechar e o clique fora fecham a explicação', async ({ page }) => {
    await abrir(page);
    const s = santinho(page, porNome('REGINALDO LOPES'));
    await linha6(s).click();
    const janela = page.getByRole('dialog', { name: 'Fim da escala 6x1' });
    await janela.getByRole('button', { name: 'Fechar' }).click();
    await expect(janela).toHaveCount(0);
    await linha6(s).click();
    await expect(janela).toBeVisible();
    // Clique no fundo escurecido (fora da caixa do <dialog>).
    await page.mouse.click(2, 2);
    await expect(janela).toHaveCount(0);
  });

  test('a explicação aberta não muda a altura do cartão', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await abrir(page);
    for (const c of [porNome('NIKOLAS FERREIRA'), porNome('DIEGO ANDRADE'), porNome('GILMAR MACHADO')]) {
      const s = santinho(page, c);
      await s.scrollIntoViewIfNeeded();
      const altura = () => s.evaluate((el) => (el as HTMLElement).offsetHeight);
      const antes = await altura();
      await linha6(s).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(await altura(), c.nome_urna).toBe(antes);
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
