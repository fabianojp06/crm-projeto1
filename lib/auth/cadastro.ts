export const CONFIRME_O_EMAIL =
  'Conta criada. Confirme o e-mail que enviamos para você e depois entre.';

export type DecisaoCadastro = { tipo: 'entrar' } | { tipo: 'confirmar'; mensagem: string };

/**
 * Com "Confirm email" desligado (o padrão local), o signUp já devolve sessão e a
 * pessoa entra direto. Num Supabase hospedado a confirmação vem ligada por padrão:
 * aí não há sessão, e redirecionar para /dashboard faria o proxy devolver a pessoa
 * para /login sem explicação nenhuma — indistinguível de um bug.
 */
export function decidirPosCadastro(resultado: {
  session: unknown | null;
  user: unknown | null;
}): DecisaoCadastro {
  if (resultado.session) return { tipo: 'entrar' };
  return { tipo: 'confirmar', mensagem: CONFIRME_O_EMAIL };
}
