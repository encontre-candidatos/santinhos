export type Condicao = 'titular' | 'suplente_em_exercicio';

export interface Candidato {
  id_camara: number | null;     // null = não é deputado em exercício (FR-038)
  sq_candidato: string;
  nome_urna: string;
  nome_civil: string;
  numero_urna: string;          // sempre 4 dígitos
  partido: string;              // sigla do registro 2026
  partido_posse: string | null; // sigla na posse da 57ª legislatura; null = não é deputado
  condicao: Condicao | null;    // null = não é deputado
  mandatos: number;             // legislaturas distintas exercidas; 0 = não é deputado
  situacao_candidatura: string; // texto do TSE, como veio
  foto: string | null;          // caminho relativo, ex.: "fotos/204554.jpg"
  instagram: string | null;     // perfil: Câmara, senão registro no TSE, senão scripts/instagram-manual.json
  url_camara: string | null;    // null = não é deputado
  url_divulgacand: string;
  patrimonio_total: number | null; // soma dos bens declarados ao TSE em 2026; null = nenhum (FR-014)
  patrimonio_itens: number;        // quantos bens entraram na soma (NFR-009); só o total é versionado (C-008)
  patrimonio_2022: number | null;  // total declarado em 2022 a deputado federal por MG; null = não concorreu (FR-015)
  voto_6x1: Voto6x1 | null;        // posição na PEC 221/2019, fim da escala 6x1 (FR-024); null = não é deputado
  votacoes_2026: Votacoes2026 | null; // votações nominais do Plenário em 2026; null = nenhuma no mandato (FR-034)
  votacoes_mandato_anterior: MandatoAnterior | null; // último mandato de ex-deputado federal fora do mandato; null = nunca foi (FR-070)
  reeleicao: boolean;              // deputado em exercício que concorre (FR-039)
  cargos_anteriores: CargoAnterior[]; // eleições do TSE de 2000 a 2024, do mais recente ao mais antigo; vazia = nunca eleito (FR-036)
  patrimonio_anterior: PatrimonioAnterior | null; // declaração mais recente antes de 2026; null = nenhuma (FR-062)
  regiao_2022: Regiao2022 | null;  // votos de 2022 a deputado federal por MG; null = não disputou (versão 4310)
  governo_2026: Governo2026 | null; // votos iguais à orientação do Governo em 2026; null = não é deputado ou sem votação
  blindagem: Blindagem | null;     // PEC 3/2021 (PEC da Blindagem), 16/09/2025; null = não é deputado
}

/**
 * Votação de 2022 (TSE, votos nominais válidos, deputado federal por MG). `top`: por código TSE
 * do município, [votos, posição] onde ficou entre os 10 mais votados; empate divide a posição.
 */
export interface Regiao2022 {
  total: number;
  top: Record<string, [number, number]>;
}

/** Votações nominais de 2026 em que o Governo orientou Sim/Não e ele votou Sim/Não (`total`), e em quantas votou igual (`com`). */
export interface Governo2026 {
  com: number;
  total: number;
}

/** Voto na PEC da Blindagem: 1º e 2º turno; null = fora do exercício na data. */
export interface Blindagem {
  t1: VotoPlenario;
  t2: VotoPlenario;
}

/** Declaração de bens da candidatura mais recente antes de 2026 (2006–2024, qualquer cargo) e o IPCA até 2026. */
export interface PatrimonioAnterior {
  ano: number;
  valor: number;      // total nominal declarado naquele ano; 0 = candidatura sem bens
  fator_ipca: number; // índice de ago/2026 ÷ índice de ago/<ano> (SIDRA 1737), >= 1
}

/** Município de MG pelo código do TSE (não é o do IBGE). */
export interface Municipio {
  cd: string;
  nome: string;
}

/** Cargo para o qual foi eleito: "vereadora", "Montes Claros" (ou "MG"), 2020. */
export interface CargoAnterior {
  cargo: string;
  lugar: string;
  ano: number;
}

/** "ausente": não votou Sim nem Não; null: não era deputado em 27/05/2026. */
export type VotoPlenario = 'sim' | 'nao' | 'ausente' | null;

export interface Voto6x1 {
  final: VotoPlenario;          // votação final (2º turno), 27/05/2026
  primeiro_turno: VotoPlenario;
  emendas: (1 | 2)[];           // Emendas 1 e 2 com assinatura vigente na data da votação
}

/** Votações nominais do Plenário em 2026 com ele no mandato (`total`, >= 1) e em quantas votou. */
export interface Votacoes2026 {
  votou: number;
  total: number;
}

/** Período do último mandato de deputado federal: ano seguinte à eleição até o quarto ano. */
export interface Periodo {
  de: number;
  ate: number;
}

/** Participação no último mandato (FR-070 a FR-073); `sem_dados`: sem ligação com a Câmara ou sem votos nominais no período. */
export type MandatoAnterior = (Votacoes2026 & Periodo) | ({ sem_dados: true } & Periodo);

export interface Partido {
  sigla: string;
  nome: string;
  extrema_direita: boolean;
  classificado_em: string;      // AAAA-MM-DD
  motivo: string;
}

export interface Fonte { nome: string; url: string; arquivo_ou_endpoint: string }

export interface NaoConcorre { id_camara: number; nome: string; motivo?: string }

export interface Base {
  data_conferido: string;       // AAAA-MM-DD
  fontes: Fonte[];
  total_deputados_mg: number;
  nao_concorrem: NaoConcorre[];
}

/** Opção do topo (FR-066): só quem tenta a reeleição ou todos os candidatos da base. */
export type Universo = 'reeleicao' | 'todos';

export interface EstadoFiltro {
  universo: Universo;           // começa em 'reeleicao' a cada visita, nunca guardado (FR-065, FR-069)
  busca: string;
  partido: string | null;       // nada oculta por partido (FR-005, alterado em 02/10/2026)
  mostrarOcultos: boolean;      // quem nunca teve cargo (FR-036); começa false a cada visita
  esconder: string[];           // ids de marca ligados em "Esconder quem tem" (FR-052); começa vazio, nunca guardado (C-020)
}

export interface Contagem {
  total: number;                // candidatos da opção ativa: os da reeleição ou todos da base (FR-066)
  exibidos: number;             // à mostra, depois de busca, partido e ocultos
  marcados: number;             // dos exibidos, quantos são de partido marcado como extrema direita
  ocultos: number;              // da opção ativa, quantos nunca tiveram cargo (FR-036); 0 em "Reeleição"
  ocultosNaBusca: number;       // com os ocultos escondidos: quantos casam com busca e partido e não aparecem (FR-037, FR-040)
  escondidosPorMarca: number;   // quantos busca, partido e ocultos deixariam, mas as marcas ligadas tiraram (FR-053)
}
