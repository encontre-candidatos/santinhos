// Cenário 15 da spec (WP18, T083): participação de quem já foi deputado federal, no último
// mandato, contra o build e os dados reais. O esperado de cada cartão sai de candidatos.json pelas
// mesmas funções do app; os casos de conta e ligação estão em tests/unit/votacoes-mandato-anterior.test.ts.
import { expect, test, type Locator } from '@playwright/test';
import {
  fraseParticipacao,
  fraseParticipacaoSr,
  participacaoAnterior,
  rotuloParticipacao
} from '../../src/lib/formatar/participacao';
import { abrir, busca, candidatos, santinho, todos } from './apoio';
import type { Candidato, MandatoAnterior } from '../../src/lib/tipos';

const FEDERAL = /^deputad[oa] federal$/i;
const exFederais = todos.filter((c) => !c.reeleicao && c.cargos_anteriores.some((k) => FEDERAL.test(k.cargo)));
const de = (nome: string) => todos.find((c) => c.nome_urna === nome)!;
const m = (c: Candidato) => c.votacoes_mandato_anterior as MandatoAnterior;
/** O bloco: o pai da frase para leitor de tela. */
const bloco = (s: Locator, c: Candidato) =>
  s.getByText(fraseParticipacaoSr(participacaoAnterior(m(c)), m(c)), { exact: true }).locator('xpath=..');

async function achar(page: import('@playwright/test').Page, c: Candidato) {
  await busca(page).fill(c.numero_urna);
  const s = santinho(page, c);
  await expect(s).toBeVisible();
  return s;
}

test.describe('Cenário 15: participação de quem já foi deputado federal', () => {
  test('base: os 11 ex-deputados federais têm o bloco do último mandato ou "sem dados"; mais ninguém fora do mandato (SC-033)', () => {
    expect(exFederais.map((c) => c.nome_urna).sort()).toEqual([
      'ANDERSON ADAUTO', 'CHARLLES EVANGELISTA', 'DELEGADO EDSON MOREIRA', 'EDUARDO CUNHA', 'FABINHO RAMALHO',
      'FRANCO CARTAFINA', 'HERCULANO', 'LAUDIVIO CARVALHO', 'LEONARDO MATTOS', 'SUBTENETE GONZAGA', 'VILSON DA FETAEMG'
    ]);
    for (const c of exFederais) {
      const ano = Math.max(...c.cargos_anteriores.filter((k) => FEDERAL.test(k.cargo)).map((k) => k.ano));
      expect(c.votacoes_mandato_anterior, c.nome_urna).toMatchObject({ de: ano + 1, ate: ano + 4 });
    }
    const outros = todos.filter((c) => !exFederais.includes(c));
    expect(outros.filter((c) => c.votacoes_mandato_anterior !== null).map((c) => c.nome_urna)).toEqual([]);
    // Dois mandatos ou mais: vale o mais recente.
    expect(de('FABINHO RAMALHO').votacoes_mandato_anterior).toMatchObject({ de: 2019, ate: 2022 });
    expect(de('EDUARDO CUNHA').votacoes_mandato_anterior).toMatchObject({ de: 2015, ate: 2018 });
  });

  test('todo ex-deputado federal: rótulo com o período, bolinhas, frase e cor da conta (FR-070 a FR-074)', async ({ page }) => {
    await abrir(page);
    for (const c of exFederais) {
      const s = await achar(page, c);
      const p = participacaoAnterior(m(c));
      const b = bloco(s, c);
      await expect(b, c.nome_urna).toHaveCount(1);
      await expect(b.getByText(fraseParticipacao(p, m(c)), { exact: true }), c.nome_urna).toBeVisible();
      await expect(b.locator('i'), c.nome_urna).toHaveCount(p.sem ? 0 : 10);
      if (p.sem) {
        await expect(b.getByText(rotuloParticipacao(m(c)), { exact: true }), c.nome_urna).toHaveCount(0);
        continue;
      }
      await expect(b.getByText(rotuloParticipacao(m(c)), { exact: true }), c.nome_urna).toBeVisible();
      const cheias = await b.locator('i').evaluateAll((els) =>
        els.filter((el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)').length
      );
      expect(cheias, c.nome_urna).toBe(p.n);
      const vermelho = await b.evaluate((el) => el.classList.contains('vermelho'));
      expect(vermelho, c.nome_urna).toBe(p.vermelho);
    }
  });

  test('Vilson da Fetaemg: "Votações na Câmara em 2019–2022", com o leitor de tela ouvindo período e números', async ({ page }) => {
    await abrir(page);
    const c = de('VILSON DA FETAEMG');
    const s = await achar(page, c);
    await expect(s.getByText('Votações na Câmara em 2019–2022', { exact: true })).toBeVisible();
    const v = m(c);
    if ('sem_dados' in v) throw new Error('Vilson sem dados: ver docs/conferencia-mandato-anterior.md');
    await expect(s.getByText(new RegExp(`^Votações na Câmara em 2019–2022: votou em ${v.votou} de ${v.total}, `))).toHaveCount(1);
    // Não é deputado: continua sem selo da 6x1 e sem link da Câmara (FR-038).
    await expect(s.getByRole('link', { name: /^Câmara/ })).toHaveCount(0);
  });

  test('quem já foi vereador, prefeito ou deputado estadual e nunca deputado federal não tem bloco', async ({ page }) => {
    await abrir(page);
    const exVereador = candidatos.find(
      (c) => !c.reeleicao && c.cargos_anteriores.length > 0 && c.cargos_anteriores.every((k) => /^vereador/i.test(k.cargo))
    )!;
    const s = await achar(page, exVereador);
    await expect(s.getByText(/^Votações na Câmara/)).toHaveCount(0);
    await expect(s.getByText(/Sem dados de votação/)).toHaveCount(0);
    await expect(s.getByText(/De cada 10/)).toHaveCount(0);
  });

  for (const largura of [360, 1280]) {
    test(`o bloco acrescenta no máximo 56 px ao cartão a ${largura} px (NFR-018)`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await abrir(page);
      const exemplos = [exFederais.find((c) => !('sem_dados' in m(c))), exFederais.find((c) => 'sem_dados' in m(c))].filter(
        (c): c is Candidato => !!c
      );
      for (const c of exemplos) {
        const s = await achar(page, c);
        const b = bloco(s, c);
        const altura = async () => s.evaluate((el) => (el as HTMLElement).offsetHeight);
        const com = await altura();
        await b.evaluate((el) => ((el as HTMLElement).style.display = 'none'));
        const sem = await altura();
        await b.evaluate((el) => ((el as HTMLElement).style.display = ''));
        expect(com - sem, c.nome_urna).toBeLessThanOrEqual(56);
      }
      const larguras = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(larguras[0]).toBeLessThanOrEqual(larguras[1]);
    });
  }

  test('o rodapé diz que o número do mandato anterior não se compara ao de 2026 (FR-074)', async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole('contentinfo').getByText(/não se\s+compara ao de 2026/)).toBeVisible();
  });

  test('a fonte do mandato anterior no rodapé não mostra bastidor nem aponta para um deputado só', async ({ page }) => {
    await abrir(page);
    const fontes = page.getByRole('contentinfo').getByRole('link');
    await expect(fontes.filter({ hasText: /research\/|docs\// })).toHaveCount(0);
    const fonte = fontes.filter({ hasText: /ex-deputado federal no último mandato/ });
    await expect(fonte).toHaveCount(1);
    await expect(fonte).not.toHaveAttribute('href', /\/deputados\/\d+/);
  });
});
