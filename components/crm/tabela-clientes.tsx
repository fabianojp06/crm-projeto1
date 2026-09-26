'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { excluirCliente } from '@/app/dashboard/clientes/actions';
import { ConfirmarExclusao } from '@/components/crm/confirmar-exclusao';
import { FormCliente } from '@/components/crm/form-cliente';
import { useSessaoExpirada } from '@/components/crm/usar-sessao';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Cliente } from '@/lib/tipos';

export function TabelaClientes({ clientes }: { clientes: Cliente[] }) {
  const [editando, setEditando] = useState<Cliente | 'novo' | null>(null);
  const [excluindo, iniciar] = useTransition();
  const encaminharSeExpirou = useSessaoExpirada();

  function excluir(c: Cliente) {
    iniciar(async () => {
      try {
        const r = await excluirCliente(c.id);
        if (encaminharSeExpirou(r)) return;
        if (r.ok) toast.success('Cliente excluído');
        else toast.error(r.mensagem);
      } catch {
        toast.error('Não foi possível excluir o cliente');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditando('novo')}>Novo cliente</Button>
      </div>

      {clientes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.email ?? '—'}</TableCell>
                <TableCell>{c.telefone ?? '—'}</TableCell>
                <TableCell>{c.empresa ?? '—'}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditando(c)}>Editar</Button>
                  <ConfirmarExclusao
                    titulo={`Excluir ${c.nome}?`}
                    descricao="Os negócios deste cliente também serão excluídos. Esta ação não pode ser desfeita."
                    aoConfirmar={() => excluir(c)}
                    desabilitado={excluindo}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === 'novo' ? 'Novo cliente' : 'Editar cliente'}</DialogTitle>
          </DialogHeader>
          {editando !== null && (
            <FormCliente
              key={editando === 'novo' ? 'novo' : editando.id}
              cliente={editando === 'novo' ? undefined : editando}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
