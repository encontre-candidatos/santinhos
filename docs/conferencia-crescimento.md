# Conferência do crescimento do patrimônio declarado (FR-015, SC-006, T049)

Conferido em 02/10/2026.

## Fontes

| Arquivo | `Last-Modified` na fonte | CSV usado | Gerado pelo TSE |
|---|---|---|---|
| `consulta_cand_2026.zip` | 30/09/2026 22:36:00 GMT | `consulta_cand_2026_MG.csv` | — |
| `bem_candidato_2026.zip` | 02/10/2026 15:34:06 GMT | `bem_candidato_2026_MG.csv` | 02/10/2026 12:30:53 |
| `consulta_cand_2022.zip` | 02/10/2026 06:21:12 GMT | `consulta_cand_2022_MG.csv` (1.103 linhas de DEPUTADO FEDERAL em MG, um CPF por linha) | 02/10/2026 |
| `bem_candidato_2022.zip` | 02/10/2026 06:18:55 GMT | `bem_candidato_2022_MG.csv` (8.548 linhas, todos os cargos de MG) | 02/10/2026 03:16:35 |

Todos em `https://cdn.tse.jus.br/estatistica/sead/odsele/`.

## Método

Conta refeita fora do app, em Python com `decimal.Decimal` direto sobre os CSV (não por
`scripts/lib/somar-bens.mjs` nem por `src/lib/formatar/crescimento.ts`): candidatura de 2026
→ CPF → candidatura a deputado federal por MG em 2022 → soma dos bens daquele `SQ_CANDIDATO`.
O CPF só existiu em memória durante a conta (C-006). Resultado comparado com `patrimonio_2022`
de `src/lib/dados/candidatos.json`: **0 divergências nos 48**.

## Razão ≥ 2 na base de 02/10/2026 (13; com o piso de meio milhão, abaixo, ficam 9)

| Candidato | SQ 2026 | SQ 2022 | Total 2022 | Total 2026 | Razão | Carimbo |
|---|---|---|---|---|---|---|
| NIKOLAS FERREIRA | 130002542026 | 130001611005 | 36.820,46 | 3.898.456,67 | 105,8775 | 106× |
| SAMUEL VIANA | 130002542695 | 130001611024 | 289.873,04 | 5.786.939,00 | 19,9637 | 20× |
| MAURÍCIO DO VÔLEI | 130002541996 | 130001611021 | 305.000,00 | 1.757.000,00 | 5,7607 | 5,8× |
| PAULO ABI-ACKEL | 130002539842 | 130001613373 | 4.736.332,49 | 20.093.322,56 | 4,2424 | 4,2× |
| NEWTON CARDOSO JR | 130002547896 | 130001668913 | 2.029.907,21 | 8.086.320,28 | 3,9836 | 4,0× |
| PADRE JOÃO | 130002535303 | 130001607276 | 165.134,66 | 629.191,29 | 3,8102 | 3,8× |
| NELY AQUINO | 130002548795 | 130001634141 | 439.692,38 | 1.611.165,37 | 3,6643 | 3,7× |
| ANA PAULA LEÃO | 130002542714 | 130001615412 | 62.632,29 | 188.960,83 | 3,0170 | 3,0× |
| PEDRO AIHARA | 130002542700 | 130001596021 | 930.194,01 | 2.664.019,15 | 2,8639 | 2,9× |
| DANDARA | 130002535300 | 130001607270 | 103.921,49 | 291.812,11 | 2,8080 | 2,8× |
| DELEGADO MARCELO FREITAS | 130002542730 | 130001607654 | 486.675,25 | 1.269.430,65 | 2,6084 | 2,6× |
| LEONARDO MONTEIRO | 130002535313 | 130001607248 | 339.000,00 | 833.552,97 | 2,4589 | 2,5× |
| MARCELO ÁLVARO ANTÔNIO | 130002542016 | 130001611029 | 1.196.659,60 | 2.475.900,00 | 2,0690 | 2,1× |

Bate com a lista do planejamento de 02/10/2026, nome a nome. Logo abaixo do corte, sem carimbo:
BRUNO FARIAS 1,9481 (804.739,83 → 1.567.741,45), RAFAEL SIMÕES 1,8732, EMIDINHO MADEIRA 1,8600.

## Piso de meio milhão (decisão de 02/10/2026, depois da conta acima)

A razão sozinha marcava bases pequenas: ANA PAULA LEÃO ia de R$ 62.632 para R$ 188.961 (3,0×) com
só R$ 126 mil a mais. Regra nova: carimbo quando a razão é ≥ 2 **e** o aumento de 2022 para 2026 é
de pelo menos R$ 500.000. Na mesma base, saem 4 dos 13; ficam **9**.

| Candidato | Razão | Aumento | Fica? |
|---|---|---|---|
| NIKOLAS FERREIRA | 105,8775 | 3.861.636,21 | sim |
| SAMUEL VIANA | 19,9637 | 5.497.065,96 | sim |
| MAURÍCIO DO VÔLEI | 5,7607 | 1.452.000,00 | sim |
| PAULO ABI-ACKEL | 4,2424 | 15.356.990,07 | sim |
| NEWTON CARDOSO JR | 3,9836 | 6.056.413,07 | sim |
| PADRE JOÃO | 3,8102 | 464.056,63 | não |
| NELY AQUINO | 3,6643 | 1.171.472,99 | sim |
| ANA PAULA LEÃO | 3,0170 | 126.328,54 | não |
| PEDRO AIHARA | 2,8639 | 1.733.825,14 | sim |
| DANDARA | 2,8080 | 187.890,62 | não |
| DELEGADO MARCELO FREITAS | 2,6084 | 782.755,40 | sim |
| LEONARDO MONTEIRO | 2,4589 | 494.552,97 | não (R$ 5.447,03 abaixo do piso) |
| MARCELO ÁLVARO ANTÔNIO | 2,0690 | 1.279.240,40 | sim |

## Diferença com o planejamento: MIGUEL ÂNGELO

O planejamento dizia que Miguel Ângelo não concorreu a deputado federal em 2022
(`patrimonio_2022 = null`). Ele concorreu: `consulta_cand_2022_MG.csv` traz a candidatura a
DEPUTADO FEDERAL por MG (SQ 130001607253, PT, ELEITO POR QP), sem nenhuma linha em
`bem_candidato_2022_MG.csv`. Pela regra do T046 ("concorreu sem bens → 0") a base grava
`patrimonio_2022 = 0`. O carimbo não muda: com 2022 zero não há razão, então não há carimbo.
Conferido à mão no DivulgaCand 2022 em 02/10/2026
(https://divulgacandcontas.tse.jus.br/divulga/#/candidato/SUDESTE/MG/2040602022/130001607253/2022/MG):
a página diz "Não há bens a declarar". É declaração de zero, não falta no arquivo. Também não
há candidatura dele em MG em 2018 nem em 2020 (`consulta_cand_2018_MG.csv`,
`consulta_cand_2020_MG.csv`, busca pelo CPF em memória): 2022 foi a primeira.
Nenhum dos 48 está sem candidatura a deputado federal por MG em 2022 nesta data; o caso
`null` está coberto pelos testes com dados fictícios.

## Registro: aplicação repetida na declaração de 2026 de NIKOLAS FERREIRA

Em `bem_candidato_2026_MG.csv`, a declaração de NIKOLAS FERREIRA (SQ 130002542026, 34 itens)
traz duas linhas "Outras aplicações e Investimentos" de R$ 298.652,10 (itens 13 e 26). A base
soma as duas, como o TSE publicou. Sem uma delas, o total de 2026 seria R$ 3.599.804,57 e a
razão 97,8× — o carimbo continuaria, com "98×" no lugar de "106×".

## Pendente: DivulgaCand

O SC-006 pede conferência com o DivulgaCand das duas eleições. Em 02/10/2026 a API do
DivulgaCand (`/divulga/rest/v1/candidatura/buscar/...`) seguiu respondendo 403 a `curl`, como
no WP08 (`docs/conferencia-patrimonio.md`). A comparação acima é com os arquivos de dados abertos
que o DivulgaCand também publica, não com a página. Abrir os 9 marcados e BRUNO FARIAS no
DivulgaCand 2022 e 2026 à mão fecha o SC-006.

## SC-006 fechado por aceitação (decisão da usuária, 02/10/2026)

Fica valendo a conferência contra os arquivos de dados abertos do TSE de 02/10/2026 (tabelas
acima, refeitas em Python fora do app, 0 divergências nos 48), sem a página do DivulgaCand, que
bloqueia acesso automático (403). O que se aceita: o DivulgaCand pode mostrar valor diferente do
arquivo, por declaração atualizada depois da geração do CSV ou por item tratado de outro jeito
(como a aplicação repetida de NIKOLAS FERREIRA).

Reabrir se: alguém contestar o valor de um dos 9 marcados (ou de BRUNO FARIAS, o mais perto do
corte pela razão); ou o TSE publicar `bem_candidato_2022.zip` ou `bem_candidato_2026.zip` com
`Last-Modified` posterior aos desta conferência.
