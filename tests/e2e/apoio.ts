// Apoio dos testes e2e (WP06): os números esperados saem sempre dos JSON reais de
// src/lib/dados, nunca de constantes no teste. Seletores por papel e rótulo.
import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Base, Candidato, Partido } from '../../src/lib/tipos';

// Lidos do disco (e não por import) para não depender do suporte a import de JSON em ESM.
const ler = <T>(nome: string): T =>
  JSON.parse(readFileSync(new URL(`../../src/lib/dados/${nome}`, import.meta.url), 'utf-8')) as T;

/** Todos os candidatos da base (756 em 02/10/2026, WP13). */
export const todos = ler<Candidato[]>('candidatos.json');
/** À mostra ao abrir: quem tenta a reeleição e quem já teve cargo; os demais ficam ocultos (FR-036). */
export const candidatos = todos.filter((c) => c.reeleicao || c.cargos_anteriores.length > 0);
/** Quem tenta a reeleição: só esses têm selo da 6x1, participação e link da Câmara (FR-038). */
export const deputados = todos.filter((c) => c.reeleicao);
export const ocultos = todos.filter((c) => !c.reeleicao && c.cargos_anteriores.length === 0);
export const partidos = ler<Partido[]>('partidos.json');
export const base = ler<Base>('base.json');
// Desde 02/10/2026 ninguém é ocultado: as siglas de extrema direita só decidem a marca (FR-005/006).
export const siglasMarcadas = partidos.filter((p) => p.extrema_direita).map((p) => p.sigla);
export const marcados = candidatos.filter((c) => siglasMarcadas.includes(c.partido));
export const naoMarcados = candidatos.filter((c) => !siglasMarcadas.includes(c.partido));

/** Texto visível da marca e a frase que o leitor de tela ouve no lugar dela. */
export const MARCA = 'EXTREMA DIREITA';
export const MARCA_SR = 'Partido classificado como extrema direita';

/** Mesma normalização da busca do app: sem acento, minúsculo, pontuação vira espaço. */
export function normalizar(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Candidatos que a busca `q` deve achar (nome de urna ou civil). */
export function casam(lista: Candidato[], q: string): Candidato[] {
  const n = normalizar(q);
  return lista.filter((c) => `${normalizar(c.nome_urna)}|${normalizar(c.nome_civil)}`.includes(n));
}

export const santinhos = (page: Page) => page.getByRole('article');
// Pelo nome e pelo número: há nomes de urna repetidos entre os 756 (ex.: JHONATA SOUZA).
export const santinho = (page: Page, c: Candidato) =>
  page
    .getByRole('article', { name: c.nome_urna, exact: true })
    .filter({ has: page.getByRole('img', { name: 'Número ' + c.numero_urna, exact: true }) });

export const busca = (page: Page) => page.getByRole('searchbox', { name: 'Nome de urna' });
/** "Limpar filtros" do painel (o estado vazio tem outro, na mesa). Só existe com filtro ativo. */
export const teclaLimpar = (page: Page) =>
  page.getByRole('complementary', { name: 'Filtros' }).getByRole('button', { name: 'Limpar filtros' });

/** Linha do visor: "N de M", com M = todos da base, ocultos incluídos (FR-040). */
export const visorContagem = (page: Page, exibidos: number) =>
  page.getByRole('complementary', { name: 'Filtros' }).getByText(`${exibidos} de ${todos.length}`, { exact: true });

/** A linha "N marcados como extrema direita" saiu do visor em 03/10/2026 (pedido da usuária). */
export const visorMarcados = (page: Page) =>
  page.getByRole('complementary', { name: 'Filtros' }).getByText(/marcados? como extrema direita/);

/** Opções do topo (WP17, FR-066): "Reeleição (N)" e "Todos os candidatos (M)". */
export const teclaReeleicao = (page: Page) => page.getByRole('button', { name: /^Reeleição \(\d+\)$/ });
export const teclaTodos = (page: Page) => page.getByRole('button', { name: /^Todos os candidatos \(\d+\)$/ });

/** Abre a vitrine e espera a mesa no estado inicial: só quem tenta a reeleição (FR-065). */
export async function abrirReeleicao(page: Page) {
  await page.goto('/');
  await expect(santinhos(page)).toHaveCount(deputados.length);
}

/** Toca em "Todos os candidatos" e espera a mesa de todos, com os ocultos escondidos (FR-036). */
export async function verTodos(page: Page) {
  await teclaTodos(page).click();
  await expect(santinhos(page)).toHaveCount(candidatos.length);
}

/**
 * Abre a vitrine e vai a "Todos os candidatos": o estado que os testes anteriores ao WP17
 * conferem (a página abria assim até 03/10/2026).
 */
export async function abrir(page: Page) {
  await abrirReeleicao(page);
  await verTodos(page);
}

/** No celular partido fica em "Mais filtros" (fechado); no desktop sempre aberto. */
export async function abrirMaisFiltros(page: Page) {
  const resumo = page.getByText('Mais filtros');
  if (await resumo.isVisible()) {
    const aberto = await resumo.evaluate((el) => (el.closest('details') as HTMLDetailsElement).open);
    if (!aberto) await resumo.click();
  }
}

/** Faz o "Indicar" cair na cópia: sem Web Share. Rodar antes do goto. */
export async function semCompartilhar(page: Page) {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { share?: unknown }).share;
    delete (Navigator.prototype as { canShare?: unknown }).canShare;
  });
}

/** Tab (ou Shift+Tab) até o elemento focado cumprir `alvo`, conferindo o foco visível a cada passo. */
export async function tabAte(page: Page, alvo: (el: Element) => boolean, maximo = 120) {
  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate((fonte) => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const st = getComputedStyle(el);
      const casa = new Function('el', `return (${fonte})(el)`)(el) as boolean;
      return {
        casa,
        desc: `${el.tagName} ${el.textContent?.trim().slice(0, 40)}`,
        focoVisivel: el.matches(':focus-visible'),
        contorno: st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2
      };
    }, alvo.toString());
    if (!info) continue;
    expect(info.focoVisivel, `:focus-visible em ${info.desc}`).toBe(true);
    expect(info.contorno, `contorno de foco em ${info.desc}`).toBe(true);
    if (info.casa) return;
  }
  throw new Error('alvo não alcançado só com Tab');
}
