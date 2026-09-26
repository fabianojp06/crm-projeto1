import { describe, expect, it } from 'vitest';
import { traduzirErroAuth } from '@/lib/auth/erros';

describe('traduzirErroAuth', () => {
  it('traduz pelos códigos conhecidos', () => {
    expect(traduzirErroAuth('invalid_credentials')).toBe('E-mail ou senha incorretos');
    expect(traduzirErroAuth('user_already_exists')).toBe('Este e-mail já está cadastrado');
  });
  it('usa mensagem genérica para o resto', () => {
    expect(traduzirErroAuth('over_request_rate_limit')).toBe('Não foi possível concluir. Tente novamente.');
    expect(traduzirErroAuth(undefined)).toBe('Não foi possível concluir. Tente novamente.');
  });
});
