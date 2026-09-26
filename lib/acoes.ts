export type EstadoForm = {
  ok: boolean;
  mensagem?: string;
  erros?: Record<string, string[] | undefined>;
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoForm = { ok: false };

export const SESSAO_EXPIRADA = 'Sessão expirada, faça login novamente';
export const NEGOCIO_NAO_EXISTE = 'Este negócio não existe mais';
export const FALHA_MOVER = 'Não foi possível mover o negócio, tente de novo';

export function lerCampos(fd: FormData, nomes: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    nomes.map((n) => {
      const v = fd.get(n);
      return [n, typeof v === 'string' ? v : ''];
    }),
  );
}
