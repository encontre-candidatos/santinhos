// Contratos da base (NFR-005, C-006): os JSON gerados por `npm run base` validam contra os
// esquemas de kitty-specs/.../contracts/ e a conta do relatório fecha.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import type { Base, Candidato, Partido } from '../../src/lib/tipos';

const RAIZ = process.cwd();
const CONTRATOS = join(RAIZ, 'kitty-specs', 'vitrine-reeleicao-mg-2026-01M3T7D9', 'contracts');
const DADOS = join(RAIZ, 'src', 'lib', 'dados');

/**
 * Lê um esquema. Versões antigas de candidatos.schema.json tinham barra simples ("^\d+$"), JSON inválido;
 * aqui só a barra solta (não precedida nem seguida de escape válido) é dobrada, então o
 * arquivo já corrigido também passa sem alteração.
 */
function lerEsquema(nome: string): object {
  const texto = readFileSync(join(CONTRATOS, nome), 'utf8').replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\');
  return JSON.parse(texto);
}
const lerDados = <T>(nome: string): T => JSON.parse(readFileSync(join(DADOS, nome), 'utf8'));

const candidatos = lerDados<Candidato[]>('candidatos.json');
const partidos = lerDados<Partido[]>('partidos.json');
const base = lerDados<Base>('base.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

describe('contratos da base', () => {
  it.each([
    ['candidatos.schema.json', candidatos],
    ['partidos.schema.json', partidos],
    ['base.schema.json', base]
  ] as const)('%s valida', (esquema, dados) => {
    const validar = ajv.compile(lerEsquema(esquema));
    const ok = validar(dados);
    expect(validar.errors ?? [], JSON.stringify(validar.errors, null, 2)).toEqual([]);
    expect(ok).toBe(true);
  });

  it('todo partido de candidato existe em partidos.json', () => {
    const siglas = new Set(partidos.map((p) => p.sigla));
    expect(candidatos.filter((c) => !siglas.has(c.partido)).map((c) => c.partido)).toEqual([]);
  });

  it('siglas de partido únicas', () => {
    expect(new Set(partidos.map((p) => p.sigla)).size).toBe(partidos.length);
  });

  // Desde o WP13 a base traz todos os candidatos; id_camara só existe para quem é deputado.
  const deputados = candidatos.filter((c) => c.reeleicao);

  it('sq_candidato e id_camara únicos', () => {
    expect(new Set(candidatos.map((c) => c.sq_candidato)).size).toBe(candidatos.length);
    expect(new Set(deputados.map((c) => c.id_camara)).size).toBe(deputados.length);
    expect(deputados.every((c) => c.id_camara !== null)).toBe(true);
  });

  it('quem não é deputado tem os campos da Câmara em null (FR-038, data-model)', () => {
    const errados = candidatos
      .filter((c) => !c.reeleicao)
      .filter(
        (c) =>
          c.id_camara !== null || c.url_camara !== null || c.partido_posse !== null || c.condicao !== null ||
          c.voto_6x1 !== null || c.votacoes_2026 !== null || c.mandatos !== 0
      );
    expect(errados.map((c) => c.sq_candidato)).toEqual([]);
  });

  it('cargos anteriores do mais recente ao mais antigo, e todo deputado com algum (FR-036)', () => {
    const fora = candidatos.filter((c) => c.cargos_anteriores.some((k, i, l) => i > 0 && l[i - 1].ano < k.ano));
    expect(fora.map((c) => c.sq_candidato)).toEqual([]);
    expect(deputados.filter((c) => c.cargos_anteriores.length === 0).map((c) => c.nome_urna)).toEqual([]);
  });

  it('100% dos candidatos com os dois links de fonte (NFR-005)', () => {
    // Link da Câmara só para deputado (FR-038); DivulgaCand para todos.
    const semLink = candidatos.filter((c) => (c.reeleicao && !c.url_camara) || !c.url_divulgacand);
    expect(semLink).toEqual([]);
    for (const c of candidatos) {
      expect(c.url_camara).toBe(c.reeleicao ? `https://www.camara.leg.br/deputados/${c.id_camara}` : null);
      expect(c.url_divulgacand).toContain(`/${c.sq_candidato}/2026/MG`);
    }
  });

  it('100% dos candidatos com patrimônio (número ou null) e contagem coerente (FR-014, NFR-009)', () => {
    const errados = candidatos.filter(
      (c) =>
        !Number.isInteger(c.patrimonio_itens) ||
        (c.patrimonio_total === null ? c.patrimonio_itens !== 0 : c.patrimonio_itens < 1 || c.patrimonio_total < 0)
    );
    expect(errados.map((c) => c.sq_candidato)).toEqual([]);
  });

  it('toda foto não nula aponta para arquivo em static/fotos/', () => {
    const faltando = candidatos
      .filter((c) => c.foto !== null)
      .filter((c) => !/^fotos\/(tse\/)?\d+\.jpg$/.test(c.foto!) || !existsSync(join(RAIZ, 'static', c.foto!)));
    expect(faltando.map((c) => c.foto)).toEqual([]);
  });

  it('a conta fecha: deputados de MG = os que tentam a reeleição + não concorrem', () => {
    expect(base.total_deputados_mg).toBe(deputados.length + base.nao_concorrem.length);
    const ids = new Set([...deputados.map((c) => c.id_camara), ...base.nao_concorrem.map((n) => n.id_camara)]);
    expect(ids.size).toBe(base.total_deputados_mg);
  });

  it('PL e PRTB seguem classificados como extrema direita (valor inicial, FR-004)', () => {
    const porSigla = new Map(partidos.map((p) => [p.sigla, p]));
    expect(porSigla.get('PL')?.extrema_direita).toBe(true);
    expect(porSigla.get('PRTB')?.extrema_direita).toBe(true);
  });

  // Versão para o eleitor indeciso (03/10/2026): região em 2022, governo e PEC da Blindagem.
  it('municipios.json: 853 municípios de MG, códigos únicos, e toda região aponta para um deles', () => {
    const municipios = lerDados<{ cd: string; nome: string }[]>('municipios.json');
    expect(municipios).toHaveLength(853);
    const cds = new Set(municipios.map((m) => m.cd));
    expect(cds.size).toBe(853);
    const orfaos = candidatos.flatMap((c) => Object.keys(c.regiao_2022?.top ?? {}).filter((cd) => !cds.has(cd)));
    expect(orfaos).toEqual([]);
  });

  it('fontes com endereço único (o rodapé usa o endereço como chave)', () => {
    expect(new Set(base.fontes.map((f) => f.url)).size).toBe(base.fontes.length);
  });

  it('governo e Blindagem só para deputado; todo deputado disputou em 2022', () => {
    const naoDeputados = candidatos.filter((c) => !c.reeleicao);
    expect(naoDeputados.filter((c) => c.governo_2026 !== null || c.blindagem !== null).map((c) => c.sq_candidato)).toEqual([]);
    expect(deputados.filter((c) => c.blindagem === null).map((c) => c.nome_urna)).toEqual([]);
    expect(deputados.filter((c) => c.regiao_2022 === null).map((c) => c.nome_urna)).toEqual([]);
    expect(candidatos.filter((c) => c.governo_2026 && c.governo_2026.com > c.governo_2026.total)).toEqual([]);
  });

  it('nenhum dado pessoal além do exibido (C-006)', () => {
    const texto = ['candidatos.json', 'base.json', 'partidos.json', 'municipios.json']
      .map((f) => readFileSync(join(DADOS, f), 'utf8'))
      .join('\n');
    // Nos nomes de campo, não nos valores: com os 756 candidatos (WP13) há sobrenome
    // "Nascimento" e nome "Rubens", que não são dado pessoal além do exibido.
    const campos = new Set<string>();
    const juntarCampos = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(juntarCampos);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (campos.add(k), juntarCampos(x));
    };
    [candidatos, base, partidos].forEach(juntarCampos);
    expect([...campos].filter((k) => /cpf|endere[cç]o|bens|nascimento/i.test(k))).toEqual([]);
    // CPF: 11 dígitos isolados (sq_candidato tem 12 e número de urna, 4). O código da
    // eleição no link do DivulgaCand (20322002026) também tem 11 e é retirado antes.
    expect(texto.replaceAll('/20322002026/', '/')).not.toMatch(/(?<!\d)\d{11}(?!\d)/);
  });
});
