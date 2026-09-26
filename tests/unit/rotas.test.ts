import { describe, expect, it } from 'vitest';
import { decidirRota } from '@/lib/auth/rotas';

const rota = (pathname: string, logado: boolean, ehServerAction = false) =>
  decidirRota({ pathname, logado, ehServerAction });

describe('decidirRota', () => {
  it.each(['/dashboard', '/dashboard/', '/dashboard/clientes', '/dashboard/funil'])(
    'sem sessão em %s vai para /login',
    (p) => expect(rota(p, false)).toEqual({ tipo: 'redirecionar', para: '/login' }),
  );

  it.each(['/login', '/cadastro'])('logado em %s vai para /dashboard', (p) => {
    expect(rota(p, true)).toEqual({ tipo: 'redirecionar', para: '/dashboard' });
  });

  it('não confunde /dashboardx com o dashboard', () => {
    expect(rota('/dashboardx', false)).toEqual({ tipo: 'seguir' });
  });

  it('páginas públicas seguem para visitante', () => {
    expect(rota('/login', false)).toEqual({ tipo: 'seguir' });
    expect(rota('/cadastro', false)).toEqual({ tipo: 'seguir' });
  });

  it('dashboard segue para quem está logado', () => {
    expect(rota('/dashboard/funil', true)).toEqual({ tipo: 'seguir' });
  });

  it('Server Action nunca é redirecionada, mesmo sem sessão', () => {
    expect(rota('/dashboard/funil', false, true)).toEqual({ tipo: 'seguir' });
  });
});
