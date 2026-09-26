'use client';

import { useRouter } from 'next/navigation';
import type { EstadoForm } from '@/lib/acoes';

/**
 * O proxy não redireciona POST de Server Action (senão o cliente receberia um erro
 * genérico no lugar da mensagem). Então, quando a action avisa que a sessão caiu,
 * quem tira a pessoa do beco sem saída é a tela.
 *
 * Devolve `true` quando já encaminhou para o login, para o chamador parar por ali.
 */
export function useSessaoExpirada() {
  const router = useRouter();
  return function encaminharSeExpirou(estado: EstadoForm): boolean {
    if (!estado.sessaoExpirada) return false;
    router.replace('/login');
    return true;
  };
}
