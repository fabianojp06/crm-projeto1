import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatarBRL } from '@/lib/format';
import type { Indicadores } from '@/lib/metrics';

export function CardsIndicadores({ indicadores }: { indicadores: Indicadores }) {
  const cards = [
    { titulo: 'Total de clientes', valor: String(indicadores.totalClientes) },
    { titulo: 'Negócios em aberto', valor: String(indicadores.negociosAbertos) },
    { titulo: 'Valor em aberto', valor: formatarBRL(indicadores.valorAberto) },
    { titulo: 'Valor ganho', valor: formatarBRL(indicadores.valorGanho) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.titulo}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.valor}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
