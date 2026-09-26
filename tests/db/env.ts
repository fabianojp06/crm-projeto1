import { config } from 'dotenv';

config({ path: '.env.local' });

// Mesmo motivo do teardown do Playwright: estes testes criam e apagam usuários com a
// service role, então só podem rodar contra o Supabase local.
const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`test:db só roda contra o Supabase local. NEXT_PUBLIC_SUPABASE_URL aponta para "${host}".`);
}
