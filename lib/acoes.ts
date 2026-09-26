export type EstadoForm = {
  ok: boolean;
  mensagem?: string;
  erros?: Record<string, string[] | undefined>;
  valores?: Record<string, string>;
  // Sinal explícito para o cliente levar a pessoa ao login. O proxy não redireciona
  // POST de Server Action, então quem sai do beco sem saída é a tela.
  sessaoExpirada?: true;
};

export const ESTADO_INICIAL: EstadoForm = { ok: false };

export const SESSAO_EXPIRADA = 'Sessão expirada, faça login novamente';
export const NEGOCIO_NAO_EXISTE = 'Este negócio não existe mais';
export const CLIENTE_NAO_EXISTE = 'Este cliente não existe mais';

export const ESTADO_SESSAO_EXPIRADA: EstadoForm = {
  ok: false,
  mensagem: SESSAO_EXPIRADA,
  sessaoExpirada: true,
};
export const FALHA_MOVER = 'Não foi possível mover o negócio, tente de novo';

export function lerCampos(fd: FormData, nomes: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    nomes.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );
}
