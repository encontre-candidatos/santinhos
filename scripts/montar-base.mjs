// Monta a base oficial: deputados federais de MG em exercício (Câmara) × candidaturas a
// deputado federal por MG em 2026 (TSE). Executado à mão: `npm run base`.
//
//   --cache      reaproveita as respostas da Câmara e as fotos já baixadas
//   --atualizar  baixa de novo os zips do TSE (sem ele, usa os que estão em scripts/.cache/)
//
// Grava src/lib/dados/{candidatos,base,partidos}.json e static/fotos/<id>.jpg, e imprime o
// relatório com as listas que geram cada número. Havendo "duvidosos", não grava nada e sai
// com código 1: a decisão vai para scripts/decisoes-manuais.json.
// Nenhum CPF sai daqui para arquivo versionado (C-006): ele só serve ao cruzamento em memória.
import { existsSync, statSync } from 'node:fs';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARQUIVO_BENS, ARQUIVO_BENS_2022, coletarBens } from './lib/bens.mjs';
import { arquivoCandAno, coletarCargos, conferenciaCargos } from './lib/cargos-anteriores.mjs';
import { API_CAMARA, coletarCamara, ENDPOINT_LISTA } from './lib/camara.mjs';
import { cruzar, fundirPartidos } from './lib/cruzar.mjs';
import { buscar, jsonComCache, mapLimitado } from './lib/http.mjs';
import { instagramDoCandidato } from './lib/instagram.mjs';
import { ARQUIVO_FOTOS_2026, contarTodos, extrairFotosTSE, registroNaoDeputado } from './lib/todos-candidatos.mjs';
import { arquivoBensAno, coletarPatrimonioAnterior, conferenciaIpca, lerIpca, marcado, razaoCorrigida } from './lib/patrimonio-anterior.mjs';
import { patrimonio2022 } from './lib/somar-bens.mjs';
import { ARQUIVO_CAND_2022, ARQUIVOS_TSE, coletarTSE, coletarTSE2022 } from './lib/tse.mjs';
import { urlCamara, urlDivulgaCand } from './lib/urls.mjs';
import { coletar6x1, EMENDAS, PEC_6X1, SEM_REGISTRO_6X1, VOTACAO_1_TURNO, VOTACAO_FINAL } from './lib/votacao-6x1.mjs';
import { coletarVotacoes2026, nDe, ORGAO_PLENARIO, relatorioParticipacao } from './lib/votacoes-2026.mjs';
import { montarRegiao, URL_MUNZONA } from './lib/regiao.mjs';
import { montarGoverno } from './lib/governo.mjs';
import { montarBlindagem, PEC_BLINDAGEM, VOTACOES_BLINDAGEM } from './lib/blindagem.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_CACHE = join(RAIZ, 'scripts', '.cache');
const DIR_DADOS = join(RAIZ, 'src', 'lib', 'dados');
const DIR_FOTOS = join(RAIZ, 'static', 'fotos');
const ARQ_DECISOES = join(RAIZ, 'scripts', 'decisoes-manuais.json');
const ARQ_INSTAGRAM = join(RAIZ, 'scripts', 'instagram-manual.json');
const ARQ_CONF_PARTICIPACAO = join(RAIZ, 'docs', 'conferencia-participacao.md');
const ARQ_CONF_CARGOS = join(RAIZ, 'docs', 'conferencia-cargos.md');
const ARQ_CONF_IPCA = join(RAIZ, 'docs', 'conferencia-ipca.md');
const ARQ_IPCA = join(RAIZ, 'scripts', 'ipca-agosto.json');

const args = new Set(process.argv.slice(2));
const usarCache = args.has('--cache');
const atualizarTSE = args.has('--atualizar');

const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const pt = (/** @type {string} */ a, /** @type {string} */ b) => a.localeCompare(b, 'pt-BR');

/** @param {string} caminho */
async function lerJson(caminho) {
  try {
    return JSON.parse(await readFile(caminho, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Baixa a foto; devolve o caminho relativo a static/ ou null em falha.
 * Conferido em 02/10/2026: para parte dos deputados o `urlFoto` da API (bandep/<id>.jpg) vem com
 * 114×152 px; o mesmo endereço com "maior.jpg" no fim (bandep/<id>.jpgmaior.jpg) traz 354×472.
 * Tenta a maior primeiro e cai na da API se ela faltar.
 */
async function baixarFoto(/** @type {number} */ id, /** @type {string | null} */ url) {
  if (!url) return null;
  const destino = join(DIR_FOTOS, `${id}.jpg`);
  if (usarCache && existsSync(destino)) return `fotos/${id}.jpg`;
  for (const u of [`${url}maior.jpg`, url]) {
    try {
      const r = await buscar(u);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 500) continue; // resposta sem imagem
      await writeFile(destino, buf);
      return `fotos/${id}.jpg`;
    } catch (e) {
      console.warn(`  ! foto de ${id} não baixada de ${u}: ${/** @type {Error} */ (e).message}`);
    }
  }
  return null;
}

async function main() {
  const decisoes = (await lerJson(ARQ_DECISOES)) ?? [];
  const deputados = await coletarCamara({ cache: usarCache, dirCache: DIR_CACHE });
  const tse = await coletarTSE({ dirCache: DIR_CACHE, atualizar: atualizarTSE });
  const { casados, semCandidatura, duvidosos } = cruzar(deputados, tse.candidaturas, decisoes);

  // Motivo de quem não concorre: candidatura a outro cargo no arquivo nacional do TSE.
  const naoConcorrem = semCandidatura
    .map(({ deputado, motivo }) => {
      if (motivo === 'não encontrado' && deputado.cpf) {
        const outras = tse.outrasCandidaturas.filter((o) => o.cpf === deputado.cpf);
        if (outras.length) motivo = 'candidatura a ' + outras.map((o) => `${o.cargo}${/SUPLENTE/.test(o.cargo) ? " DE SENADOR" : ""} (${o.uf})`).join(', ');
        else motivo = 'sem registro de candidatura em 2026 no TSE';
      }
      return { id_camara: deputado.id, nome: deputado.nomeUrnaCamara, motivo };
    })
    .sort((a, b) => pt(a.nome, b.nome));

  // ---- Relatório (sempre) ----
  const porNome = [...deputados].sort((a, b) => pt(a.nomeUrnaCamara, b.nomeUrnaCamara));
  console.log(`\nDeputados de MG em exercício (Câmara): ${deputados.length}`);
  porNome.forEach((d, i) => console.log(`  ${i + 1}. ${d.nomeUrnaCamara} (${d.id})`));
  const casadosOrd = [...casados].sort((a, b) => pt(a.candidatura.nomeUrna, b.candidatura.nomeUrna));
  console.log(`Casados com candidatura 2026: ${casados.length}`);
  for (const { candidatura: c, deputado: d, via } of casadosOrd)
    console.log(`  - ${c.nomeUrna} | ${c.partido} | ${c.numero} | ${c.situacao}  (${d.id}, via ${via})`);
  console.log(`Sem candidatura 2026: ${naoConcorrem.length}`);
  for (const n of naoConcorrem) console.log(`  - ${n.nome} (${n.id_camara}) — ${n.motivo}`);
  console.log(`Duvidosos (decidir à mão): ${duvidosos.length}`);
  for (const { deputado: d, opcoes } of duvidosos)
    console.log(
      `  - ${d.nomeUrnaCamara} (${d.id}; nasc. ${d.dataNascimento}) ⇄ ` +
        opcoes.map((o) => `${o.nomeUrna} [SQ ${o.sq}; ${o.partido} ${o.numero}; nasc. ${o.dataNascimento}; ${o.situacao}]`).join(' | ')
    );
  console.log(`Conta: ${casados.length} + ${naoConcorrem.length} + ${duvidosos.length} = ${deputados.length}`);

  if (duvidosos.length > 0) {
    console.error(
      `\nHá ${duvidosos.length} caso(s) duvidoso(s). Nada foi gravado. Registre a decisão em ` +
        `scripts/decisoes-manuais.json ([{ id_camara, sq_candidato | null, motivo, decidido_em }]) e rode de novo.`
    );
    process.exitCode = 1;
    return;
  }
  if (casados.length + naoConcorrem.length !== deputados.length) throw new Error('a conta não fecha');

  // ---- Gravação ----
  await mkdir(DIR_DADOS, { recursive: true });
  await mkdir(DIR_FOTOS, { recursive: true });

  /** @type {Map<number, string>} */
  const instagramManual = new Map(((await lerJson(ARQ_INSTAGRAM)) ?? []).map((/** @type {any} */ m) => [m.id_camara, m.instagram]));
  // Todos os candidatos de 2026 (WP13): bens e cargos anteriores de cada um, não só dos deputados.
  const bens = await coletarBens({ dirCache: DIR_CACHE, atualizar: atualizarTSE, sqs: tse.candidaturas.map((c) => c.sq) });
  const cargos = await coletarCargos({ dirCache: DIR_CACHE, atualizar: atualizarTSE, candidaturas: tse.candidaturas });
  // Declaração mais recente antes de 2026, qualquer cargo, corrigida pelo IPCA (FR-062, FR-063; WP16).
  const ipca = await lerIpca(ARQ_IPCA);
  const anterior = await coletarPatrimonioAnterior({ dirCache: DIR_CACHE, atualizar: atualizarTSE, anteriores: cargos.anteriores, indices: ipca.indices });
  // 2022 (FR-015): a mesma pessoa ligada pelo CPF, em memória; só o total sai daqui.
  const tse2022 = await coletarTSE2022({ dirCache: DIR_CACHE, atualizar: atualizarTSE });
  const bens2022 = await coletarBens({ dirCache: DIR_CACHE, atualizar: atualizarTSE, sqs: [...tse2022.sqPorCpf.values()], arquivo: ARQUIVO_BENS_2022 });
  const fotos = await mapLimitado(casadosOrd, 4, ({ deputado: d }) => baixarFoto(d.id, d.urlFoto));
  const seisPorUm = await coletar6x1({ cache: usarCache, dirCache: DIR_CACHE });
  const participacao = await coletarVotacoes2026(redeVotacoes(), { api: API_CAMARA, fim: hoje, ids: casadosOrd.map(({ deputado: d }) => d.id) });
  const candidatos = casadosOrd.map(({ deputado: d, candidatura: c }, i) => ({
    id_camara: d.id,
    sq_candidato: c.sq,
    nome_urna: c.nomeUrna,
    nome_civil: d.nomeCivil,
    numero_urna: c.numero,
    partido: c.partido,
    partido_posse: d.partido_posse,
    condicao: d.condicao,
    mandatos: d.mandatos,
    situacao_candidatura: c.situacao,
    foto: fotos[i],
    instagram: instagramDoCandidato({
      redeSocialCamara: d.redeSocial,
      redesTSE: tse.redesPorSq.get(c.sq) ?? [],
      manual: instagramManual.get(d.id) ?? null,
      nomeUrna: c.nomeUrna
    }),
    url_camara: urlCamara(d.id),
    url_divulgacand: urlDivulgaCand(c.sq),
    // Só total e contagem (C-008); null = nenhum bem declarado (FR-014).
    patrimonio_total: bens.porSq.get(c.sq)?.total ?? null,
    patrimonio_itens: bens.porSq.get(c.sq)?.itens ?? 0,
    // null = não concorreu a deputado federal por MG em 2022; 0 = concorreu sem bens (FR-015).
    patrimonio_2022: patrimonio2022(c.cpf, tse2022.sqPorCpf, bens2022.porSq),
    // null = nenhuma candidatura de 2006 a 2024 ligada a ele; valor 0 = candidatura sem bens (FR-062).
    patrimonio_anterior: anterior.porSq.get(c.sq) ?? null,
    voto_6x1: seisPorUm.porId.get(d.id) ?? SEM_REGISTRO_6X1,
    // null = nenhuma votação nominal de 2026 com ele no mandato (FR-034).
    votacoes_2026: participacao.porId.get(d.id) ?? null,
    reeleicao: true,
    cargos_anteriores: cargos.porSq.get(c.sq) ?? []
  }));

  // Quem não é deputado em exercício (FR-038): campos da Câmara em null; oculto quando nunca foi eleito (FR-036).
  const sqsDeputados = new Set(candidatos.map((c) => c.sq_candidato));
  const outros = tse.candidaturas.filter((c) => !sqsDeputados.has(c.sq)).sort((a, b) => pt(a.nomeUrna, b.nomeUrna));
  const fotosTSE = await extrairFotosTSE({ dirCache: DIR_CACHE, atualizar: atualizarTSE, dirFotos: DIR_FOTOS, sqs: outros.map((c) => c.sq) });
  const naoDeputados = outros.map((c) =>
    registroNaoDeputado(c, {
      foto: fotosTSE.fotos.get(c.sq) ?? null,
      instagram: instagramDoCandidato({ redeSocialCamara: [], redesTSE: tse.redesPorSq.get(c.sq) ?? [], manual: null, nomeUrna: c.nomeUrna }),
      url_divulgacand: urlDivulgaCand(c.sq),
      patrimonio_total: bens.porSq.get(c.sq)?.total ?? null,
      patrimonio_itens: bens.porSq.get(c.sq)?.itens ?? 0,
      patrimonio_2022: patrimonio2022(c.cpf, tse2022.sqPorCpf, bens2022.porSq),
      patrimonio_anterior: anterior.porSq.get(c.sq) ?? null,
      cargos_anteriores: cargos.porSq.get(c.sq) ?? []
    })
  );
  // Versão para o eleitor indeciso (03/10/2026): região em 2022, lado no governo em 2026 e PEC da
  // Blindagem. Só deputados têm os dois últimos; região vale para todos que disputaram em 2022.
  const regiao = await montarRegiao({
    alternativos: { 2022: [join(DIR_CACHE, 'consulta_cand_2022.zip')], 2026: [join(DIR_CACHE, 'consulta_cand_2026.zip')] }
  });
  const idsDeputados = candidatos.map((c) => c.id_camara);
  const governo = await montarGoverno(idsDeputados, hoje);
  const blindagem = await montarBlindagem(idsDeputados);
  for (const c of candidatos) {
    Object.assign(c, {
      regiao_2022: regiao.por_sq2026[c.sq_candidato] ?? null,
      governo_2026: governo.porId[c.id_camara] ?? null,
      blindagem: blindagem.porId.get(c.id_camara) ?? null
    });
  }
  for (const c of naoDeputados) {
    Object.assign(c, { regiao_2022: regiao.por_sq2026[c.sq_candidato] ?? null, governo_2026: null, blindagem: null });
  }
  const todos = [...candidatos, ...naoDeputados].sort((a, b) => pt(a.nome_urna, b.nome_urna) || pt(a.sq_candidato, b.sq_candidato));

  // Fotos de quem saiu da lista.
  const manter = new Set(candidatos.map((c) => `${c.id_camara}.jpg`));
  for (const f of await readdir(DIR_FOTOS)) if (f.endsWith('.jpg') && !manter.has(f)) await unlink(join(DIR_FOTOS, f));

  const base = {
    data_conferido: hoje,
    fontes: [
      {
        nome: 'Câmara dos Deputados — Dados Abertos (deputados de MG na 57ª legislatura, detalhe e histórico)',
        url: `${API_CAMARA}/deputados?siglaUf=MG&idLegislatura=57`,
        arquivo_ou_endpoint: `GET ${ENDPOINT_LISTA}; GET /deputados/{id}; GET /deputados/{id}/historico`
      },
      {
        nome: 'TSE — Dados Abertos, Candidatos 2026',
        url: ARQUIVOS_TSE.cand.url,
        arquivo_ou_endpoint: `${tse.fonte.zip} (modificado na fonte em ${tse.fonte.modificado})`
      },
      {
        nome: 'TSE — Dados Abertos, Candidatos 2026, informações complementares (situação da candidatura)',
        url: ARQUIVOS_TSE.compl.url,
        arquivo_ou_endpoint: `${tse.fonte.zipComplementar} (modificado na fonte em ${tse.fonte.modificadoComplementar})`
      },
      {
        nome: 'TSE — Dados Abertos, Candidatos 2026, redes sociais (Instagram de quem não o informa à Câmara)',
        url: ARQUIVOS_TSE.redes.url,
        arquivo_ou_endpoint: `${tse.fonte.zipRedes} (modificado na fonte em ${tse.fonte.modificadoRedes}); exceções em scripts/instagram-manual.json`
      },
      {
        nome: 'TSE — Dados Abertos, Candidatos 2026, declaração patrimonial (só o total por candidato entra na base)',
        url: ARQUIVO_BENS.url,
        arquivo_ou_endpoint: `${bens.fonte.zip} (modificado na fonte em ${bens.fonte.modificado})`
      },
      {
        nome: 'TSE — Dados Abertos, Candidatos 2022 (deputado federal por MG; ligação com 2026 feita em memória)',
        url: ARQUIVO_CAND_2022.url,
        arquivo_ou_endpoint: `${tse2022.fonte.zip} (modificado na fonte em ${tse2022.fonte.modificado})`
      },
      {
        nome: 'TSE — Dados Abertos, Candidatos 2022, declaração patrimonial (só o total por candidato entra na base)',
        url: ARQUIVO_BENS_2022.url,
        arquivo_ou_endpoint: `${bens2022.fonte.zip} (modificado na fonte em ${bens2022.fonte.modificado})`
      },
      {
        nome: 'Câmara dos Deputados — Dados Abertos, PEC 221/2019 (fim da escala 6x1): votação no Plenário em 27/05/2026 e Emendas 1 e 2',
        url: `${API_CAMARA}/proposicoes/${PEC_6X1}`,
        arquivo_ou_endpoint: `GET /votacoes/${VOTACAO_FINAL}/votos; GET /votacoes/${VOTACAO_1_TURNO}/votos; ` +
          `GET /proposicoes/{${EMENDAS[1].id},${EMENDAS[2].id}}/autores; pedidos de retirada em GET /proposicoes/${PEC_6X1}/relacionadas`
      },
      {
        nome: `Câmara dos Deputados — Dados Abertos, votações nominais do Plenário em 2026 (${participacao.nominais.length} de ${participacao.totalPlenario} votações, até ${hoje.split('-').reverse().join('/')})`,
        url: `${API_CAMARA}/votacoes?idOrgao=${ORGAO_PLENARIO}&dataInicio=2026-01-01`,
        arquivo_ou_endpoint: `GET /votacoes?idOrgao=${ORGAO_PLENARIO} mês a mês; GET /votacoes/{id}/votos; ` +
          'GET /deputados?siglaUf=MG&dataInicio={data}&dataFim={data} (em exercício em cada data); conferência em docs/conferencia-participacao.md'
      },
      {
        nome: `TSE — Dados Abertos, Candidatos ${cargos.fontes.at(-1)?.ano} a ${cargos.fontes[0]?.ano} (quem já foi eleito; ligação com 2026 feita em memória)`,
        url: arquivoCandAno(cargos.fontes[0]?.ano ?? 2024).url,
        arquivo_ou_endpoint: cargos.fontes.map((f) => f.zip).join(', ') + '; conferência em docs/conferencia-cargos.md'
      },
      {
        nome: `TSE — Dados Abertos, declaração patrimonial de ${anterior.fontes.at(-1)?.ano} a ${anterior.fontes[0]?.ano} (declaração mais recente de cada candidato antes de 2026; só o total entra na base)`,
        url: arquivoBensAno(anterior.fontes[0]?.ano ?? 2024).url,
        arquivo_ou_endpoint: anterior.fontes.map((f) => `${f.zip} (modificado na fonte em ${f.modificado})`).join(', ') + '; conferência em docs/conferencia-ipca.md'
      },
      {
        nome: `${ipca.fonte}, consultado em ${ipca.consultado_em.split('-').reverse().join('/')} (correção do patrimônio declarado antes de 2026)`,
        url: ipca.url,
        arquivo_ou_endpoint: 'scripts/ipca-agosto.json; fator = índice de agosto de 2026 ÷ índice de agosto do ano da declaração'
      },
      {
        nome: 'TSE — Dados Abertos, fotos dos candidatos de 2026 em MG (de quem não é deputado em exercício)',
        url: ARQUIVO_FOTOS_2026.url,
        arquivo_ou_endpoint: `${fotosTSE.fonte.zip} (modificado na fonte em ${fotosTSE.fonte.modificado})`
      },
      {
        nome: 'TSE — Dados Abertos, votação por município e zona em 2022 (deputado federal por MG; ligação com 2026 feita em memória)',
        url: URL_MUNZONA,
        arquivo_ou_endpoint: 'votacao_candidato_munzona_2022_MG.csv, campo QT_VOTOS_NOMINAIS_VALIDOS, zonas somadas por município'
      },
      {
        nome: `Câmara dos Deputados — Dados Abertos, orientação do Governo nas votações nominais do Plenário em 2026 (${governo.comOrientacao} de ${governo.nominais} com orientação Sim ou Não)`,
        url: `${API_CAMARA}/votacoes?idOrgao=${ORGAO_PLENARIO}&dataInicio=2026-01-01&dataFim=${hoje}`,
        arquivo_ou_endpoint: 'GET /votacoes mês a mês; GET /votacoes/{id}/votos; GET /votacoes/{id}/orientacoes (siglaPartidoBloco = Governo)'
      },
      {
        nome: 'Câmara dos Deputados — Dados Abertos, PEC 3/2021 (PEC da Blindagem), Plenário, 16/09/2025',
        url: `${API_CAMARA}/proposicoes/${PEC_BLINDAGEM}`,
        arquivo_ou_endpoint: `GET /votacoes/${VOTACOES_BLINDAGEM.t1}/votos; GET /votacoes/${VOTACOES_BLINDAGEM.t2}/votos; GET /deputados/{id}/historico`
      }
    ],
    total_deputados_mg: deputados.length,
    nao_concorrem: naoConcorrem
  };

  const arqPartidos = join(DIR_DADOS, 'partidos.json');
  const partidos = fundirPartidos(
    await lerJson(arqPartidos),
    [...new Set(todos.map((c) => c.partido))],
    tse.nomesPartidos,
    hoje
  );

  const gravar = (/** @type {string} */ nome, /** @type {unknown} */ dados) =>
    writeFile(join(DIR_DADOS, nome), JSON.stringify(dados, null, 2) + '\n');
  await gravar('candidatos.json', todos);
  await gravar('base.json', base);
  await gravar('partidos.json', partidos);
  await writeFile(join(DIR_DADOS, 'municipios.json'), JSON.stringify(regiao.municipios) + '\n');
  await mkdir(dirname(ARQ_CONF_PARTICIPACAO), { recursive: true });
  await writeFile(ARQ_CONF_PARTICIPACAO, relatorioParticipacao(participacao, candidatos, hoje));
  // A seção conferida à mão (abaixo do marcador) é preservada entre execuções.
  const confAnterior = existsSync(ARQ_CONF_CARGOS) ? await readFile(ARQ_CONF_CARGOS, 'utf8') : '';
  await writeFile(ARQ_CONF_CARGOS, conferenciaCargos(todos, cargos, confAnterior, hoje));
  const confIpcaAnterior = existsSync(ARQ_CONF_IPCA) ? await readFile(ARQ_CONF_IPCA, 'utf8') : '';
  await writeFile(ARQ_CONF_IPCA, conferenciaIpca(todos, { anteriores: cargos.anteriores, ipca }, confIpcaAnterior, hoje));

  const grandes = candidatos.filter((c) => c.foto && statSync(join(RAIZ, 'static', c.foto)).size > 60 * 1024);
  const conta = contarTodos(todos);
  console.log(`\nGravado: ${todos.length} candidatos (${conta.reeleicao} tentam a reeleição, ${conta.jaTeveCargo} já tiveram cargo, ` +
    `${conta.ocultos} nunca tiveram e ficam ocultos; ${conta.visiveis} visíveis), ${partidos.length} partidos, base de ${hoje}.`);
  const vias = cargos.cobertura.reduce((s, c) => ({ cpf: s.cpf + c.porCpf, nome: s.nome + c.porNome, amb: s.amb + c.ambiguos }), { cpf: 0, nome: 0, amb: 0 });
  console.log(`Cargos anteriores (TSE ${cargos.fontes.at(-1)?.ano}–${cargos.fontes[0]?.ano}): ${vias.cpf} ligações por CPF, ` +
    `${vias.nome} por nome + nascimento, ${vias.amb} sem ligação por homônimo; por ano em docs/conferencia-cargos.md.`);
  const semFotoTSE = naoDeputados.filter((c) => !c.foto);
  console.log(`Fotos do TSE (não deputados): ${naoDeputados.length - semFotoTSE.length} de ${naoDeputados.length}` +
    (semFotoTSE.length ? `; sem foto: ${semFotoTSE.map((c) => `${c.sq_candidato} ${c.nome_urna}`).join(', ')}` : '') + '.');
  console.log(`Fotos: ${candidatos.filter((c) => c.foto).length} baixadas, ${candidatos.filter((c) => !c.foto).length} sem foto` +
    (grandes.length ? `, ${grandes.length} acima de 60 KB (mantidas): ${grandes.map((c) => c.id_camara).join(', ')}` : '') + '.');
  const semBens = candidatos.filter((c) => c.patrimonio_total === null);
  console.log(`Patrimônio: ${candidatos.length - semBens.length} com declaração, ${semBens.length} sem` +
    (semBens.length ? `: ${semBens.map((c) => `${c.id_camara} ${c.nome_urna}`).join(', ')}` : '') + '.');
  // Mesma regra de src/lib/formatar/crescimento.ts (FR-015, FR-063): ≥ 2× e ≥ meio milhão a mais, sobre o corrigido.
  const ref = (/** @type {typeof todos[number]} */ c) => razaoCorrigida(c)?.razao ?? 0;
  const lista = (/** @type {typeof todos} */ l) => l.sort((a, b) => ref(b) - ref(a)).map((c) => `${c.nome_urna} ${ref(c).toFixed(2)}× (${c.patrimonio_anterior?.ano})`).join(', ');
  const semAnterior = todos.filter((c) => c.patrimonio_anterior === null);
  console.log(`Patrimônio anterior (2006–2024): ${todos.length - semAnterior.length} com candidatura anterior, ${semAnterior.length} sem; ` +
    `entre os ${candidatos.length} da reeleição, sem: ${candidatos.filter((c) => c.patrimonio_anterior === null).map((c) => c.nome_urna).join(', ') || 'ninguém'}.`);
  const marcadosReeleicao = candidatos.filter(marcado);
  const marcadosOutros = naoDeputados.filter(marcado);
  console.log(`Carimbo (2026 ≥ 2× o anterior corrigido pelo IPCA e ≥ meio milhão a mais): ${marcadosReeleicao.length + marcadosOutros.length}; ` +
    `reeleição ${marcadosReeleicao.length}: ${lista(marcadosReeleicao)}; demais ${marcadosOutros.length}; lista em docs/conferencia-ipca.md.`);
  const conta6x1 = new Map();
  for (const c of candidatos) {
    const v = c.voto_6x1;
    const s = v.final === null ? 'não era deputado' : v.final === 'nao' ? 'contra' : v.emendas.length ? (v.final === 'ausente' ? 'enfraquecer + faltou' : 'enfraquecer') : v.final === 'ausente' ? 'faltou' : 'a favor';
    conta6x1.set(s, [...(conta6x1.get(s) ?? []), c.nome_urna]);
  }
  console.log('6x1 (PEC 221/2019): ' + [...conta6x1].map(([s, n]) => `${s} ${n.length}`).join(', ') + '.');
  for (const [s, n] of conta6x1) if (s !== 'a favor') console.log(`  ${s}: ${n.join(', ')}`);
  console.log(`  retiradas de assinatura consideradas: ${seisPorUm.retiradas.length}`);
  const vermelhos = candidatos.filter((c) => c.votacoes_2026 && nDe(c.votacoes_2026) <= 4);
  console.log(`Votações de 2026: ${participacao.totalPlenario} no Plenário, ${participacao.nominais.length} nominais ` +
    `(${participacao.simbolicas404} com 404), em ${participacao.datas.length} dias; ` +
    `sem mandato em nenhuma: ${candidatos.filter((c) => !c.votacoes_2026).map((c) => c.nome_urna).join(', ') || 'ninguém'}; ` +
    `abaixo de 5 em 10: ${vermelhos.map((c) => `${c.nome_urna} ${c.votacoes_2026?.votou}/${c.votacoes_2026?.total}`).join(', ') || 'ninguém'}.`);
  if (participacao.foraDoExercicio.length)
    console.log(`  votos fora do período em exercício (fora da conta): ${participacao.foraDoExercicio.length}`);
  const comRegiao = todos.filter((c) => c.regiao_2022);
  console.log(`Região 2022: ${regiao.municipios.length} municípios; ${comRegiao.length} candidatos de 2026 disputaram em 2022 ` +
    `(${candidatos.filter((c) => c.regiao_2022).length} de ${candidatos.length} da reeleição).`);
  console.log(`Governo 2026: ${governo.nominais} nominais, ${governo.comOrientacao} com orientação; sem dado: ` +
    (candidatos.filter((c) => !c.governo_2026).map((c) => c.nome_urna).join(', ') || 'ninguém') + '.');
  const simBlindagem = candidatos.filter((c) => c.blindagem && (c.blindagem.t1 === 'sim' || c.blindagem.t2 === 'sim'));
  console.log(`PEC da Blindagem (dias ${blindagem.dias.join(', ')}): Sim em algum turno ${simBlindagem.length}: ${simBlindagem.map((c) => c.nome_urna).join(', ')}.`);
  const semInstagram = candidatos.filter((c) => !c.instagram);
  console.log(`Instagram: ${candidatos.length - semInstagram.length} com perfil, ${semInstagram.length} sem` +
    (semInstagram.length ? `: ${semInstagram.map((c) => `${c.id_camara} ${c.nome_urna}`).join(', ')}` : '') + '.');
}

/** Rede da coleta de votações: cache em scripts/.cache/camara-votacoes-2026/; 404 vira null (e fica no cache). */
function redeVotacoes() {
  const dir = join(DIR_CACHE, 'camara-votacoes-2026');
  return {
    mapLimitado,
    async json(/** @type {string} */ url, /** @type {string} */ arquivo) {
      const caminho = join(dir, arquivo);
      try {
        const j = await jsonComCache(url, caminho, usarCache);
        return j?.http404 ? null : j;
      } catch (e) {
        if (!/HTTP 404/.test(/** @type {Error} */ (e).message)) throw e;
        await mkdir(dir, { recursive: true });
        await writeFile(caminho, JSON.stringify({ http404: true }));
        return null;
      }
    }
  };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
