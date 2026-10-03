// Instagram de cada candidato, a partir de três fontes, nesta ordem:
// 1. `redeSocial` do detalhe do deputado na API da Câmara (uma conta, mantida pelo gabinete);
// 2. redes sociais registradas pelo candidato no TSE (rede_social_candidato_2026.zip), que
//    chegam em texto livre ("@FULANO - INSTAGRAM", "INSTAGRAM.COM/FULANO/?HL=PT") e às vezes
//    com várias contas (cortes, equipe de campanha);
// 3. scripts/instagram-manual.json, para quem não tem conta em nenhuma das duas, com a fonte.
// Conferido em 02/10/2026: a Câmara cobre 33 dos 48, o TSE mais 14, o manual 1.

/** Perfil do Instagram em minúsculas, ou null se o texto não traz um. */
export function perfilInstagram(/** @type {string} */ texto) {
  const t = texto.trim();
  const url = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (url) return url[1].replace(/\.+$/, '').toLowerCase();
  const arroba = t.match(/@([A-Za-z0-9._]+)/);
  if (arroba && /instagram/i.test(t)) return arroba[1].replace(/\.+$/, '').toLowerCase();
  return null;
}

const sem = (/** @type {string} */ s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Entre várias contas, a que mais se parece com o nome de urna: mais palavras do nome contidas
 * no perfil; no empate, o perfil mais curto (sem prefixo de "cortes", "time" etc.).
 * @param {string[]} perfis
 * @param {string} nomeUrna
 */
export function escolherPerfil(perfis, nomeUrna) {
  const unicos = [...new Set(perfis)];
  if (unicos.length <= 1) return unicos[0] ?? null;
  const palavras = sem(nomeUrna).split(/[^a-z]+/).filter((w) => w.length > 2);
  const nota = (/** @type {string} */ p) => palavras.filter((w) => sem(p).includes(w)).length;
  return unicos.sort((a, b) => nota(b) - nota(a) || a.length - b.length)[0];
}

/**
 * @param {{ redeSocialCamara: string[], redesTSE: string[], manual: string | null, nomeUrna: string }} entrada
 * @returns {string | null} URL canônica do perfil
 */
export function instagramDoCandidato({ redeSocialCamara, redesTSE, manual, nomeUrna }) {
  const perfis = (/** @type {string[]} */ textos) =>
    textos.map(perfilInstagram).filter((p) => p !== null);
  const perfil =
    escolherPerfil(perfis(redeSocialCamara), nomeUrna) ??
    escolherPerfil(perfis(redesTSE), nomeUrna) ??
    (manual ? perfilInstagram(manual) : null);
  return perfil ? `https://www.instagram.com/${perfil}/` : null;
}
