import { describe, expect, it } from 'vitest';
import { decidirPosCadastro } from '@/lib/auth/cadastro';

// Local, com "Confirm email" desligado, o signUp já devolve sessão.
// Num Supabase hospedado a confirmação vem LIGADA por padrão: sem sessão, mandar
// para /dashboard faz o proxy jogar a pessoa de volta em /login, sem explicação.
describe('decidirPosCadastro', () => {
  it('com sessão, entra direto no dashboard', () => {
    expect(decidirPosCadastro({ session: { access_token: 'x' }, user: { id: 'u' } })).toEqual({
      tipo: 'entrar',
    });
  });

  it('sem sessão, pede a confirmação de e-mail em vez de redirecionar', () => {
    expect(decidirPosCadastro({ session: null, user: { id: 'u' } })).toEqual({
      tipo: 'confirmar',
      mensagem: 'Conta criada. Confirme o e-mail que enviamos para você e depois entre.',
    });
  });

  it('sem sessão e sem usuário também pede confirmação, nunca entra', () => {
    expect(decidirPosCadastro({ session: null, user: null })).toEqual({
      tipo: 'confirmar',
      mensagem: 'Conta criada. Confirme o e-mail que enviamos para você e depois entre.',
    });
  });
});
