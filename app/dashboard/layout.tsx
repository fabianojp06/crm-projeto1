import { sair } from '@/app/(auth)/actions';
import { MenuLateral } from '@/components/crm/menu-lateral';
import { Button } from '@/components/ui/button';
import { createClient, exigirUsuario } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Aqui o usuário serve só para exibir o nome; cada página faz a própria checagem.
  const usuario = await exigirUsuario();
  const supabase = await createClient();
  const { data: perfil } = await supabase.from('profiles').select('nome').eq('id', usuario.id).maybeSingle();
  const nome = perfil?.nome ?? usuario.email; // se o perfil falhar, mostra o e-mail

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b p-4 md:border-b-0 md:border-r">
        <p className="mb-4 px-3 text-lg font-bold">Mini CRM</p>
        <MenuLateral />
      </aside>
      <div className="flex flex-col">
        <header className="flex items-center justify-end gap-4 border-b px-6 py-3">
          <span className="text-sm">{nome}</span>
          <form action={sair}>
            <Button type="submit" variant="outline" size="sm">Sair</Button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
