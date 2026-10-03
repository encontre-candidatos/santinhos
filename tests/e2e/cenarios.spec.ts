// Cenários 1 a 5 da spec (T031, T032), contra o build real e os dados reais.
// 02/10/2026: Cenário 2 reescrito — ninguém é ocultado; as siglas de partidos.json levam a marca.
import { expect, test } from '@playwright/test';
import {
  MARCA,
  MARCA_SR,
  abrir,
  abrirMaisFiltros,
  busca,
  candidatos,
  casam,
  deputados,
  marcados,
  naoMarcados,
  ocultos,
  normalizar,
  santinho,
  santinhos,
  semCompartilhar,
  siglasMarcadas,
  teclaLimpar,
  visorContagem,
  visorMarcados
} from './apoio';

test.describe('Cenário 1: ver quem tenta a reeleição', () => {
  test('ao abrir aparecem todos, e o visor confere', async ({ page }) => {
    test.setTimeout(180_000); // 221 cartões conferidos um a um desde o WP13
    await abrir(page);
    await expect(santinhos(page)).toHaveCount(candidatos.length);
    await expect(visorContagem(page, candidatos.length)).toBeVisible();

    for (const c of candidatos) {
      const s = santinho(page, c);
      await expect(s, c.nome_urna).toHaveCount(1);
      await expect(s.getByRole('heading', { level: 3, name: c.nome_urna, exact: true })).toBeVisible();
      await expect(s.getByRole('img', { name: `Número ${c.numero_urna}`, exact: true })).toBeVisible();
      await expect(s.getByText(c.partido, { exact: true })).toBeVisible();
      const situacao = s.getByText(c.situacao_candidatura, { exact: true });
      if (c.situacao_candidatura.trim().toUpperCase() === 'DEFERIDO') await expect(situacao).toHaveCount(0);
      else await expect(situacao).toBeVisible();
      if (c.reeleicao) {
        // Raio-X (03/10/2026): "PARTIDO · DEPUTADO FEDERAL" em cima e os mandatos no extrato.
        await expect(s.locator('.papel')).toContainText('Deputado federal');
        await expect(
          s.getByText('Mandatos de deputado federal', { exact: true }).locator('xpath=following-sibling::dd')
        ).toHaveText(String(c.mandatos));
      } else {
        // Quem não é deputado: o último cargo no lugar dos mandatos (FR-038).
        await expect(s.getByText(/^Já foi /), c.nome_urna).toBeVisible();
      }
    }
  });
});

test.describe('Cenário 2: reconhecer os de extrema direita', () => {
  test('todos aparecem; todo santinho de sigla marcada traz "EXTREMA DIREITA" e nenhum outro', async ({
    page
  }) => {
    test.setTimeout(180_000); // 221 cartões conferidos um a um desde o WP13
    expect(marcados.length, 'dados reais sem candidato de partido marcado').toBeGreaterThan(0);
    await abrir(page);
    await expect(santinhos(page)).toHaveCount(candidatos.length);
    // Raio-X (03/10/2026): no cartão de quem tenta a reeleição, a marca fica na linha de cima
    // ("PL · EXTREMA DIREITA · DEPUTADO FEDERAL"), em vermelho, no lugar da faixa do topo.
    const ed = (c: (typeof marcados)[number]) => santinho(page, c).locator('.papel .ed');
    for (const c of marcados) {
      const s = santinho(page, c);
      await expect(s, c.nome_urna).toBeVisible();
      if (c.reeleicao) {
        await expect(ed(c), c.nome_urna).toHaveText('Extrema direita');
        await expect(ed(c), c.nome_urna).toBeVisible();
        continue;
      }
      await expect(s.getByText(MARCA, { exact: true }), c.nome_urna).toBeVisible();
      await expect(s.getByText(MARCA_SR, { exact: true }), c.nome_urna).toHaveCount(1);
    }
    for (const c of naoMarcados) {
      await expect(santinho(page, c).getByText(MARCA, { exact: true }), c.nome_urna).toHaveCount(0);
      await expect(santinho(page, c).getByText(MARCA_SR), c.nome_urna).toHaveCount(0);
      await expect(ed(c), c.nome_urna).toHaveCount(0);
    }
    await expect(page.getByText(MARCA, { exact: true })).toHaveCount(marcados.filter((c) => !c.reeleicao).length);
  });

  test('a marca é grande e vermelha, à parte do resto do cartão', async ({ page }) => {
    await abrir(page);
    const marca = santinho(page, marcados.find((c) => !c.reeleicao)!).getByText(MARCA, { exact: true });
    const estilo = await marca.evaluate((el) => {
      const nome = el.closest('article')!.querySelector('h3')!;
      return {
        fonte: parseFloat(getComputedStyle(el).fontSize),
        nome: parseFloat(getComputedStyle(nome).fontSize),
        fundo: getComputedStyle(el.parentElement!).backgroundColor,
        carimbo: getComputedStyle(document.documentElement).getPropertyValue('--carimbo').trim()
      };
    });
    expect(estilo.fonte).toBeGreaterThanOrEqual(28);
    expect(estilo.fonte).toBeGreaterThanOrEqual(estilo.nome);
    const hex = estilo.carimbo.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
    expect(estilo.fundo).toBe(`rgb(${rgb})`);
  });

  test('não existe controle que oculte por partido; o visor não conta os marcados', async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole('button', { name: /confirma|ocult|esconde/i })).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await expect(visorMarcados(page)).toHaveCount(0);
    // a lista de partidos marcados fica só no rodapé (FR-007, 02/10/2026)
    await expect(page.getByRole('complementary', { name: 'Filtros' })).not.toContainText('Partidos marcados');
    // BRANCO e CORRIGE saíram; sem filtro ativo, "Limpar filtros" não aparece (02/10/2026)
    await expect(page.getByRole('button', { name: /^(branco|corrige)/i })).toHaveCount(0);
    await expect(teclaLimpar(page)).toHaveCount(0);
  });

  test('cada sigla marcada tem tecla de partido e mostra os seus, todos com a marca', async ({ page }) => {
    await abrir(page);
    await abrirMaisFiltros(page);
    for (const sigla of siglasMarcadas) {
      const doPartido = marcados.filter((c) => c.partido === sigla);
      if (doPartido.length === 0) continue;
      await page.getByRole('button', { name: sigla, exact: true }).click();
      await expect(santinhos(page)).toHaveCount(doPartido.length);
      // Raio-X: da reeleição, a marca vai na linha de cima do cartão (.papel .ed).
      await expect(page.getByText(MARCA, { exact: true })).toHaveCount(doPartido.filter((c) => !c.reeleicao).length);
      await expect(page.locator('article .papel .ed')).toHaveCount(doPartido.filter((c) => c.reeleicao).length);
      await expect(visorContagem(page, doPartido.length)).toBeVisible();
      await page.getByRole('button', { name: sigla, exact: true }).click();
    }
  });
});

test.describe('Cenário 3: lista de partidos editável (ligação com o JSON)', () => {
  test('rodapé mostra exatamente as siglas de partidos.json', async ({ page }) => {
    await abrir(page);
    await expect(page.getByRole('contentinfo')).toContainText(
      `Partidos marcados: ${siglasMarcadas.join(', ')}.`
    );
  });
});

test.describe('Cenário 4: buscar', () => {
  const comAcento = candidatos.find((c) => normalizar(c.nome_urna) !== c.nome_urna.toLowerCase());

  test('busca ignora acento e maiúsculas', async ({ page }) => {
    test.skip(!comAcento, 'nenhum nome de urna com acento nos dados');
    const alvo = comAcento!;
    const semAcento = alvo.nome_urna.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
    await abrir(page);

    for (const termo of [semAcento.toUpperCase(), semAcento.toLowerCase()]) {
      await busca(page).fill(termo);
      await expect(santinho(page, alvo)).toBeVisible();
      await expect(santinhos(page)).toHaveCount(casam(candidatos, termo).length);
    }
  });

  test('filtro de partido combinado com busca', async ({ page }) => {
    // partido com pelo menos 2 candidatos; busca pelo 1º nome de um deles
    const siglas = [...new Set(candidatos.map((c) => c.partido))];
    const sigla = siglas.find((s) => candidatos.filter((c) => c.partido === s).length >= 2);
    const doPartido = candidatos.filter((c) => c.partido === sigla);
    test.skip(!sigla, 'nenhum partido com 2 candidatos');
    const termo = doPartido[0].nome_urna.split(/\s+/)[0];
    const esperado = casam(doPartido, termo);

    await abrir(page);
    await abrirMaisFiltros(page);
    await page.getByRole('button', { name: sigla!, exact: true }).click();
    await expect(santinhos(page)).toHaveCount(doPartido.length);
    await busca(page).fill(termo);
    await expect(santinhos(page)).toHaveCount(esperado.length);
    for (const c of esperado) await expect(santinho(page, c)).toBeVisible();

    // "Limpar filtros" apaga busca e partido de uma vez e some
    await teclaLimpar(page).click();
    await expect(busca(page)).toHaveValue('');
    await expect(busca(page)).toBeFocused();
    await expect(santinhos(page)).toHaveCount(candidatos.length);
    await expect(teclaLimpar(page)).toHaveCount(0);
    await expect(visorContagem(page, candidatos.length)).toBeVisible();
  });

});

test.describe('Cenário 5: indicar a alguém', () => {
  test('todo santinho traz link da Câmara e do DivulgaCand (NFR-005, SC-003)', async ({ page }) => {
    await abrir(page);
    const links = await santinhos(page).evaluateAll((arts) =>
      arts.map((a) => [...a.querySelectorAll('a')].map((l) => l.getAttribute('href') ?? ''))
    );
    expect(links).toHaveLength(candidatos.length);
    for (const hrefs of links) expect(hrefs.some((h) => h.startsWith('https://divulgacandcontas.tse.jus.br/'))).toBe(true);
    // Link da Câmara só para deputado (FR-038).
    expect(links.filter((hrefs) => hrefs.some((h) => h.startsWith('https://www.camara.leg.br/')))).toHaveLength(deputados.length);
    for (const c of deputados) {
      const s = santinho(page, c);
      await expect(s.getByRole('link', { name: /^Câmara/ })).toHaveAttribute('href', c.url_camara!);
      await expect(s.getByRole('link', { name: /^DivulgaCand/ })).toHaveAttribute('href', c.url_divulgacand);
    }
  });

  test('sem Web Share, "Indicar" copia nome, número e link', async ({ page, context }) => {
    test.skip(test.info().project.name !== 'chromium', 'clipboard só no projeto chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await semCompartilhar(page);
    await abrir(page);
    const c = naoMarcados[0];
    await santinho(page, c).getByRole('button', { name: /^Indicar/ }).click();
    await expect(page.getByRole('status')).toHaveText(`Copiado: ${c.nome_urna}. Cole na conversa.`);
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiado).toContain(c.numero_urna);
    expect(copiado).toContain(`/?n=${c.numero_urna}`);
    expect(copiado).toContain(c.nome_urna);
  });

  test('o link indicado abre a vitrine só com o santinho do candidato, mesmo oculto', async ({ page }) => {
    for (const c of [naoMarcados[0], ocultos[0]]) {
      await page.goto(`/?n=${c.numero_urna}`);
      await expect(santinhos(page)).toHaveCount(1);
      await expect(santinho(page, c)).toBeVisible();
    }
  });

  test('o link indicado também funciona com a vitrine já aberta (navegação sem recarregar)', async ({ page }) => {
    await abrir(page);
    const c = naoMarcados[0];
    await page.evaluate((n) => {
      const a = document.createElement('a');
      a.href = `/?n=${n}`;
      document.body.append(a);
      a.click();
    }, c.numero_urna);
    await expect(page).toHaveURL((u) => u.search === `?n=${c.numero_urna}`);
    await expect(santinhos(page)).toHaveCount(1);
    await expect(santinho(page, c)).toBeVisible();
  });
});
