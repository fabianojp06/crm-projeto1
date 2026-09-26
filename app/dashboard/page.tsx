import { CardsIndicadores } from '@/components/crm/cards-indicadores';
import { EstadoVazio } from '@/components/crm/estado-vazio';
import { GraficoEtapas } from '@/components/crm/grafico-etapas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Etapa } from '@/lib/etapas';
import { calcularIndicadores } from '@/lib/metrics';
import { createClient, exigirUsuario } from '@/lib/supabase/server';

export default async function VisaoGeralPage() {
  await exigirUsuario();
  const supabase = await createClient();
  const [clientes, negocios] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('negocios').select('etapa, valor'),
  ]);
  if (clientes.error || negocios.error) throw new Error('Falha ao carregar a visão geral');

  const totalClientes = clientes.count ?? 0;
  const lista = negocios.data ?? [];
  if (totalClientes === 0 && lista.length === 0) return <EstadoVazio />;

  const indicadores = calcularIndicadores(
    totalClientes,
    lista.map((n) => ({ etapa: n.etapa as Etapa, valor: Number(n.valor) })),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visão geral</h1>
      <CardsIndicadores indicadores={indicadores} />
      <Card>
        <CardHeader>
          <CardTitle>Valor por etapa do funil</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoEtapas dados={indicadores.porEtapa} />
        </CardContent>
      </Card>
    </div>
  );
}
