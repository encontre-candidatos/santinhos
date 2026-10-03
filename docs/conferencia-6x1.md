# Conferência do selo da 6x1

Conferido em 02/10/2026 (WP10, NFR-014), contra a base gerada por `npm run base` nesta data.
Base: 48 candidatos à reeleição.

## Fontes (Dados Abertos da Câmara)

| O quê | Endpoint |
|---|---|
| Votação final, 2º turno, Plenário, 27/05/2026 (461 a 19) | `GET /votacoes/2233802-438/votos` |
| 1º turno, mesmo dia (472 a 22) | `GET /votacoes/2233802-424/votos` |
| Quem estava em exercício por MG em 27/05/2026 | `GET /deputados?siglaUf=MG&dataInicio=2026-05-27&dataFim=2026-05-27` |
| Emenda 1 (Sérgio Turra, CD268682715700) | `GET /proposicoes/2624861/autores` |
| Emenda 2 (Tião Medeiros, CD266254769000) | `GET /proposicoes/2624863/autores` |
| Pedidos de retirada de assinatura (156 REQ, 155 sobre as Emendas 1 e 2) | `GET /proposicoes/2233802/relacionadas` + `GET /proposicoes/{id}` e `/autores` de cada um |

## Resultado: 28 / 17 / 3

**Votou a favor (28)**: Ana Pimentel, André Janones, Bruno Farias, Célia Xakriabá, Dandara,
Delegada Ione, Delegado Marcelo Freitas, Dimas Fabiano, Dr. Frederico, Duda Salabert,
Emidinho Madeira, Eros Biondini, Fred Costa, Igor Timo, Leonardo Monteiro, Mário Heringer,
Miguel Ângelo, Nely Aquino, Padre João, Paulo Abi-Ackel, Paulo Guedes, Pedro Aihara, Reginaldo
Lopes, Rodrigo de Castro, Rogério Correia, Samuel Viana, Stefano Aguiar, Weliton Prado. Todos
votaram "Sim" nos dois turnos.

**Apoiou mudanças para enfraquecer (17)**: Ana Paula Leão, Diego Andrade\*, Gilberto Abramo,
Greyce Elias, Junio Amaral, Lafayette Andrada, Lincoln Portela, Luiz Fernando, Marcelo Álvaro
Antônio, Maurício do Vôlei, Newton Cardoso Jr\*, Nikolas Ferreira, Pinheirinho (só a Emenda 2),
Rafael Simões, Rosangela Reis, Zé Silva, Zé Vitor. Os demais assinaram as Emendas 1 e 2 e
votaram "Sim" nos dois turnos.
\* Também faltaram na votação final: Diego Andrade votou "Sim" no 1º turno, e Newton Cardoso Jr
não votou em nenhum dos dois.

**Não era deputado na votação (3)**: Euclydes Pettersen (204482), Gilmar Machado (74581), Luis
Tibé (160510). Não estavam em exercício em 27/05/2026.

**Faltou (sem emenda)**: 0. **Votou contra**: 0.

## Retiradas de assinatura que mudam o resultado

| Candidato | Pedido | Emendas retiradas | Efeito |
|---|---|---|---|
| Mário Heringer | REQ 2930/2026 | 1 e 2 | sem assinatura vigente → verde |
| Pedro Aihara | REQ 3017/2026 | 2 (a única que assinou) | sem assinatura vigente → verde |
| Pinheirinho | REQ 3032/2026 | 1 | continua com a Emenda 2 → vermelho |

## Casos que o script trata de propósito

- **REQ 3131/2026** pede a retirada de tramitação da Emenda 1 (89 autores, entre eles Gilberto
  Abramo, Luiz Fernando, Mário Heringer, Pinheirinho e Zé Silva) e estava "Aguardando Despacho".
  Ele não retira assinatura de ninguém e não entra. Não muda o resultado: dos quatro
  candidatos com selo vermelho entre os autores, todos têm assinatura vigente na Emenda 2, que o
  REQ 3131 não cita.
- **REQ 3159/2026** só acrescenta uma assinatura ao REQ 3131 e não é retirada.
- **REQ 2929/2026** (Roberta Roma, BA): o texto diz "Emenda nº 2 … de autoria do Deputado Tião
  Medeiros", mas cita o código da Emenda 1. Vale o número escrito. Não afeta MG.
- **REQ 2872/2026** (Ivoneide Caetano, BA) cita o código CD269527608300, de outra emenda, e é
  ignorado. Não afeta MG.
- Pedido de retirada cuja ementa não diga de qual emenda é derruba o script, para ninguém ganhar
  ou perder o selo por adivinhação.
- O voto "Não" no requerimento de encerramento da discussão (votação 2233802-416; 9 deputados do
  PL de MG, entre eles Delegada Ione e Emidinho Madeira) não entra no selo, por ser votação de
  procedimento (C-010).
