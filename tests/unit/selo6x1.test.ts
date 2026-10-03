// Selo da 6x1 (T051) e leitura dos pedidos de retirada de assinatura (T050).
import { describe, expect, it } from 'vitest';
import { frase6x1, selo6x1, TEXTO_6X1, textoEmendas, textoVoto } from '../../src/lib/formatar/selo6x1';
import type { Voto6x1 } from '../../src/lib/tipos';
import { ehRetirada, emendasDaRetirada, tipoDeVoto } from '../../scripts/lib/emendas-6x1.mjs';

const v = (final: Voto6x1['final'], emendas: Voto6x1['emendas'] = [], primeiro: Voto6x1['primeiro_turno'] = final): Voto6x1 => ({
  final,
  primeiro_turno: primeiro,
  emendas
});

describe('selo6x1: uma situação por candidato, nesta prioridade (FR-016)', () => {
  it.each([
    ['votou sim, sem emenda → a favor', v('sim'), 'favor', false],
    ['votou sim e assinou → enfraquecer', v('sim', [1, 2]), 'enfraquecer', false],
    ['só a Emenda 2 → enfraquecer', v('sim', [2]), 'enfraquecer', false],
    ['assinou e faltou → enfraquecer + linha', v('ausente', [1, 2]), 'enfraquecer', true],
    ['assinou, sim no 1º e faltou no 2º → enfraquecer + linha', v('ausente', [1, 2], 'sim'), 'enfraquecer', true],
    ['só faltou → faltou', v('ausente'), 'faltou', false],
    ['não → contra', v('nao'), 'contra', false],
    ['não e assinou → contra vence', v('nao', [1]), 'contra', false],
    ['sim no 2º e faltou no 1º → a favor (vale a final)', v('sim', [], 'ausente'), 'favor', false],
    ['não era deputado → sem selo', v(null), 'sem_mandato', false],
    ['não era deputado e assinou → sem selo', v(null, [1, 2]), 'sem_mandato', false]
  ])('%s', (_, voto, situacao, faltou) => {
    expect(selo6x1(voto)).toEqual({ situacao, faltou });
  });
});

describe('textos do selo', () => {
  it('no máximo 5 palavras em destaque, sem sigla nem número de proposição (NFR-011)', () => {
    for (const { texto } of Object.values(TEXTO_6X1)) {
      expect(texto.split(/\s+/).length).toBeLessThanOrEqual(5);
      expect(texto).not.toMatch(/PEC|\d/);
    }
  });

  it('frase do leitor de tela diz a situação e a data (FR-022)', () => {
    expect(frase6x1({ situacao: 'favor', faltou: false })).toBe(
      'Fim da escala 6x1: votou a favor na votação final da Câmara, em 27 de maio de 2026.'
    );
    expect(frase6x1({ situacao: 'enfraquecer', faltou: true })).toBe(
      'Fim da escala 6x1: apoiou mudanças para enfraquecer a proposta, e faltou na votação final da Câmara, em 27 de maio de 2026.'
    );
  });
});

describe('tipoDeVoto', () => {
  it.each([
    ['Sim', 'sim'],
    ['Não', 'nao'],
    ['Abstenção', 'ausente'],
    ['Obstrução', 'ausente'],
    [undefined, 'ausente']
  ])('%s → %s', (tipo, esperado) => expect(tipoDeVoto(tipo)).toBe(esperado));
});

describe('pedidos de retirada de assinatura', () => {
  it.each([
    ['Requer a retirada de assinatura da emenda 1/2026 à PEC 221/2019.', [1]],
    ['Requerimento de retirada de assinatura em apoio à EMENDA N.° 02 à PEC 221 de 2019.', [2]],
    ['Requer a retirada de assinatura das emendas nº 1 e 2 apresentadas à PEC 211, de 2019.', [1, 2]],
    ['Requerimento de retirada de assinatura em apoio à EMENDA nº 01 e EMENDA nº 02 à PEC 221 de 2019.', [1, 2]],
    ['Solicita a retirada de assinatura a emenda EMC n.º1 da PEC 221/2019.', [1]],
    ['Requer a exclusão de assinatura em apoio à Emenda n. 2, de 2026 (EMC n. 2) à Proposta de Emenda à Constituição 221, de 2019', [2]],
    ['Requerimento para Retirada de Assinatura de RPD/DTQ - EMC 2 PEC22119 => PEC 221/2019', [2]],
    ['requeiro a exclusão de minha assinatura em apoio à emenda de autoria do Dep. Sergio Turra (código CD 268682715700)', [1]],
    // REQ 2929/2026: o texto diz Emenda 2 e cita o código da Emenda 1; vale o número escrito.
    ['a retirada de minha assinatura da Emenda nº 2 da Proposta de Emenda à Constituição nº 221 de 2019 que, registrado com o código nº CD268682715700', [2]],
    // Outra emenda: nenhuma das duas.
    ['Requerimento de retirada de assinatura em apoio à EMENDA à PEC 221 de 2019, CD269527608300.', []]
  ])('%s → %j', (ementa, esperado) => expect(emendasDaRetirada(ementa)).toEqual(esperado));

  it('inclusão de assinatura em outro requerimento não é retirada', () => {
    expect(ehRetirada('Requer inclusão de assinatura no Requerimento de Retirada de Proposição de Iniciativa Coletiva REQ nº 3131/2026.')).toBe(false);
    expect(ehRetirada('Requer a retirada de assinatura da Emenda nº 1 apresentada à PEC 221/2019')).toBe(true);
  });
});

describe('balão do selo: votos e emendas como o eleitor lê', () => {
  it.each([
    ['sim', 'Sim'],
    ['nao', 'Não'],
    ['ausente', 'Faltou'],
    [null, 'Fora do mandato']
  ] as const)('voto %s → %s', (voto, texto) => {
    expect(textoVoto(voto)).toBe(texto);
  });
  it.each([
    [[], 'Não assinou'],
    [[1, 2], 'Assinou as duas'],
    [[1], 'Assinou a Emenda 1'],
    [[2], 'Assinou a Emenda 2']
  ] as [Voto6x1['emendas'], string][])('emendas %j → %s', (emendas, texto) => {
    expect(textoEmendas(emendas)).toBe(texto);
  });
});
