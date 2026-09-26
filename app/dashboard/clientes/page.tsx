import { BuscaClientes } from '@/components/crm/busca-clientes';
import { TabelaClientes } from '@/components/crm/tabela-clientes';
import { escaparBusca } from '@/lib/schemas';
import { createClient, exigirUsuario } from '@/lib/supabase/server';
import type { Cliente } from '@/lib/tipos';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await exigirUsuario();
  const { q = '' } = await searchParams;
  const termo = q.trim();

  const supabase = await createClient();
  let consulta = supabase.from('clientes').select('id, nome, email, telefone, empresa').order('nome');
  // .ilike direto (nunca .or com interpolação); curingas escapados.
  if (termo) consulta = consulta.ilike('nome', `%${escaparBusca(termo)}%`);
  const { data, error } = await consulta;
  if (error) throw new Error('Falha ao carregar clientes');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clientes</h1>
      <BuscaClientes q={termo} />
      <TabelaClientes clientes={(data ?? []) as Cliente[]} />
    </div>
  );
}
