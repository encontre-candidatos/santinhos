# Revisão de design — Vitrine de reeleição MG 2026

Conferida em **30/09/2026** (WP06), contra o build de produção servido por `vite preview`
(base vazio), com os dados reais de `src/lib/dados/` (48 candidatos, corte PL, PRTB).
Referências: spec C-007 e NFR-008; conceito aprovado em `research.md` R7; amostra
`kitty-specs/vitrine-reeleicao-mg-2026-01M3T7D9/research/amostra-santinho-urna.html`.

## 1. Vetos de C-007

Varredura de `src/` (Svelte, CSS, TS) e de `static/*.svg`, mais inspeção das capturas.
Comandos usados: `grep -rni gradient`, `background-clip|text-fill`, `backdrop|blur(`,
`border-radius`, `box-shadow|text-shadow`, `Inter|system-ui|font-family`, faixas Unicode de
emoji (U+1F300–1FAFF, U+2600–27BF), `hero|destaque|cta`.

| Veto (C-007) | Resultado | Evidência |
|---|---|---|
| Degradê roxo-azul ou roxo-rosa | ausente | Único `gradient` é a retícula de pontos pretos a 20% do caso "sem foto" (`Santinho.svelte:135`), sobre o tom claro do partido; não é degradê de cor. |
| Texto com degradê | ausente | Nenhum `background-clip: text` / `text-fill-color`. |
| Efeito de vidro fosco | ausente | Nenhum `backdrop-filter` nem `blur(`. |
| Grade de cartões brancos idênticos, canto arredondado, sombra suave | ausente | Mesa em colunas (`columns: 3 230px`, `Vitrine.svelte`), santinhos com rotação alternada e alturas que variam com o nome; nenhum `border-radius` diferente de 0 (`Aviso.svelte:72`, `Painel.svelte:200` zeram o do navegador); todas as sombras são duras, sem desfoque (`Santinho.svelte:116` `3px 4px 0`, `Aviso.svelte:59`, `Painel.svelte:115`, teclas `inset`). |
| Emoji no lugar de ícone | ausente | Nenhum caractere nas faixas de emoji; o único ícone (dica de instalação no iOS) é SVG em traço (`DicaInstalar.svelte`). |
| Fonte do sistema ou "Inter" como única tipografia | ausente | "Inter" não aparece. No build carregam Big Shoulders Display 600/800/900, Public Sans 400/600/700 e JetBrains Mono 500/700 (conferido por `document.fonts`, todas `loaded`). `system-ui` só como reserva em `tokens.css:31`, e no texto de `+page.svelte:12`, que só aparece se a Vitrine não existir (não acontece no build). |
| Seção de destaque genérica com título grande e botão centralizado | ausente | Não há hero: a página abre direto na urna (filtros) e na mesa de santinhos. |
| Frases de efeito vazias | ausente | Textos lidos um a um (Painel, Rodapé, estado vazio, aviso, dica): todos descrevem dado, ação ou limitação ("Corte por partido: PL, PRTB", "O carimbo marca o partido, não a pessoa…"). |

**Total: 0 presentes** (NFR-008).

## 2. Comparação com a amostra aprovada

Capturas em `test-results/revisao-design/` (não versionadas): `vitrine-1280.png`,
`vitrine-1280-corte-desligado.png`, `vitrine-360.png`, `vitrine-360-corte-desligado.png`,
`amostra-1280.png`, `amostra-360.png`. Para refazer: subir `npx vite preview --port 4221`
depois de `npm run build` e capturar com o Playwright nas larguras 1280×900 e 360×740.

Igual à amostra: paleta (tokens copiados), as três fontes, urna com visor, teclas pretas,
BRANCO/CORRIGE/CONFIRMA, CONFIRMA tracejada quando o corte está desligado, santinho com faixa do
partido, número em casas de dígito, selo de situação, carimbo vermelho rotacionado, colunas
irregulares, rodapé em três blocos, sombra dura.

| Diferença | Motivo |
|---|---|
| Foto real no lugar das iniciais grandes | A amostra tinha pessoas fictícias; as iniciais ficam como reserva quando a foto falta ou falha (testado em `casos-limite.spec.ts`). |
| Faixa "Amostra" do topo some | Era aviso de dados fictícios. |
| No celular (≤ 860 px), Partido e Ordenar ficam em "Mais filtros" (fechado) | Decisão do WP05 (`Painel.svelte`, comentário de topo): busca e teclas grandes à vista, as 14 teclas de partido (siglas de `candidatos.json` em 30/09/2026) recolhidas para a mesa aparecer logo. **Diverge do texto do R7**, que previa "teclado recolhido numa barra fixa embaixo": o recolhimento ficou no próprio painel, sem barra fixa. A confirmar na aceitação. |
| Fundo do carimbo: papel a 92% (amostra: branco a 72%) | Sobre foto escura o fundo da amostra dava 3,28:1; com papel a 92%, 5,46:1 (claro) e 4,62:1 (escuro). Decisão do WP04. |
| Teclas e botões com no mínimo 44 px de altura no celular | Área de toque (WP04/WP05). |
| Teclas de partido só com siglas presentes entre os candidatos, em ordem alfabética; REPUBLICANOS ocupa duas casas | Dados reais; sigla longa não cabe numa casa. |
| Rodapé com `<details>` dos deputados que não concorrem | Caso-limite da spec (FR-001), não existia na amostra. |
| Faixa do partido com 8 px (R7 fala em 4 px) | Segue a amostra aprovada, que já usava 8 px. |

## 3. Contrastes (NFR-004)

Medidos de novo no build em 30/09/2026, lendo os tokens com `getComputedStyle` nos dois temas
(`colorScheme` emulado) e aplicando a fórmula WCAG 2. O histórico do WP04 trazia fg/mesa,
tinta/papel, carimbo/papel, muted/mesa, tinta-2/papel e o texto sobre confirma/corrige; os
valores conferem. Pares novos (fundo da urna e do visor) acrescentados aqui.

| Par | Claro | Escuro |
|---|---|---|
| `--fg` / `--mesa` | 13,53 | 13,56 |
| `--muted` / `--mesa` | 6,71 (era 5,67) | 7,42 |
| `--muted` / `--urna` | 5,09 (era 4,30 ✗) | 5,32 |
| `--fg` / `--urna` | 10,28 | 9,73 |
| `--tinta` / `--papel` | 17,64 | 15,19 |
| `--tinta-2` / `--papel` | 6,89 | 5,93 |
| `--tinta` / `--visor` | 14,72 | 12,90 |
| `--tinta-2` / `--visor` | 5,75 | 5,04 |
| `--carimbo` / `--papel` | 6,48 | 4,71 |
| `--tecla-tx` / `--tecla` | 16,50 | 16,50 |
| `#111` / `--confirma` | 6,67 | 6,67 |
| `#111` / `--corrige` | 6,59 | 6,59 |
| `#111` / `--branco` | 17,27 | 15,49 |
| carimbo sobre `--carimbo-fundo` com foto preta (WP04) | 5,46 | 4,62 |

**Defeito encontrado e corrigido (30/09/2026):** no tema claro, `--muted` (#4f5752) sobre
`--urna` (#cdc4b1) dava 4,30:1, abaixo de 4,5:1. Atingia o subtítulo "Deputado federal · MG · 2026"
(`.marca small`) e os rótulos "Nome de urna", "Partido", "Ordenar por" (`.rot2`) do `Painel.svelte`.
O par vinha da amostra aprovada; o WP04 tinha medido `--muted` só sobre `--mesa`. Correção:
`--muted` claro passou a `#454c48` em `src/lib/estilo/tokens.css` (5,09:1 sobre `--urna`, 6,71:1
sobre `--mesa`), e o teste do axe em `qualidade.spec.ts` voltou a ser estrito, sem exceção.

O axe (wcag2a + wcag2aa) passa sem outras violações nos temas claro e escuro, com o corte
ligado e desligado, no desktop e no perfil celular.

## 4. Atualização (NFR-007) — teste manual

Troca de service worker não é simulada em e2e (frágil e de pouco valor). Conferência manual, a
refazer no WP07 sobre o site publicado:

1. Com o app instalado (Android ou computador) e aberto ao menos uma vez com rede, anotar a data
   de "Conferido em …" no rodapé.
2. Rodar `npm run base`, conferir que `data_conferido` mudou em `src/lib/dados/base.json`,
   publicar (push que dispara o workflow do Pages).
3. Abrir o app instalado **com rede**: a primeira abertura baixa o SW novo (`skipWaiting` e
   `clientsClaim` ligados em `vite.config.ts`, então ele assume sem esperar as abas fecharem).
4. Fechar e abrir de novo (segunda abertura): a data do rodapé e a contagem do visor devem ser
   as da base nova.
5. Pôr em modo avião e abrir: deve abrir a versão nova, do cache.

Falha se, na segunda abertura com rede, a data continuar a antiga.

## 5. Mudança de 02/10/2026: todos visíveis, extrema direita marcada

Decisão da usuária em 02/10/2026 (spec, "Mudança de 02/10/2026", Cenário 2, FR-005 a FR-007):
nenhum candidato é ocultado por partido; os de sigla marcada em `partidos.json` levam a marca
"EXTREMA DIREITA". O que está nas seções 1 a 4 sobre corte, CONFIRMA e carimbo rotacionado
descreve a versão de 30/09/2026 e fica como registro.

**Marca no santinho** (`Carimbo.svelte`, `Santinho.svelte`). A faixa fina do partido dá lugar a
uma faixa vermelha `--carimbo` com "EXTREMA DIREITA" em Big Shoulders Display 900, 30 px (o
mesmo corpo do nome de urna), texto `--carimbo-tx` (#fffefa) e contorno interno claro de 2 px,
como carimbo de borracha (R7). O cartão ganha moldura vermelha dura de 4 px e a foto fica em
cinza; nome, número, selo de situação e links ficam como estão. O texto visível vai com
`aria-hidden`; o leitor de tela ouve "Partido classificado como extrema direita" (a marca é da
legenda, não da pessoa). O carimbo rotacionado sobre a foto saiu, e com ele `--carimbo-fundo`.

| Par novo | Claro | Escuro |
|---|---|---|
| `--carimbo-tx` (#fffefa) / `--carimbo` | 6,48 (#b3261e) | 5,47 (#c2332a) |
| `--tinta` / `--visor` (linha "N marcados como extrema direita") | 14,72 | 12,90 |

O vermelho não foi usado como cor de texto no visor: `--carimbo` sobre `--visor` dá 5,41 no
claro, mas 4,01 no escuro. O vermelho ali é só o fio à esquerda da linha.

**Visor.** "48 candidatos" sem filtro; "N de 48" com busca ou partido; "13 marcados como
extrema direita" (dos exibidos); "Partidos marcados: PL, PRTB". Tudo derivado de
`candidatos.json` e `partidos.json`.

**Teclas grandes.** CONFIRMA saiu (não havia mais o que confirmar, e inventar outro filtro de
ocultação contrariaria FR-005). Ficam BRANCO ("limpa filtros": volta ao início) e CORRIGE
("apaga busca": apaga só o texto digitado, mantém o partido), em duas colunas. As teclas de
partido incluem todas as siglas presentes, PL e PRTB também. O estado vazio não fala mais em
corte.

Vetos de C-007: a mudança não acrescenta degradê, vidro, canto arredondado, sombra suave nem
emoji (a moldura é `outline` sólido; a faixa é cor chapada). Capturas da conferência:
`marca-desktop.png` (1280 px, claro) e `marca-celular.png` (360 px, escuro), fora do repositório.

