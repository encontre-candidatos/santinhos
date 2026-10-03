# Medição: votos nominais da Câmara nos mandatos anteriores (WP18, 03/10/2026)

Pergunta (T081): a Câmara tem votos nominais por deputado no Plenário para 2003–2006, 2015–2018
e 2019–2022, os períodos dos 11 ex-deputados federais da base de 02/10/2026? E de qual fonte?

Resposta: tem, nos três. A fonte que serve é a lista **"Votações nominais em Plenário"** da
página de cada deputado no portal
(`https://www.camara.leg.br/deputados/{id}/votacoes-nominais-plenario/{ano}`). Os arquivos anuais
dos Dados Abertos, sugeridos no prompt do WP, não têm todas as votações, e a falta é grande nos
períodos antigos.

## 1. Arquivos anuais dos Dados Abertos

- `https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-<ano>.csv`
- `https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-<ano>.csv`

Plenário = `idOrgao` 180; nominal = votação do Plenário com pelo menos uma linha de voto.

| Ano | Votações do Plenário | Nominais |
|---|---:|---:|
| 2003 | 1.024 | 32 |
| 2004 | 971 | 72 |
| 2005 | 727 | 49 |
| 2006 | 845 | 57 |
| 2015 | 1.424 | 275 |
| 2016 | 887 | 196 |
| 2017 | 1.249 | 210 |
| 2018 | 787 | 135 |
| 2019 | 962 | 316 |
| 2020 | 1.313 | 393 |
| 2021 | 1.572 | 755 |
| 2022 | 1.339 | 507 |

As votações com voto registrado fora do órgão 180 são de comissões (CCJC, CE, CPIs, comissões
especiais de PEC), não de Plenário: não explicam a diferença abaixo.

## 2. Comparação com a página do deputado

Linhas da lista da página (uma por votação, com a data da sessão) contra as nominais do arquivo
anual, para os 5 conferidos (sorteio da NFR-043, ver docs/conferencia-mandato-anterior.md):

| Deputado (id) | Período | Página: votações / com voto | Arquivo anual: nominais em exercício / votou |
|---|---|---:|---:|
| Charlles Evangelista (204490) | 2019–2022 | 1.986 / 1.665 | 1.971 / 1.650 |
| Fabinho Ramalho (141427) | 2019–2022 | 1.986 / 1.370 | 1.971 / 1.360 |
| Delegado Edson Moreira (178893) | 2015–2018 | 883 / 830 | 816 / 772 |
| Leonardo Mattos (74155) | 2003–2006 | 467 / 282 | 209 / 125 |
| Herculano (74660) | 2003–2006 | 246 / 108 (lista inclui dias de licença) | 74 / 26 |

O arquivo anual tem 99% das votações da página em 2019–2022, 92% em 2015–2018 e cerca de 45% em
2003–2006. O N do cartão coincidiu nos 5 (8, 7, 9, 6 e 4), mas `total` e `votou` passam muito
da diferença de 2 votações que a NFR-043 aceita, e o leitor de tela lê os números exatos (FR-074).

## 3. Decisão (03/10/2026)

As votações vêm da página do deputado, uma página por ano do período (44 no total, com cache em
`scripts/.cache/camara-mandato-anterior/`). Ligação e exercício continuam na API (`/deputados`,
`/deputados/{id}`, `/deputados/{id}/historico`).

- **O que se aceita**: a fonte é HTML do portal, não um conjunto de Dados Abertos; uma mudança de
  layout quebra a leitura. O leitor falha alto (sem o título da lista e sem o aviso de ano vazio,
  a coleta para) em vez de contar zero. A página lista também as votações dos dias de licença
  (marcadas como ausência): o filtro pelos intervalos em exercício do histórico tira essas.
- **Gatilho para reabrir**: a coleta parar por layout, ou os Dados Abertos passarem a ter as
  mesmas votações da página (aí voltar para os arquivos anuais, que já foram medidos aqui).

## Outros achados

- O servidor dos arquivos anuais corta downloads longos sem erro HTTP (7 de 12 arquivos de votos
  vieram incompletos na primeira tentativa; ex.: 2021 com 28,9 MB de 107,2 MB): quem voltar a eles
  precisa conferir o `Content-Length`.
- A API caiu por alguns minutos ("upstream request timeout" e 504 em qualquer endpoint) enquanto
  os arquivos e o portal seguiam no ar; o `--cache` do montador evita refazer as chamadas.
- `arquivos/deputados/csv/deputados.csv` traz o CPF vazio para todos: a ligação (FR-072) usa
  `GET /deputados/{id}`, que traz o CPF.
- O número do resumo na página principal do deputado ("Votações nominais em Plenário: 319" em
  2019, para Charlles) não bate com as linhas da lista do mesmo ano (324); a conferência usa a lista.
