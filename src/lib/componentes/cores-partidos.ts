// Cor de identificação por sigla, usada SÓ no fio de 8 px e na retícula da foto do santinho.
// Ponto de partida: as cores da amostra (research/amostra-santinho-urna.html). Não carrega
// significado de marca: quem decide a marca "EXTREMA DIREITA" é partidos.json.
export const CORES_PARTIDOS: Readonly<Record<string, string>> = {
  AVANTE: '#e06a1b',
  MDB: '#2f8f4e',
  PDT: '#b3303a',
  PL: '#1f3f8f',
  PODE: '#3a9a45',
  PP: '#3b64a8',
  PRD: '#3e5a86',
  PRTB: '#2c6e49',
  PSB: '#e8a33d',
  PSD: '#2d6db5',
  PSDB: '#2a5caa',
  PSOL: '#7b2d8e',
  PT: '#c4161c',
  PV: '#4f9d2d',
  REDE: '#1a8a86',
  REPUBLICANOS: '#0f6e9e',
  'UNIÃO': '#1b75bb'
};

/** Cor da sigla; sem cor definida, a tinta secundária do papel. */
export function corPartido(sigla: string): string {
  return CORES_PARTIDOS[sigla] ?? 'var(--tinta-2)';
}
