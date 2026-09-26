'use client';

import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';

export function CardNegocio({ negocio, aoAbrir }: { negocio: NegocioCard; aoAbrir: (n: NegocioCard) => void }) {
  return (
    <div
      onClick={() => aoAbrir(negocio)}
      className="cursor-pointer rounded-md border bg-background p-3 text-sm shadow-sm"
    >
      <p className="font-medium">{negocio.titulo}</p>
      <p className="text-muted-foreground">{negocio.clienteNome}</p>
      <p className="mt-1 font-semibold">{formatarBRL(negocio.valor)}</p>
    </div>
  );
}
