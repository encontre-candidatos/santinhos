// Carregador da base gerada por `npm run base` (scripts/montar-base.mjs). Os JSON entram no
// bundle e, portanto, no pré-cache do PWA.
import type { Base, Candidato, Municipio, Partido } from '$lib/tipos';
import candidatosJson from './candidatos.json';
import partidosJson from './partidos.json';
import baseJson from './base.json';
import municipiosJson from './municipios.json';

export const candidatos = candidatosJson as Candidato[];
export const partidos = partidosJson as Partido[];
export const base = baseJson as Base;
export const partidosPorSigla = new Map(partidos.map((p) => [p.sigla, p]));
// Siglas que levam a marca "EXTREMA DIREITA" (FR-004, FR-006). Ninguém é ocultado por elas (FR-005).
export const siglasMarcadas = partidos.filter((p) => p.extrema_direita).map((p) => p.sigla);
// Municípios de MG pelo código do TSE, em ordem de nome (versão 4310): guia e escolha de cidade.
export const municipios = municipiosJson as Municipio[];
export const municipioPorCd = new Map(municipios.map((m) => [m.cd, m]));
