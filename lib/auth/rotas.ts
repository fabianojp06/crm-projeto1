export type Decisao = { tipo: 'seguir' } | { tipo: 'redirecionar'; para: '/login' | '/dashboard' };

export function decidirRota(e: {
  pathname: string;
  logado: boolean;
  ehServerAction: boolean;
}): Decisao {
  // Actions só renovam a sessão; a própria action devolve "Sessão expirada".
  if (e.ehServerAction) return { tipo: 'seguir' };

  const protegida = e.pathname === '/dashboard' || e.pathname.startsWith('/dashboard/');
  if (protegida && !e.logado) return { tipo: 'redirecionar', para: '/login' };

  const telaDeEntrada = e.pathname === '/login' || e.pathname === '/cadastro';
  if (telaDeEntrada && e.logado) return { tipo: 'redirecionar', para: '/dashboard' };

  return { tipo: 'seguir' };
}
