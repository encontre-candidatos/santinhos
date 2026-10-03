// Extração do Instagram (scripts/lib/instagram.mjs): textos como vêm da Câmara e do TSE.
import { describe, expect, it } from 'vitest';
import { escolherPerfil, instagramDoCandidato, perfilInstagram } from '../../scripts/lib/instagram.mjs';

describe('perfilInstagram', () => {
  it.each([
    ['https://www.instagram.com/anapimentelmg', 'anapimentelmg'],
    ['HTTPS://WWW.INSTAGRAM.COM/ANDREJANONES/?HL=PT-BR', 'andrejanones'],
    ['INSTAGRAM.COM/ROSANGELAREIS.MG', 'rosangelareis.mg'],
    ['@DELEGADOMARCELOFREITAS - INSTAGRAM', 'delegadomarcelofreitas'],
    ['INSTAGRAM: @DEPSTEFANO', 'depstefano'],
    ['INSTAGRAM - @FREDCOSTADEP - HTTPS://WWW.INSTAGRAM.COM/FREDCOSTADEP?IGSH=MWJIEHIY', 'fredcostadep']
  ])('%s → %s', (texto, perfil) => expect(perfilInstagram(texto)).toBe(perfil));

  it('ignora outras redes', () => {
    expect(perfilInstagram('https://twitter.com/apjunqueira')).toBeNull();
    expect(perfilInstagram('@fulano - X')).toBeNull();
  });
});

describe('escolherPerfil', () => {
  it('prefere o perfil com o nome de urna e, no empate, o mais curto', () => {
    const perfis = ['cortesdacelinha', 'celinda_xakriaba', 'celia.xakriaba', 'timeceliaxakriaba'];
    expect(escolherPerfil(perfis, 'CÉLIA XAKRIABÁ')).toBe('celia.xakriaba');
  });
});

describe('instagramDoCandidato', () => {
  it('Câmara antes do TSE, TSE antes do manual', () => {
    const base = { nomeUrna: 'FULANO', manual: 'https://www.instagram.com/manual/' };
    expect(instagramDoCandidato({ ...base, redeSocialCamara: ['https://www.instagram.com/Camara'], redesTSE: ['INSTAGRAM.COM/TSE'] }))
      .toBe('https://www.instagram.com/camara/');
    expect(instagramDoCandidato({ ...base, redeSocialCamara: ['https://twitter.com/x'], redesTSE: ['INSTAGRAM.COM/TSE'] }))
      .toBe('https://www.instagram.com/tse/');
    expect(instagramDoCandidato({ ...base, redeSocialCamara: [], redesTSE: [] })).toBe('https://www.instagram.com/manual/');
    expect(instagramDoCandidato({ ...base, manual: null, redeSocialCamara: [], redesTSE: [] })).toBeNull();
  });
});
