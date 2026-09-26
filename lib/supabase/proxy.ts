import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { decidirRota } from '@/lib/auth/rotas';

export async function updateSession(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // (a) a página desta mesma requisição já lê o token renovado
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          // (b) o navegador recebe os cookies novos
          cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    },
  );

  // Não coloque código entre createServerClient e getClaims.
  const { data } = await supabase.auth.getClaims();

  const decisao = decidirRota({
    pathname: request.nextUrl.pathname,
    logado: Boolean(data?.claims),
    ehServerAction: request.method === 'POST' && request.headers.has('next-action'),
  });
  if (decisao.tipo === 'seguir') return resposta;

  const url = request.nextUrl.clone();
  url.pathname = decisao.para;
  url.search = '';
  const redirecionamento = NextResponse.redirect(url);
  // Copia os cookies renovados para o redirecionamento, senão o usuário é deslogado.
  resposta.cookies.getAll().forEach((c) => redirecionamento.cookies.set(c));
  for (const h of ['cache-control', 'expires', 'pragma']) {
    const v = resposta.headers.get(h);
    if (v) redirecionamento.headers.set(h, v);
  }
  return redirecionamento;
}
