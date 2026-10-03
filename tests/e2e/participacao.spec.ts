// Cenário 10 da spec (T061): participação nas votações de 2026 no santinho, contra o build e os
// dados reais. Frase e cor esperadas de cada cartão saem de candidatos.json pela mesma função do
// app; os casos que a base real não tem (10 em 10, menos de 1) estão em tests/unit/participacao.test.ts.
import { expect, test } from '@playwright/test';
import { fraseParticipacao, fraseParticipacaoSr, participacao } from '../../src/lib/formatar/participacao';
import { pct, presenca, presencaAlerta } from '../../src/lib/formatar/raio-x';
import { abrir, deputados as candidatos, santinho } from './apoio';

const de = (nome: string) => candidatos.find((c) => c.nome_urna === nome)!;

test.describe('Cenário 10: ver quanto o candidato vota', () => {
  // Raio-X (03/10/2026): no cartão de quem tenta a reeleição, a conta aparece em porcentagem
  // ("Presença em 2026"), em vermelho abaixo de 75% (regra da página do Raio-X). As bolinhas
  // seguem no cartão de ex-deputado (tests/e2e/participacao-anterior.spec.ts).
  test('todo cartão da reeleição traz a presença de 2026 em porcentagem, em vermelho abaixo de 75%', async ({ page }) => {
    await abrir(page);
    for (const c of candidatos) {
      const dd = santinho(page, c).getByText('Presença em 2026', { exact: true }).locator('xpath=following-sibling::dd');
      await expect(dd, c.nome_urna).toHaveText(pct(presenca(c.votacoes_2026)));
      const vermelho = await dd.evaluate((el) => el.classList.contains('alerta'));
      expect(vermelho, c.nome_urna).toBe(presencaAlerta(c.votacoes_2026));
      await expect(santinho(page, c).getByText(fraseParticipacaoSr(participacao(c.votacoes_2026)), { exact: true }), c.nome_urna).toHaveCount(0);
    }
  });

  test('base de 02/10/2026: exemplos do cenário, 3 vermelhos e 1 sem bolinhas', () => {
    const frase = (n: string) => fraseParticipacao(participacao(de(n).votacoes_2026));
    expect(de('PAULO GUEDES').votacoes_2026).toEqual({ votou: 117, total: 123 });
    expect(frase('PAULO GUEDES')).toBe('De cada 10, votou em 9');
    expect(frase('DANDARA')).toBe('De cada 10, votou em 5');
    expect(frase('PINHEIRINHO')).toBe('De cada 10, votou em 2');
    expect(de('LUIS TIBÉ').votacoes_2026).toEqual({ votou: 39, total: 67 });
    expect(frase('LUIS TIBÉ')).toBe('De cada 10, votou em 6');
    expect(frase('GILMAR MACHADO')).toBe('Não estava no mandato nas votações de 2026');

    const vermelhos = candidatos.filter((c) => {
      const p = participacao(c.votacoes_2026);
      return !p.sem && p.vermelho;
    });
    expect(vermelhos.map((c) => c.nome_urna).sort()).toEqual(['NEWTON CARDOSO JR', 'PINHEIRINHO', 'ZÉ VITOR']);
    expect(candidatos.filter((c) => c.votacoes_2026 === null).map((c) => c.nome_urna)).toEqual(['GILMAR MACHADO']);
  });

  for (const largura of [360, 768, 1280]) {
    test(`a linha de presença cabe no cartão a ${largura} px, sem estourar a largura`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrir(page);
      for (const c of [de('PAULO GUEDES'), de('PINHEIRINHO'), de('GILMAR MACHADO')]) {
        const s = santinho(page, c);
        const dd = s.getByText('Presença em 2026', { exact: true }).locator('xpath=following-sibling::dd');
        const v = (await dd.boundingBox())!;
        const cartao = (await s.boundingBox())!;
        expect(v.x + v.width, c.nome_urna).toBeLessThanOrEqual(cartao.x + cartao.width);
      }
      const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(larguras[0]).toBeLessThanOrEqual(larguras[1]);
    });
  }

  test('nenhuma palavra de julgamento na página (C-014)', async ({ page }) => {
    await abrir(page);
    const texto = await page.locator('body').innerText();
    expect(texto).not.toMatch(/faltos|ausente|não trabalha|gazete/i);
  });

  test('o rodapé explica a conta, o corte e a limitação (FR-035)', async ({ page }) => {
    await abrir(page);
    const rodape = page.getByRole('contentinfo');
    await expect(rodape.getByRole('heading', { name: 'Votações na Câmara' })).toBeVisible();
    await expect(rodape.getByText(/votações nominais do Plenário da Câmara/)).toBeVisible();
    await expect(rodape.getByText('Abaixo de 5 em 10, as bolinhas e a frase ficam em vermelho.', { exact: true })).toBeVisible();
    await expect(rodape.getByText(/Falta\s+justificada/)).toBeVisible();
  });
});
