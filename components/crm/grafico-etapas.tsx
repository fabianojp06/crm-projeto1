'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';
import { formatarBRL } from '@/lib/format';
import type { Indicadores } from '@/lib/metrics';

const config = { valor: { label: 'Valor', color: 'var(--chart-1)' } } satisfies ChartConfig;

export function GraficoEtapas({ dados }: { dados: Indicadores['porEtapa'] }) {
  return (
    <ChartContainer config={config} className="h-72 w-full">
      <BarChart data={dados} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
        <YAxis width={96} tickFormatter={(v: number) => formatarBRL(v)} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatarBRL(Number(v))} />} />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
