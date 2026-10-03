// Cenário 10 da spec (T061): participação nas votações de 2026 no santinho, contra o build e os
// dados reais. Frase e cor esperadas de cada cartão saem de candidatos.json pela mesma função do
// app; os casos que a base real não tem (10 em 10, menos de 1) estão em tests/unit/participacao.test.ts.
import { expect, test, type Locator } from '@playwright/test';
import { fraseParticipacao, fraseParticipacaoSr, participacao } from '../../src/lib/formatar/participacao';
import { abrir, deputados as candidatos, santinho } from './apoio';
import type { Candidato } from '../../src/lib/tipos';

const de = (nome: string) => candidatos.find((c) => c.nome_urna === nome)!;
/** O bloco: o pai da frase para leitor de tela. */
const bloco = (s: Locator, c: Candidato) =>
  s.getByText(fraseParticipacaoSr(participacao(c.votacoes_2026)), { exact: true }).locator('xpath=..');

test.describe('Cenário 10: ver quanto o candidato vota', () => {
  test('todo cartão traz a frase, as bolinhas e a cor da sua conta (FR-031 a FR-035)', async ({ page }) => {
    await abrir(page);
    for (const c of candidatos) {
      const p = participacao(c.votacoes_2026);
      const s = santinho(page, c);
      const b = bloco(s, c);
      await expect(b, c.nome_urna).toHaveCount(1);
      await expect(b.getByText(fraseParticipacao(p), { exact: true }), c.nome_urna).toBeVisible();
      await expect(b.locator('i'), c.nome_urna).toHaveCount(p.sem ? 0 : 10);
      const cor = await b.evaluate((el) => getComputedStyle(el.querySelector('b')!).color);
      const token = async (nome: string) =>
        page.evaluate((nome) => {
          const t = document.createElement('span');
          t.style.color = `var(${nome})`;
          document.body.append(t);
          const cor = getComputedStyle(t).color;
          t.remove();
          return cor;
        }, nome);
      if (p.sem) {
        expect(cor, c.nome_urna).toBe(await token('--tinta-2'));
        continue;
      }
      const cheias = await b.locator('i').evaluateAll((els) =>
        els.filter((el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)').length
      );
      expect(cheias, c.nome_urna).toBe(p.n);
      expect(cor === (await token('--carimbo')), c.nome_urna).toBe(p.vermelho);
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
    test(`o bloco acrescenta no máximo 56 px ao cartão a ${largura} px (NFR-018), sem estourar a largura`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrir(page);
      // Um de cada tipo: preto, vermelho, sem bolinhas.
      for (const c of [de('PAULO GUEDES'), de('PINHEIRINHO'), de('GILMAR MACHADO')]) {
        const s = santinho(page, c);
        const b = bloco(s, c);
        const com = (await s.boundingBox())!.height;
        await b.evaluate((el) => ((el as HTMLElement).style.display = 'none'));
        const sem = (await s.boundingBox())!.height;
        await b.evaluate((el) => ((el as HTMLElement).style.display = ''));
        expect(com - sem, c.nome_urna).toBeLessThanOrEqual(56);
        // As 10 bolinhas cabem no cartão (a 768 px a coluna é a mais estreita).
        if (c.votacoes_2026 === null) continue;
        const ultima = (await b.locator('i').last().boundingBox())!;
        const cartao = (await s.boundingBox())!;
        expect(ultima.x + ultima.width, c.nome_urna).toBeLessThanOrEqual(cartao.x + cartao.width);
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
