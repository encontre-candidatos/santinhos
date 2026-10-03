// Cenário 11 da spec (WP13/T066): todos os candidatos, com ocultos, contra o build e os dados
// reais; NFR-020 (lista grande com CPU 4× mais lenta) e NFR-022 (offline com a base grande).
import { expect, test, type Page } from '@playwright/test';
import { abrir, busca, candidatos, deputados, ocultos, santinho, santinhos, todos, visorContagem } from './apoio';

const botaoOcultos = (page: Page) =>
  page.getByRole('complementary', { name: 'Filtros' }).getByRole('button', { name: /quem nunca teve cargo/ });
const FRASE_ACHADO = 'Nunca teve cargo eletivo. Aparece porque você buscou o número.';

/** Oculto cujo número não é começo de nenhum outro número (para a busca parcial). */
const alvo = ocultos.find((o) => todos.filter((c) => c.numero_urna === o.numero_urna).length === 1)!;
// Nunca deputado federal: o ex-deputado federal ganha a participação do último mandato (FR-070, WP18).
const prefeito = candidatos.find(
  (c) => !c.reeleicao && /^prefeit/.test(c.cargos_anteriores[0]?.cargo ?? '') && !c.cargos_anteriores.some((k) => /^deputad[oa] federal$/.test(k.cargo))
)!;

test.describe('Cenário 11: ver todos os candidatos, sem afogar', () => {
  test('base de 02/10/2026: 756 = 221 visíveis + 535 ocultos (FR-036, NFR-021)', () => {
    expect(todos).toHaveLength(756);
    expect(candidatos).toHaveLength(221);
    expect(ocultos).toHaveLength(535);
    expect(deputados).toHaveLength(48);
  });

  test('ao abrir: só os visíveis, e o visor diz quantos estão ocultos', async ({ page }) => {
    await abrir(page);
    await expect(santinhos(page)).toHaveCount(candidatos.length);
    await expect(visorContagem(page, candidatos.length)).toBeVisible();
    await expect(page.getByText(`${ocultos.length} nunca tiveram cargo eletivo e estão ocultos`, { exact: true })).toBeVisible();
    await expect(botaoOcultos(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(botaoOcultos(page)).toHaveText(`Mostrar quem nunca teve cargo (${ocultos.length})`);
  });

  test('o botão mostra os 756 e, de novo, volta a ocultar; a escolha não fica guardada', async ({ page }) => {
    test.setTimeout(120_000);
    await abrir(page);
    await botaoOcultos(page).click();
    await expect(santinhos(page)).toHaveCount(todos.length, { timeout: 60_000 }); // os 756 cartões montam aos poucos; com a máquina carregada passam dos 5 s do expect
    await expect(visorContagem(page, todos.length)).toBeVisible();
    await expect(botaoOcultos(page)).toHaveAttribute('aria-pressed', 'true');
    // Rótulo fixo: o estado vai só no aria-pressed (revisão do WP13, acessibilidade).
    await expect(botaoOcultos(page)).toHaveText(`Mostrar quem nunca teve cargo (${ocultos.length})`);
    await expect(page.getByText(FRASE_ACHADO)).toHaveCount(0);
    await botaoOcultos(page).click();
    await expect(santinhos(page)).toHaveCount(candidatos.length);

    await botaoOcultos(page).click();
    await page.reload();
    await expect(santinhos(page)).toHaveCount(candidatos.length);
  });

  test('número completo de um oculto: cartão meio transparente, com a frase, e legível', async ({ page }) => {
    await abrir(page);
    await busca(page).fill(alvo.numero_urna);
    await expect(santinhos(page)).toHaveCount(1);
    const s = santinho(page, alvo);
    await expect(s.getByText(FRASE_ACHADO, { exact: true })).toBeVisible();
    // Texto com o contraste de sempre: só foto e faixa esmaecem (NFR-004).
    const op = await s.evaluate((art) => ({
      artigo: getComputedStyle(art).opacity,
      nome: getComputedStyle(art.querySelector('h3')!).opacity,
      foto: getComputedStyle(art.querySelector('.foto img, .foto .iniciais')!).opacity
    }));
    expect(op).toEqual({ artigo: '1', nome: '1', foto: '0.4' });
    await expect(s.getByRole('link', { name: /^Câmara/ })).toHaveCount(0);
    await expect(s.getByRole('link', { name: /^DivulgaCand/ })).toHaveAttribute('href', alvo.url_divulgacand);
  });

  test('número parcial ou nome não mostram o oculto; o visor diz que há ocultos na busca', async ({ page }) => {
    await abrir(page);
    await busca(page).fill(alvo.numero_urna.slice(0, 3));
    await expect(santinho(page, alvo)).toHaveCount(0);
    await expect(page.getByText(/^\d+ ocultos? casa(m)? com a busca$/)).toBeVisible();

    await busca(page).fill(alvo.nome_urna);
    await expect(santinho(page, alvo)).toHaveCount(0);
    await expect(page.getByText(/^\d+ ocultos? casa(m)? com a busca$/)).toBeVisible();
    await expect(botaoOcultos(page)).toBeVisible();
  });

  test('quem já foi prefeito: "Já foi prefeito de <cidade> (<ano>)", sem selo da 6x1 nem participação', async ({ page }) => {
    const k = prefeito.cargos_anteriores[0];
    await abrir(page);
    const s = santinho(page, prefeito);
    await expect(s.getByText(`Já foi ${k.cargo} de ${k.lugar} (${k.ano})`)).toBeVisible();
    await expect(s.getByText('Fim da escala 6x1')).toHaveCount(0);
    await expect(s.getByText(/^De cada 10/)).toHaveCount(0);
    await expect(s.getByText('Deputado federal, tenta a reeleição')).toHaveCount(0);
  });

  test('deputado que tenta a reeleição segue com os blocos de antes (FR-039)', async ({ page }) => {
    await abrir(page);
    const s = santinho(page, deputados[0]);
    await expect(s.getByText('Deputado federal, tenta a reeleição', { exact: true })).toBeVisible();
    await expect(s.getByText('Fim da escala 6x1').first()).toBeVisible();
    await expect(s.getByRole('link', { name: /^Câmara/ })).toBeVisible();
  });
});

test.describe('NFR-020: lista grande sem travar', () => {
  test('com CPU 4× mais lenta, busca, partido e o botão de ocultos atualizam em menos de 200 ms', async ({ page }) => {
    test.skip(test.info().project.name !== 'celular', 'medida só no perfil celular (Chromium)');
    await abrir(page);
    await page.waitForLoadState('networkidle');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    try {
      const medir = (acao: string) =>
        page.evaluate(async (acao) => {
          const t0 = performance.now();
          if (acao === 'ocultos') [...document.querySelectorAll('button')].find((b) => /quem nunca teve cargo/.test(b.textContent ?? ''))!.click();
          else {
            const input = document.getElementById('busca') as HTMLInputElement;
            input.value = acao;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          return performance.now() - t0;
        }, acao);
      const tempos = { mostrar: await medir('ocultos'), buscar: await medir('silva'), limpar: await medir(''), ocultar: await medir('ocultos') };
      console.log('NFR-020 (ms, CPU 4×):', JSON.stringify(tempos));
      for (const [k, ms] of Object.entries(tempos)) expect(ms, k).toBeLessThan(200);
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });
});

test.describe('NFR-022: offline com a base grande', () => {
  test('sem rede: lista, busca por número e botão de ocultos funcionam; foto do TSE vira iniciais', async ({ page, context }) => {
    test.setTimeout(120_000);
    await abrir(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    try {
      await page.reload();
      await expect(santinhos(page)).toHaveCount(candidatos.length);
      await busca(page).fill(alvo.numero_urna);
      const s = santinho(page, alvo);
      await expect(s).toHaveCount(1);
      if (alvo.foto) await expect(s.getByRole('img', { name: `Sem foto; iniciais de ${alvo.nome_urna}` })).toBeVisible();
      await busca(page).fill('');
      await botaoOcultos(page).click();
      await expect(santinhos(page)).toHaveCount(todos.length, { timeout: 60_000 }); // os 756 cartões montam aos poucos; com a máquina carregada passam dos 5 s do expect
    } finally {
      await context.setOffline(false);
    }
  });
});
