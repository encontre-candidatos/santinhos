# Conferência da participação no mandato anterior (NFR-043)

Gerado por `npm run base` (scripts/lib/votacoes-mandato-anterior.mjs) em 03/10/2026. A parte de cima não se edita à mão.

- Candidatos fora do mandato e já eleitos deputado federal: 11; com bloco: 11; com "sem dados": 0.
- Fonte das votações: a lista "Votações nominais em Plenário" da página de cada deputado na Câmara, um ano por página; exercício pelo histórico da Câmara (`GET /deputados/{id}/historico`).

## Ligação e contagem por candidato

`total` = votações da lista com data em que ele estava em exercício; `votou` = dessas, em quantas tem voto registrado, de qualquer tipo. N = votou/total × 10, arredondado; 10 só com todas. "Em exercício" vai do dia de entrada ao dia da saída, este fora da conta.

| Candidato | SQ 2026 | Último mandato | UF | id Câmara | Ligação | Em exercício | Votou | Total | N em 10 | Motivo sem dados |
|---|---|---|---|---:|---|---|---:|---:|---:|---|
| CHARLLES EVANGELISTA | 130002547840 | 2019–2022 | MG | 204490 | cpf | 01/02/2019 a 31/01/2023 | 1665 | 1986 | 8 | |
| FABINHO RAMALHO | 130002542011 | 2019–2022 | MG | 141427 | cpf | 01/02/2019 a 31/01/2023 | 1370 | 1986 | 7 | |
| FRANCO CARTAFINA | 130002548796 | 2019–2022 | MG | 204510 | cpf | 01/02/2019 a 31/01/2023 | 1613 | 1986 | 8 | |
| SUBTENETE GONZAGA | 130002542022 | 2019–2022 | MG | 177282 | cpf | 01/02/2019 a 31/01/2023 | 1560 | 1986 | 8 | |
| VILSON DA FETAEMG | 130002543696 | 2019–2022 | MG | 204483 | cpf | 01/02/2019 a 31/01/2023 | 1802 | 1986 | 9 | |
| DELEGADO EDSON MOREIRA | 130002542033 | 2015–2018 | MG | 178893 | cpf | 01/02/2015 a 31/01/2019 | 830 | 883 | 9 | |
| EDUARDO CUNHA | 130002537224 | 2015–2018 | RJ | 74173 | cpf | 01/02/2015 a 05/05/2016 | 344 | 348 | 9 | |
| LAUDIVIO CARVALHO | 130002543597 | 2015–2018 | MG | 178894 | cpf | 01/02/2015 a 31/01/2019 | 801 | 883 | 9 | |
| ANDERSON ADAUTO | 130002535318 | 2003–2006 | MG | 74146 | cpf | 01/02/2003 a 03/02/2003; 15/03/2004 a 31/12/2004 | 17 | 96 | 2 (vermelho) | |
| HERCULANO | 130002537193 | 2003–2006 | MG | 74660 | cpf | 01/02/2003 a 11/03/2003; 21/03/2003 a 16/02/2004; 18/11/2004 a 01/02/2005; 31/03/2006 a 31/01/2007 | 108 | 243 | 4 (vermelho) | |
| LEONARDO MATTOS | 130002539841 | 2003–2006 | MG | 74155 | cpf | 01/02/2003 a 20/02/2003; 07/03/2003 a 31/01/2007 | 281 | 464 | 6 | |

## Por ano: votações listadas na página / em exercício / votou

| Candidato | 1º ano | 2º ano | 3º ano | 4º ano |
|---|---|---|---|---|
| CHARLLES EVANGELISTA | 2019: 324 / 324 / 282 | 2020: 394 / 394 / 351 | 2021: 762 / 762 / 645 | 2022: 506 / 506 / 387 |
| FABINHO RAMALHO | 2019: 324 / 324 / 212 | 2020: 394 / 394 / 258 | 2021: 762 / 762 / 550 | 2022: 506 / 506 / 350 |
| FRANCO CARTAFINA | 2019: 324 / 324 / 301 | 2020: 394 / 394 / 340 | 2021: 762 / 762 / 602 | 2022: 506 / 506 / 370 |
| SUBTENETE GONZAGA | 2019: 324 / 324 / 231 | 2020: 394 / 394 / 318 | 2021: 762 / 762 / 648 | 2022: 506 / 506 / 363 |
| VILSON DA FETAEMG | 2019: 324 / 324 / 273 | 2020: 394 / 394 / 353 | 2021: 762 / 762 / 729 | 2022: 506 / 506 / 447 |
| DELEGADO EDSON MOREIRA | 2015: 286 / 286 / 279 | 2016: 214 / 214 / 196 | 2017: 234 / 234 / 221 | 2018: 149 / 149 / 134 |
| EDUARDO CUNHA | 2015: 286 / 286 / 284 | 2016: 62 / 62 / 60 | 2017: 0 / 0 / 0 | 2018: 0 / 0 / 0 |
| LAUDIVIO CARVALHO | 2015: 286 / 286 / 269 | 2016: 214 / 214 / 202 | 2017: 234 / 234 / 196 | 2018: 149 / 149 / 134 |
| ANDERSON ADAUTO | 2003: 0 / 0 / 0 | 2004: 96 / 96 / 17 | 2005: 0 / 0 / 0 | 2006: 0 / 0 / 0 |
| HERCULANO | 2003: 150 / 147 / 60 | 2004: 35 / 35 / 8 | 2005: 0 / 0 / 0 | 2006: 61 / 61 / 40 |
| LEONARDO MATTOS | 2003: 150 / 147 / 101 | 2004: 118 / 118 / 67 | 2005: 93 / 93 / 47 | 2006: 106 / 106 / 66 |

<!-- conferência à mão: tudo abaixo desta linha é preservado por npm run base -->

## Conferência à mão (NFR-043)

Ligação de cada um com a página do deputado na Câmara, e `votou`/`total` de 3 sorteados
contra a mesma página (diferença aceita: até 2 votações).

Conferido em 03/10/2026 (Claude, WP18).

### Ligações (11 de 11)

Todas por CPF. Para cada uma, nome civil e nascimento do deputado em `GET /deputados/{id}`
contra o nome civil do registro de 2026 no TSE:

| Candidato | id Câmara | Nome civil na Câmara | Nascimento | Nome civil no TSE 2026 | Confere |
|---|---:|---|---|---|---|
| CHARLLES EVANGELISTA | 204490 | CHARLLES THOMACELLI EVANGELISTA | 27/12/1984 | CHARLLES THOMACELLI EVANGELISTA | sim |
| FABINHO RAMALHO | 141427 | FÁBIO AUGUSTO RAMALHO DOS SANTOS | 22/12/1961 | FABIO AUGUSTO RAMALHO DOS SANTOS | sim |
| FRANCO CARTAFINA | 204510 | FRANCO CARTAFINA GOMES | 03/11/1986 | FRANCO CARTAFINA GOMES | sim |
| SUBTENETE GONZAGA | 177282 | LUIZ GONZAGA RIBEIRO | 31/05/1962 | LUIZ GONZAGA RIBEIRO | sim |
| VILSON DA FETAEMG | 204483 | VILSON LUIZ DA SILVA | 01/05/1957 | VILSON LUIZ DA SILVA | sim |
| DELEGADO EDSON MOREIRA | 178893 | EDSON MOREIRA DA SILVA | 16/04/1959 | EDSON MOREIRA DA SILVA | sim |
| EDUARDO CUNHA | 74173 | EDUARDO COSENTINO DA CUNHA | 29/09/1958 | EDUARDO COSENTINO DA CUNHA | sim |
| LAUDIVIO CARVALHO | 178894 | LAUDIVIO ALVARENGA CARVALHO | 16/07/1962 | LAUDIVIO ALVARENGA CARVALHO | sim |
| ANDERSON ADAUTO | 74146 | ANDERSON ADAUTO PEREIRA | 06/04/1957 | ANDERSON ADAUTO PEREIRA | sim |
| HERCULANO | 74660 | HERCULANO ANGHINETTI | 25/04/1960 | HERCULANO ANGHINETTI | sim |
| LEONARDO MATTOS | 74155 | LEONARDO JOSÉ DE MATTOS | 09/11/1955 | LEONARDO JOSE DE MATTOS | sim |

### `votou`/`total` de 3 sorteados contra a página

Sorteio com `random.Random(20261003).sample` sobre os 11, em ordem de mandato: Charlles
Evangelista, Herculano, Leonardo Mattos. Página = lista
`camara.leg.br/deputados/{id}/votacoes-nominais-plenario/{ano}` dos 4 anos, contada linha a linha.

| Candidato | Página: votações / com voto | Base: total / votou | Diferença | Por quê |
|---|---:|---:|---|---|
| CHARLLES EVANGELISTA | 1.986 / 1.665 | 1.986 / 1.665 | 0 / 0 | — |
| HERCULANO | 246 / 108 | 243 / 108 | 3 / 0 | 3 votações em 12, 18 e 19/03/2003, na licença de 11 a 20/03/2003 (histórico) |
| LEONARDO MATTOS | 467 / 282 | 464 / 281 | 3 / 1 | 3 votações em 25 e 26/02/2003, na licença de 20/02 a 06/03/2003; a página marca a sessão como ausência por licença e registra um "Não" numa delas |

Contada só nos dias em exercício, que é a regra de FR-071, a página bate exatamente com a base
nos três. Os 3 de diferença são os dias de licença que a página lista e FR-071 manda tirar; o
N do cartão é o mesmo com ou sem eles (Herculano 4, Leonardo 6).

Mais 2 sorteados entre os que tinham número na primeira medição (`sample` de 2 sobre os outros 7,
mesma semente), para cobrir 2015–2018: Fabinho Ramalho 1.986 / 1.370 e Delegado Edson Moreira
883 / 830, iguais à página.
