# Conferência do patrimônio declarado (NFR-009, SC-005, T045)

Conferido em 02/10/2026.

## Fonte

`bem_candidato_2026.zip` (https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2026.zip),
`Last-Modified` 02/10/2026 15:34:06 GMT; CSV `bem_candidato_2026_MG.csv` gerado pelo TSE em
02/10/2026 12:30:53, 6.625 linhas (uma por bem, todos os cargos de MG).

## Método

Soma refeita fora do app, em Python com `decimal.Decimal` direto sobre o CSV (não pelo
`scripts/lib/somar-bens.mjs`), comparada com `patrimonio_total` e `patrimonio_itens` de
`src/lib/dados/candidatos.json`. Amostra de 5 sorteada com `random.seed(20261002)` entre os 48
`sq_candidato` da base.

| sq_candidato | Candidato | Itens (CSV / base) | Soma no CSV do TSE | Base | Diferença |
|---|---|---|---|---|---|
| 130002537202 | BRUNO FARIAS | 8 / 8 | 1.567.741,45 | 1567741.45 | 0,00 |
| 130002545559 | DIEGO ANDRADE | 6 / 6 | 1.232.684,86 | 1232684.86 | 0,00 |
| 130002535317 | REGINALDO LOPES | 4 / 4 | 861.582,00 | 861582 | 0,00 |
| 130002542714 | ANA PAULA LEÃO | 5 / 5 | 188.960,83 | 188960.83 | 0,00 |
| 130002542015 | LINCOLN PORTELA | 4 / 4 | 607.500,00 | 607500 | 0,00 |

Mesma soma estendida aos 48: 0 divergências de total ou de contagem. Nenhum dos 48 está sem bens
declarados nesta data.

## Pendente: DivulgaCand

O WP08 pede conferência com o total exibido no DivulgaCand. Em 02/10/2026 a API do DivulgaCand
(`/divulga/rest/v1/candidatura/buscar/...`) respondeu 403 (bloqueio do CDN) a `curl` e ao
Chromium automatizado, então a comparação acima é com o arquivo de dados abertos que o
DivulgaCand também publica, não com a página. Conferir os 5 `sq_candidato` acima à mão no
DivulgaCand fecha o SC-005.
