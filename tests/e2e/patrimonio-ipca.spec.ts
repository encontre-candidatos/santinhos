// Cenário 13 da spec (WP16/T077): carimbo de patrimônio com a declaração mais recente antes de
// 2026, para todos os candidatos, e o valor antigo corrigido pelo IPCA. Contra o build e os dados
// reais: os casos saem de candidatos.json pela regra do app; os nomes fixos são a conta de
// 03/10/2026 (Marcelo Álvaro Antônio sai; os outros 8 da reeleição ficam).
// A altura do cartão com carimbo (NFR-010) segue em crescimento.spec.ts, agora com todos os anos.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { anoComparacao, crescimentoPatrimonio, marcaCrescimento, textoLeitorCrescimento, textoMultiplicador } from '../../src/lib/formatar/crescimento';
import { valorCorrigido } from '../../src/lib/formatar/inflacao';
import { formatarPatrimonio } from '../../src/lib/formatar/patrimonio';
import type { Candidato } from '../../src/lib/tipos';
import { abrir, abrirMaisFiltros, base, candidatos, deputados, ocultos, santinho } from './apoio';

const OITO = [
  'NIKOLAS FERREIRA',
  'SAMUEL VIANA',
  'MAURÍCIO DO VÔLEI',
  'PAULO ABI-ACKEL',
  'NEWTON CARDOSO JR',
  'NELY AQUINO',
  'PEDRO AIHARA',
  'DELEGADO MARCELO FREITAS'
];

const selo = (s: Locator) => s.getByRole('button', { name: /^Patrimônio declarado .+ vezes maior que em \d{4}, já descontada a inflação \(IPCA\)/ });
const porNome = (nome: string) => deputados.find((c) => c.nome_urna === nome)!;
/** O primeiro à mostra com carimbo e declaração anterior do ano pedido (carimbo só fora da reeleição desde o Raio-X). */
const marcadoDe = (ano: number) => candidatos.find((c) => !c.reeleicao && marcaCrescimento(c) && anoComparacao(c) === ano)!;

async function conferirCarimbo(page: Page, c: Candidato) {
  const s = santinho(page, c);
  await s.scrollIntoViewIfNeeded();
  await expect(selo(s), c.nome_urna).toHaveAccessibleName(`${textoLeitorCrescimento(c)!}. Ver detalhes`);
  await expect(s.getByText(`QUE EM ${c.patrimonio_anterior!.ano}`, { exact: true }), c.nome_urna).toBeVisible();
  await expect(s.getByText(textoMultiplicador(crescimentoPatrimonio(c)!), { exact: true }), c.nome_urna).toBeVisible();
}

test.describe('Cenário 13: crescimento do patrimônio descontada a inflação', () => {
  test('R$ 1.196.660 em 2022 e R$ 2.475.900 em 2026: 1,73× corrigido, sem carimbo (Marcelo Álvaro Antônio)', async ({ page }) => {
    const m = porNome('MARCELO ÁLVARO ANTÔNIO');
    expect(m.patrimonio_anterior?.ano).toBe(2022);
    expect(formatarPatrimonio(m.patrimonio_anterior!.valor)).toBe('R$ 1.196.660');
    expect(formatarPatrimonio(m.patrimonio_total)).toBe('R$ 2.475.900');
    expect(formatarPatrimonio(valorCorrigido(m.patrimonio_anterior))).toBe('R$ 1.429.733');
    expect(crescimentoPatrimonio(m)).toBeCloseTo(1.73, 2);
    await abrir(page);
    await expect(selo(santinho(page, m))).toHaveCount(0);
  });

  test('entre os 48 da reeleição, os 8 da conta têm a marca; no cartão do Raio-X, o patrimônio vai no extrato', async ({ page }) => {
    expect(deputados.filter(marcaCrescimento).map((c) => c.nome_urna).sort()).toEqual([...OITO].sort());
    await abrir(page);
    for (const nome of OITO) {
      const s = santinho(page, porNome(nome));
      await expect(selo(s), nome).toHaveCount(0);
      await expect(s.getByText(/^Patrimônio 2026 \(em 2022: /), nome).toBeVisible();
    }
  });

  test('quem não tenta a reeleição também tem carimbo, comparado com o próprio ano', async ({ page }) => {
    const outros = candidatos.filter((c) => !c.reeleicao && marcaCrescimento(c));
    expect(outros.length).toBeGreaterThan(0);
    await abrir(page);
    for (const c of outros) await conferirCarimbo(page, c);
  });

  test('declaração de 2018: fator de agosto de 2018 a agosto de 2026 (1,5096) e "MAIOR QUE EM 2018"', async ({ page }) => {
    const c = marcadoDe(2018);
    expect(c.patrimonio_anterior!.fator_ipca).toBeCloseTo(1.5096, 4);
    await abrir(page);
    await conferirCarimbo(page, c);
  });

  test('declaração mais recente de 2024 (eleição municipal): a comparação é com 2024', async ({ page }) => {
    const c = marcadoDe(2024);
    expect(c.patrimonio_anterior!.fator_ipca).toBeCloseTo(7633.23 / 6966.5, 6);
    await abrir(page);
    await conferirCarimbo(page, c);
    // Dos 48, quem concorreu em 2024 (DANDARA, por exemplo) compara com 2024, mesmo com 2022 na base.
    const dandara = porNome('DANDARA');
    expect(dandara.patrimonio_2022).not.toBeNull();
    expect(anoComparacao(dandara)).toBe(2024);
  });

  test('sem declaração anterior a 2026 no TSE: sem carimbo', async ({ page }) => {
    const sem = candidatos.filter((c) => c.patrimonio_anterior === null);
    expect(sem.length).toBeGreaterThan(0);
    await abrir(page);
    for (const c of sem) await expect(selo(santinho(page, c)), c.nome_urna).toHaveCount(0);
  });

  test('ocultos com carimbo mostram o carimbo ao aparecer', async ({ page }) => {
    const c = ocultos.find(marcaCrescimento);
    test.skip(!c, 'nenhum oculto com carimbo nesta base');
    await abrir(page);
    await abrirMaisFiltros(page);
    await page.getByRole('complementary', { name: 'Filtros' }).getByRole('button', { name: /Mostrar quem nunca teve cargo/ }).click();
    await conferirCarimbo(page, c!);
  });

  test('o balão mostra o valor do ano, o corrigido e o de 2026', async ({ page }) => {
    const c = marcadoDe(2018);
    await abrir(page);
    const s = santinho(page, c);
    await s.scrollIntoViewIfNeeded();
    await selo(s).click();
    const balao = s.getByRole('dialog', { name: 'Patrimônio declarado ao TSE' });
    await expect(balao.getByText('2018', { exact: true })).toBeVisible();
    await expect(balao.getByText('2018 corrigido', { exact: true })).toBeVisible();
    await expect(balao.getByText(formatarPatrimonio(c.patrimonio_anterior!.valor), { exact: true })).toBeVisible();
    await expect(balao.getByText(formatarPatrimonio(valorCorrigido(c.patrimonio_anterior)), { exact: true })).toBeVisible();
    await expect(balao.getByText(formatarPatrimonio(c.patrimonio_total), { exact: true })).toBeVisible();
    await expect(balao.getByText(/já descontada a inflação\.$/)).toBeVisible();
  });

  test('o rodapé diz que a comparação é já descontada a inflação (IPCA), com a fonte do IBGE e a data', async ({ page }) => {
    const fonte = base.fontes.find((f) => f.url.includes('apisidra.ibge.gov.br'))!;
    const data = fonte.nome.match(/consultado em (\d{2}\/\d{2}\/\d{4})/)![1];
    await abrir(page);
    const rodape = page.getByRole('contentinfo');
    await expect(rodape).toContainText('já descontada a inflação (IPCA)');
    await expect(rodape).toContainText(`consultado em ${data}`);
    await expect(rodape.getByRole('link', { name: 'SIDRA, tabela 1737', exact: true })).toHaveAttribute('href', fonte.url);
  });
});

test('SC-031: nenhum carimbo com razão corrigida abaixo de 2', () => {
  for (const c of [...candidatos, ...ocultos].filter(marcaCrescimento)) expect(crescimentoPatrimonio(c)!, c.nome_urna).toBeGreaterThanOrEqual(2);
});
