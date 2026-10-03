# Encontre candidatos

Lista dos deputados federais de Minas Gerais que tentam a reeleição em 2026, com a marca
"EXTREMA DIREITA" em quem é de partido classificado assim. Ninguém é escondido. Funciona no
celular e pode ser instalada como aplicativo.

Endereço: (a preencher na publicação)

## Como a marca funciona

A página parte dos deputados federais de MG em exercício na 57ª legislatura (Câmara) e fica
com os que registraram candidatura a deputado federal por MG em 2026 (TSE). Cada candidato
aparece com o partido de 2026; quem trocou de partido mostra também o da posse.

A marca é por **partido**: todo candidato de sigla marcada em `src/lib/dados/partidos.json`
com `"extrema_direita": true` (hoje PL e PRTB) aparece com uma faixa vermelha "EXTREMA
DIREITA" no topo do santinho. Todos os candidatos aparecem sempre; não há filtro que esconda
por partido (mudança de 02/10/2026; até 01/10 eles começavam escondidos).

**Limitação aceita.** A marca por partido deixa sem marca parlamentares com atuação de
extrema direita filiados a partidos classificados como centro ou centro-direita (ex.: PP,
União Brasil, Republicanos), e marca por inteiro um partido classificado mesmo que algum
filiado destoe da legenda. A página classifica a legenda, não o parlamentar: a marca
significa "partido classificado como extrema direita", e não "parlamentar de extrema
direita", e o leitor de tela ouve essa frase. O próximo passo, quando isso falhar na
prática, é usar as votações nominais da Câmara.

## Fontes e data

Câmara dos Deputados (Dados Abertos) e TSE (Dados Abertos, candidatos 2026). Os endereços
exatos, a data de conferência e a lista de quem não concorre estão em
[`src/lib/dados/base.json`](src/lib/dados/base.json); a página mostra os mesmos dados.

## Uso

Requer Node 24.

```bash
npm install
npm run dev                         # http://localhost:5173, sem service worker
npm run build && npm run preview    # testa instalação e modo offline
```

Abrir `build/index.html` direto do disco não funciona: precisa de servidor.

### Atualizar a base

```bash
npm run base                 # baixa Câmara e TSE e regrava src/lib/dados/ e static/fotos/
npm run base -- --cache      # reaproveita respostas da Câmara e fotos já baixadas
npm run base -- --atualizar  # baixa de novo os zips do TSE
```

O script imprime as listas que geram cada número. Se algum deputado não casar com certeza
com uma candidatura, ele não grava nada e pede a decisão em `scripts/decisoes-manuais.json`.
Nenhum CPF é gravado; ele só serve ao cruzamento em memória.

### Mudar a lista de partidos

Editar `src/lib/dados/partidos.json`: `extrema_direita`, `classificado_em` e `motivo` de
cada sigla. Um push em `main` republica a página pelo GitHub Actions.

### Testes

```bash
npm run check       # tipos
npm test            # Vitest
npm run test:e2e    # Playwright: cenários, offline, 360 px, teclado, acessibilidade
```

## Aviso

Projeto pessoal. Sem vínculo com a Câmara dos Deputados, o TSE ou qualquer partido. Os dados
vêm das fontes oficiais acima; a classificação dos partidos é escolha da autora.
