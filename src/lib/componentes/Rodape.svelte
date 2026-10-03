<!--
  Rodapé (FR-010): fontes e data de conferência, como a marca é feita (a Limitação aceita da spec),
  a conta das votações de 2026 (FR-035) e do mandato anterior (FR-074) e o que faz "Indicar". Tudo lido de `base`; a contagem de
  quem não concorre vem com a lista.
  O critério do carimbo de patrimônio (FR-015) acompanha CORTE_CRESCIMENTO e CORTE_AUMENTO de
  $lib/formatar/crescimento: mudou lá, muda o texto aqui. A correção pelo IPCA (FR-064) cita a
  fonte do IBGE que está em `base.fontes`, com a data de consulta.
-->
<script lang="ts">
  import type { Base } from '$lib/tipos';
  import { LINK_6X1 } from '$lib/formatar/selo6x1';

  interface Props {
    base: Base;
    siglasMarcadas: string[];
  }

  let { base, siglasMarcadas }: Props = $props();

  const conferido = $derived(base.data_conferido.split('-').reverse().join('/'));
  const fora = $derived(base.nao_concorrem.length);
  // Fonte do IPCA gravada por npm run base; o nome traz a data de consulta.
  const fonteIpca = $derived(base.fontes.find((f) => f.url.includes('apisidra.ibge.gov.br')));
  const consultaIpca = $derived(fonteIpca?.nome.match(/consultado em (\d{2}\/\d{2}\/\d{4})/)?.[1]);
</script>

<footer class="rodape">
  <section>
    <h2>Fontes</h2>
    <ul>
      {#each base.fontes as f (f.url)}
        <li><a href={f.url} target="_blank" rel="noopener">{f.nome}</a></li>
      {/each}
    </ul>
    <p>Conferido em {conferido}.</p>
  </section>

  <section>
    <h2>Quem aparece</h2>
    <p>
      Estão aqui todos os candidatos a deputado federal por MG registrados no TSE. Quem nunca foi
      eleito para nenhum cargo fica guardado atrás do botão "Mostrar quem nunca teve cargo", e
      aparece também quando você digita o número completo dele na busca. "Já teve cargo" quer dizer
      eleito como titular em alguma eleição publicada pelo TSE desde 2000, em qualquer estado:
      suplente que assumiu sem ter sido eleito titular e quem só ocupou cargo de nomeação, como
      secretário ou ministro, não contam.
    </p>
    <p class="seguinte">A ordem dos candidatos é sorteada a cada vez que a página abre.</p>
  </section>

  <section>
    <h2>Como a marca é feita</h2>
    <p>
      A marca "Extrema direita"
      quer dizer partido classificado como extrema direita, não a pessoa. Partidos marcados:
      {siglasMarcadas.join(', ')}. Quem está em partido de centro ou centro-direita aparece sem a
      marca mesmo que vote com a extrema direita, e todo filiado de partido marcado leva a marca;
      o histórico de votos entra numa próxima versão.
    </p>
    <p class="seguinte">
      O carimbo amarelo "Patrimônio declarado N× maior que em 2018" aparece quando o total que o
      candidato declarou ao TSE em 2026 é pelo menos o dobro do que declarou na candidatura
      anterior mais recente, para qualquer cargo, e pelo menos meio milhão de reais maior; o ano
      no carimbo é o dessa candidatura. Ele descreve a declaração; não diz de onde veio a diferença.
    </p>
    <p class="seguinte">
      A comparação é feita já descontada a inflação (IPCA): o valor antigo é corrigido pelo IPCA de
      agosto do ano da declaração até agosto de 2026, com o número-índice do IBGE
      {#if fonteIpca}(<a href={fonteIpca.url} target="_blank" rel="noopener">SIDRA, tabela 1737</a>{#if consultaIpca}, consultado em {consultaIpca}{/if}){/if}.
    </p>
    <details>
      <summary>{fora} {fora === 1 ? 'deputado' : 'deputados'} de MG não {fora === 1 ? 'concorre' : 'concorrem'} à reeleição</summary>
      <ul>
        {#each base.nao_concorrem as d (d.id_camara)}
          <li>{d.nome}{#if d.motivo}: {d.motivo}{/if}</li>
        {/each}
      </ul>
    </details>
  </section>

  <section>
    <h2>Raio-X de quem tenta a reeleição</h2>
    <p>
      O cartão de cada deputado que tenta a reeleição mostra como ele votou em quatro votações da
      Câmara e quantos alertas tem. Cada votação tem um "?" com a explicação.
    </p>
    <ul>
      <li><b>Votou com o governo:</b> em quantas votações de 2026 o deputado votou igual ao que o governo Lula orientou (Sim ou Não). Não é alerta.</li>
      <li><b>Presença em 2026:</b> em quantas votações de 2026 o deputado apareceu para votar. Abaixo de 75% vira alerta.</li>
      <li><b>PEC da Blindagem:</b> votar Sim é alerta.</li>
      <li><b>Fim da escala 6x1:</b> assinar as Emendas 1 e 2, que enfraqueciam a mudança, ou votar contra é alerta.</li>
      <li><b>PL da Devastação:</b> votar Sim é alerta.</li>
      <li><b>Reforma tributária:</b> votar Não é alerta.</li>
    </ul>
    <p>
      Faltar a uma dessas votações não é alerta: a linha fica tracejada. Patrimônio e mandatos
      aparecem no cartão, mas não contam como alerta. Patrimônio em valores nominais.
    </p>
  </section>

  <section>
    <h2>Fim da escala 6x1</h2>
    <p>
      O selo e a linha do Raio-X mostram o que cada um fez na votação da Câmara que aprovou o fim da
      escala 6x1, em 27/05/2026 (PEC 221/2019).
    </p>
    <ul>
      <li><b>Votou a favor:</b> votou sim na votação final.</li>
      <li>
        <b>Apoiou mudanças para enfraquecer:</b> assinou as emendas que abriam exceção de até 44 horas,
        deixavam acordo valer mais que a lei e adiavam a mudança em 10 anos. O relator rejeitou as
        duas. Assinar emenda é apoiar que ela seja votada, e quem estava presente votou sim no final;
        o selo fala do efeito das emendas, não da intenção de quem assinou.
      </li>
      <li><b>Faltou na votação:</b> não votou na votação final.</li>
      <li><b>Votou contra:</b> votou não na votação final.</li>
      <li><b>Não era deputado na votação:</b> estava afastado do mandato no dia.</li>
    </ul>
    <p><a href={LINK_6X1} target="_blank" rel="noopener">Ver a votação na Câmara</a></p>
  </section>

  <section>
    <h2>Votações na Câmara</h2>
    <p>
      As bolinhas mostram em quantas votações nominais do Plenário da Câmara o candidato votou em
      2026, de 1º de janeiro até {conferido}. Votação nominal é a que registra o voto de cada
      deputado; as simbólicas, sem essa lista, ficam de fora. Só contam as votações do período em
      que ele estava no mandato. "De cada 10, votou em N" é essa conta arredondada; 10 só para quem
      votou em todas.
    </p>
    <p>Abaixo de 5 em 10, as bolinhas e a frase ficam em vermelho.</p>
    <p>
      No cartão de quem tenta a reeleição, a mesma conta aparece em porcentagem ("Presença em
      2026"), e abaixo de 75% ela fica em vermelho e conta como alerta.
    </p>
    <p>
      Conta como "votou" qualquer registro na votação, inclusive abstenção e obstrução. Falta
      justificada, como missão autorizada ou licença curta para tratamento de saúde, conta como
      "não votou", porque a Câmara não a separa por votação; na conferência de 02/10/2026, isso
      pesou de 1 a 2 dias por candidato e não mudou nenhum cartão de cor.
    </p>
    <p>
      Quem já foi deputado federal e não está no mandato tem as bolinhas do último mandato, com o
      período no título (por exemplo, 2019–2022), contadas do mesmo jeito; esse número não se
      compara ao de 2026, que cobre outro período e outra quantidade de votações.
    </p>
  </section>

  <section>
    <h2>Indicar</h2>
    <p>
      O botão abre o compartilhamento do aparelho com nome, número e partido e o link desta página aberta no santinho do candidato;
      onde não há compartilhamento, copia o mesmo texto para você colar numa conversa.
    </p>
  </section>
</footer>

<style>
  .rodape {
    max-width: 1240px;
    margin: 34px auto 0;
    border-top: 2px solid var(--fg);
    padding-top: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
    gap: 22px;
    font-size: 13px;
    color: var(--muted);
  }
  h2 {
    font: 800 16px var(--display);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fg);
    margin: 0 0 6px;
  }
  p {
    margin: 0;
    max-width: 62ch;
  }
  p.seguinte {
    margin-top: 8px;
  }
  section > p + p {
    margin-top: 6px;
  }
  ul {
    margin: 0 0 6px;
    padding-left: 18px;
  }
  li {
    overflow-wrap: anywhere;
  }
  a {
    color: var(--fg);
  }
  details {
    margin-top: 8px;
  }
  summary {
    cursor: pointer;
    color: var(--fg);
    font-weight: 600;
    padding: 4px 0;
  }
  details ul {
    margin-top: 4px;
  }
</style>
