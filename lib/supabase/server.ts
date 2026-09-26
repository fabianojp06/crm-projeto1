import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Usuario = { id: string; email: string };

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: quem renova a sessão é o proxy.
          }
        },
      },
    },
  );
}

export async function obterUsuario(): Promise<Usuario | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
}

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect('/login');
  return usuario;
}
