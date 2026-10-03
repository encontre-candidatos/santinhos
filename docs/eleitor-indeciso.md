# A vitrine ajuda o eleitor indeciso a decidir? Análise e melhorias

Escrito em 03/10/2026, véspera da eleição (04/10/2026), a pedido da usuária: "se questione se essa
é a ferramenta que vai permitir que o eleitor do interior, com ensino médio, indeciso, decida seu
voto". Olhar de ciência política (comportamento eleitoral) e de UX. A versão que responde "sim"
roda na porta 4310, na branch `indeciso-4310`.

## Veredito sobre a versão de 03/10 (porta 4300)

**Não.** A página é uma vitrine boa para quem **já sabe o que procura** e quer conferir um nome.
O indeciso não sabe o que procura. Ele chega com uma pergunta ("em quem eu voto para deputado
federal?") e a página responde com 48 a 756 cartões, cada um com até seis selos, sem dizer por
onde começar. Os motivos, em ordem de peso:

1. **Não há caminho de decisão.** Voto proporcional é escolher 1 entre centenas. A literatura sobre
   eleitor de baixa informação (Popkin, Lupia; no Brasil, Ames, Nicolau) mostra que ele decide por
   **atalhos**: lado político, o que o deputado fez pela região, uma ou duas questões que o tocam,
   e um "sinal de alerta" que elimina. A vitrine mostra os atalhos espalhados nos cartões, mas não
   ajuda a **combiná-los** numa escolha. Aplicativos de recomendação de voto (Wahl-O-Mat,
   TemMeuVoto, Vote na Web) existem justamente porque a vitrine sozinha não fecha a decisão.
2. **Só há sinais negativos.** Carimbos de patrimônio, de 6x1 "enfraquecer", de falta e de
   extrema direita dizem em quem **não** votar. O indeciso precisa também de motivo **a favor**: votou a
   favor da 6x1, vota muito, patrimônio estável, é da região dele. Sem isso, a página empurra para a
   abstenção ou para o voto de legenda, não para um nome.
3. **Falta a pergunta que ele mais faz: "é daqui?"**. Para o eleitor do interior, o deputado
   "da região" pesa mais que ideologia. Os votos de 2022 por município (TSE) dizem onde cada um
   tem base. A página não usa isso.
4. **O número some na hora de votar.** A urna pede **4 dígitos** de cabeça. Quem decide no celular
   na véspera precisa **guardar o número** (colinha). Na urna é proibido usar celular, então a
   colinha tem de ser de papel ou o print tem de ser decorado antes. A página não oferece nada.
5. **Os selos falam a língua de quem acompanha a Câmara.** "PEC 221/2019", "emendas", "votações
   nominais", "patrimônio declarado 4,2× maior" exigem leitura atenta. O cartão precisa de **uma
   frase de cada selo em português do dia a dia**, ao toque.
6. **O lado político, o atalho mais forte em 2026, só aparece por partido.** A própria spec aceitou
   que a marca por partido erra a pessoa. Quanto cada deputado votou **com a orientação do governo**
   nas votações de 2026 mede a pessoa e é o que o indeciso usa para "votar com o Lula" ou
   "votar contra o Lula".
7. **Celular primeiro e pouca paciência.** O público abre pelo link do WhatsApp, no celular, com
   internet ruim. Cada cartão hoje é alto e denso; 48 cartões são muita rolagem antes de qualquer
   decisão.

## O que a versão 4310 faz (e por quê)

| # | Melhoria | Problema que resolve | Fonte do dado |
|---|---|---|---|
| 1 | **"Me ajude a escolher"**: 4 perguntas de um toque cada (sua cidade; lado político; o que mais importa; o que te faz desistir de alguém) e, no fim, **até 5 nomes** com o motivo de cada um em uma frase | 1, 2, 7 | dados já na base + itens 2 e 3 |
| 2 | **"É da sua região"**: escolhida a cidade, cada cartão diz se o candidato foi dos 5 mais votados ali em 2022 e quantos votos teve | 3 | TSE, votação por município 2022 |
| 3 | **Lado no governo**: "Votou com o governo em X de cada 10 votações de 2026" | 6 | Câmara, orientação do governo nas votações nominais de 2026 |
| 4 | **Selos a favor** com o mesmo peso visual dos de alerta (votou a favor da 6x1, vota muito, patrimônio estável) | 2 | dados já na base |
| 5 | **"O que é isso?"** em cada selo: uma frase simples ao toque | 5 | texto |
| 6 | **Colinha**: botão "Vou votar neste" guarda o número no aparelho e mostra uma tela tipo urna, grande, para **imprimir, fotografar ou anotar**, com o aviso de que celular não entra na cabine | 4 | — |
| 7 | **PEC da Blindagem** como selo ("Votou para dificultar processo contra deputado") | 2, 6 | Câmara, PEC 3/2021, 16/09/2025 |

### Regras de neutralidade (inegociáveis)

- O guia **não escolhe pela pessoa**: ordena pelo que **ela** respondeu e mostra o motivo de cada
  nome. Sem resposta sobre lado político, o lado não pesa.
- Mesma régua para todos; nenhum candidato fica de fora do "ver todos".
- Todo selo tem fonte oficial e data; nada de adjetivo ("ruim", "corrupto", "suspeito").
- Nada do que a pessoa responde sai do aparelho (C-004).

## O que fica de fora, e por quê

- **Quem indica** (prefeito, vereador, igreja): pesa muito, mas não há dado público.
- **Chance de se eleger / voto útil**: pesquisa por candidato a deputado não existe com qualidade;
  inventar seria pior que omitir. O guia lembra, em uma frase, que o voto conta também para o
  partido (quociente eleitoral).
- **Emendas para a cidade**: a usuária adiou em 02/10/2026 (emenda é obrigatória; o valor mede mais
  o governo que o deputado). Mantido fora.
- **Publicação**: a versão 4310 roda só localmente; publicar continua sendo decisão da usuária (T039).

## Decisões tomadas sozinho nesta noite (para a usuária rever)

- PEC da Blindagem entrou como selo, com a regra "votou Sim em algum dos dois turnos".
- Os filtros de marca continuam **desligados** ao abrir; o guia substitui a ideia de "esconder por
  padrão", porque quem esconde é a própria pessoa, sabendo.
- Tudo foi feito fora do fluxo de WPs do spec-kitty, numa branch à parte (`indeciso-4310`), para não
  atropelar os chats que estão com WP13, WP16, WP17 e WP18. Se a usuária aprovar, cada melhoria vira
  WP e entra na spec.

## Decisões de implementação (03/10/2026, branch `indeciso-ui`)

- **Quem o guia considera**: os 48 que tentam a reeleição (têm votos na Câmara). Quem não é
  deputado só entra com cidade escolhida, se ficou entre os 10 mais votados dela em 2022 e se o
  lado for "tanto faz" ou pulado: sem votos na Câmara não há como medir o lado, e usar o partido
  repetiria o erro que a spec já aceitou na marca por partido.
- **Pontos** (`src/lib/guia/index.ts`, testes em `tests/unit/guia.test.ts`): cada resposta dá de 0
  a 10 pontos; lado político e cada uma das até 2 prioridades valem em dobro; a cidade, quando não
  é prioridade, vale simples; "tanto faz" vale zero. Lado: governo de N em 10 (com) ou 10 − N
  (contra). 6x1: 10 se votou a favor. Participação: N em 10. Honestidade: 5 se o patrimônio
  declarado não dobrou desde 2022 + 5 se votou Não na PEC da Blindagem sem votar Sim. Região:
  11 − posição na cidade (1º = 10, 10º = 1).
- **Corte do lado**: "com" exige 6 a 10 em 10; "contra", 0 a 4; 5 em 10 não entra em nenhum. Régua
  espelhada. Em 03/10/2026, "contra" deixa 10 deputados, todos do PL; "com", 35.
- **Exclusão**: qualquer marca escolhida no passo 4 tira o candidato. Sem ninguém, o guia diz isso
  e oferece "Não descartar ninguém".
- **Empate**: sorteio com a mesma função que sorteia a mesa (`embaralhar`).
- **Blindagem no cartão**: carimbo no topo da foto, sem deixar a foto em cinza (36 dos 48 levam a
  marca; o cinza apagaria a mesa).
- **Altura do cartão**: medida a 360 px, sem cidade, o maior aumento foi de 38 px (linha do
  governo e etiqueta "Vota muito" na linha do rótulo).
