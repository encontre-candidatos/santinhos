// Casos-limite da spec (T033). Cada um depende de o caso existir nos dados reais; quando não
// existe, o teste é pulado com o motivo (o relatório do WP06 lista quais).
import { expect, test } from '@playwright/test';
import {
  abrir,
  base,
  busca,
  candidatos,
  deputados,
  normalizar,
  santinho,
  santinhos,
  visorContagem
} from './apoio';

test('deputado sem candidatura não vira santinho e aparece no rodapé', async ({ page }) => {
  test.skip(base.nao_concorrem.length === 0, 'base.nao_concorrem vazio nos dados reais');
  const ids = new Set(deputados.map((c) => c.id_camara));
  for (const d of base.nao_concorrem) expect(ids.has(d.id_camara), d.nome).toBe(false);

  await abrir(page);
  await expect(santinhos(page)).toHaveCount(candidatos.length);
  const nomesNaMesa = (await santinhos(page).getByRole('heading', { level: 3 }).allTextContents()).map(
    normalizar
  );
  for (const d of base.nao_concorrem) expect(nomesNaMesa).not.toContain(normalizar(d.nome));

  const n = base.nao_concorrem.length;
  const resumo = page.getByText(
    `${n} ${n === 1 ? 'deputado' : 'deputados'} de MG não ${n === 1 ? 'concorre' : 'concorrem'} à reeleição`
  );
  await resumo.click();
  const lista = page.getByRole('contentinfo').locator('details').getByRole('listitem');
  await expect(lista).toHaveCount(n);
  for (const d of base.nao_concorrem) {
    await expect(lista.filter({ hasText: d.nome })).toBeVisible();
  }
});

test('partido de 2026 diferente do da posse mostra "Tomou posse pelo …"', async ({ page }) => {
  const trocaram = deputados.filter((c) => c.partido !== c.partido_posse);
  test.skip(trocaram.length === 0, 'nenhum candidato com partido ≠ partido_posse nos dados reais');
  await abrir(page);
  for (const c of trocaram) {
    await expect(santinho(page, c).getByText(`Tomou posse pelo ${c.partido_posse}`, { exact: true })).toBeVisible();
  }
  for (const c of deputados.filter((c) => c.partido === c.partido_posse)) {
    await expect(santinho(page, c).getByText(/Tomou posse pelo/)).toHaveCount(0);
  }
});

test('suplente em exercício mostra a indicação', async ({ page }) => {
  const suplentes = candidatos.filter((c) => c.condicao === 'suplente_em_exercicio');
  test.skip(suplentes.length === 0, 'nenhum suplente em exercício entre os candidatos reais');
  await abrir(page);
  for (const c of suplentes) {
    await expect(santinho(page, c).getByText('suplente em exercício')).toBeVisible();
  }
});

test('situação diferente de DEFERIDO aparece visível', async ({ page }) => {
  const outros = candidatos.filter((c) => c.situacao_candidatura.trim().toUpperCase() !== 'DEFERIDO');
  test.skip(outros.length === 0, 'todas as candidaturas reais estão DEFERIDO');
  await abrir(page);
  for (const c of outros) {
    await expect(santinho(page, c)).toBeVisible();
    await expect(santinho(page, c).getByText(c.situacao_candidatura, { exact: true })).toBeVisible();
  }
});

test.describe('sem foto', () => {
  // Sem SW: o page.route precisa ver os pedidos das fotos (com SW, o cache responderia).
  test.use({ serviceWorkers: 'block' });

  test('foto que falha mostra as iniciais', async ({ page }) => {
    await page.route('**/fotos/**/*.jpg', (r) => r.fulfill({ status: 404, body: '' }));
    await abrir(page);
    // as fotos são lazy: confere os primeiros santinhos, levando cada um à tela
    const primeiros = candidatos.length > 3 ? 3 : candidatos.length;
    for (let i = 0; i < primeiros; i++) {
      const art = santinhos(page).nth(i);
      await art.scrollIntoViewIfNeeded();
      const nome = (await art.getByRole('heading', { level: 3 }).textContent())!.trim();
      await expect(art.getByRole('img', { name: `Sem foto; iniciais de ${nome}` })).toBeVisible();
      await expect(art.getByRole('img', { name: `Foto de ${nome}` })).toHaveCount(0);
    }
  });
});

test('filtro sem resultado avisa e "Limpar filtros" volta ao início', async ({ page }) => {
  await abrir(page);
  await busca(page).fill('zzzz');
  await expect(santinhos(page)).toHaveCount(0);
  await expect(page.getByText('Nenhum candidato com esses filtros.')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(busca(page)).toHaveValue('');
  await expect(santinhos(page)).toHaveCount(candidatos.length);
  await expect(visorContagem(page, candidatos.length)).toBeVisible();
});
