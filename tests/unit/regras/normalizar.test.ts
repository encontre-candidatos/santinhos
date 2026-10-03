import { describe, expect, it } from 'vitest';
import { normalizar } from '$lib/regras/normalizar';

describe('normalizar', () => {
  it('remove acento e baixa caixa', () => expect(normalizar('Tião')).toBe('tiao'));
  it('apara e colapsa espaços', () => expect(normalizar('  HELOÍSA  Paixão ')).toBe('heloisa paixao'));
  it('troca hífen por espaço', () => expect(normalizar('João-Pedro')).toBe('joao pedro'));
  it('troca pontuação e ordinal', () => expect(normalizar('Dr.ª')).toBe('dr a'));
  it('mantém dígitos', () => expect(normalizar('Zé 22')).toBe('ze 22'));
  it('vazio continua vazio', () => expect(normalizar('   ')).toBe(''));
});
