'use client';

import { useState } from 'react';
import { ColunaKanban } from '@/components/crm/coluna-kanban';
import { FormNegocio } from '@/components/crm/form-negocio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ETAPAS } from '@/lib/etapas';
import { agruparPorEtapa, type NegocioCard } from '@/lib/kanban';

type ClienteOpcao = { id: string; nome: string };

export function Kanban({ negocios, clientes }: { negocios: NegocioCard[]; clientes: ClienteOpcao[] }) {
  const [colunas] = useState(() => agruparPorEtapa(negocios));
  const [editando, setEditando] = useState<NegocioCard | 'novo' | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')}>Novo negócio</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {ETAPAS.map((etapa) => (
          <ColunaKanban key={etapa} etapa={etapa} negocios={colunas[etapa]} aoAbrir={setEditando} />
        ))}
      </div>
      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === 'novo' ? 'Cadastrar negócio' : 'Editar negócio'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormNegocio
              key={editando === 'novo' ? 'novo' : editando.id}
              negocio={editando === 'novo' ? undefined : editando}
              clientes={clientes}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
