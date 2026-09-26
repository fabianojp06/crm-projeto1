const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos',
  user_already_exists: 'Este e-mail já está cadastrado',
};

export function traduzirErroAuth(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || 'Não foi possível concluir. Tente novamente.';
}
