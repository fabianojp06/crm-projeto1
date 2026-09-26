import { Kanban } from '@/components/crm/kanban';
import type { Etapa } from '@/lib/etapas';
import type { NegocioCard } from '@/lib/kanban';
import { createClient, exigirUsuario } from '@/lib/supabase/server';

export default async function FunilPage() {
  await exigirUsuario();
  const supabase = await createClient();
  const [negociosR, clientesR] = await Promise.all([
    supabase
      .from('negocios')
      .select('id, titulo, valor, etapa, posicao, cliente_id, clientes(nome)')
      .order('posicao')
      .order('created_at')
      .order('id'),
    supabase.from('clientes').select('id, nome').order('nome'),
  ]);
  if (negociosR.error || clientesR.error) throw new Error('Falha ao carregar o funil');

  const negocios: NegocioCard[] = (negociosR.data ?? []).map((n) => ({
    id: n.id,
    titulo: n.titulo,
    valor: Number(n.valor),
    etapa: n.etapa as Etapa,
    posicao: n.posicao,
    cliente_id: n.cliente_id,
    clienteNome: (n.clientes as unknown as { nome: string } | null)?.nome ?? '—',
  }));

  // A key remonta o kanban quando os dados do servidor mudam (depois de salvar ou mover).
  const assinatura = negocios.map((n) => `${n.id}:${n.etapa}:${n.posicao}:${n.valor}:${n.titulo}:${n.clienteNome}`).join('|');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Funil de vendas</h1>
      <Kanban key={assinatura} negocios={negocios} clientes={clientesR.data ?? []} />
    </div>
  );
}
