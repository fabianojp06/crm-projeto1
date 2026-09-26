'use client';

import {
  closestCorners, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { moverNegocio } from '@/app/dashboard/funil/actions';
import { ColunaKanban } from '@/components/crm/coluna-kanban';
import { FormNegocio } from '@/components/crm/form-negocio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FALHA_MOVER } from '@/lib/acoes';
import { ETAPAS } from '@/lib/etapas';
import { agruparPorEtapa, aplicarMovimento, localizarDestino, type NegocioCard } from '@/lib/kanban';

type ClienteOpcao = { id: string; nome: string };

export function Kanban({ negocios, clientes }: { negocios: NegocioCard[]; clientes: ClienteOpcao[] }) {
  const [colunas, setColunas] = useState(() => agruparPorEtapa(negocios));
  const [editando, setEditando] = useState<NegocioCard | 'novo' | null>(null);
  const [, iniciar] = useTransition();

  const sensores = useSensors(
    // distância mínima: evita iniciar um arraste num toque acidental no handle
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoSoltar({ active, over }: DragEndEvent) {
    if (!over) return;
    const id = String(active.id);
    const destino = localizarDestino(colunas, String(over.id));
    if (!destino) return;
    const resultado = aplicarMovimento(colunas, id, destino.etapa, destino.indice);
    if (!resultado) return; // soltou no mesmo lugar

    const anterior = colunas;
    setColunas(resultado.colunas); // atualização otimista
    iniciar(async () => {
      try {
        const r = await moverNegocio(id, destino.etapa, resultado.idsDestino);
        if (!r.ok) {
          setColunas(anterior);
          toast.error(r.mensagem);
        }
      } catch {
        setColunas(anterior);
        toast.error(FALHA_MOVER);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')}>Novo negócio</Button>
      </div>
      <DndContext id="kanban" sensors={sensores} collisionDetection={closestCorners} onDragEnd={aoSoltar}>
        <div className="grid gap-4 md:grid-cols-5">
          {ETAPAS.map((etapa) => (
            <ColunaKanban key={etapa} etapa={etapa} negocios={colunas[etapa]} aoAbrir={setEditando} />
          ))}
        </div>
      </DndContext>
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
