'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { salvarCliente } from '@/app/dashboard/clientes/actions';
import { Campo } from '@/components/crm/campo';
import { Button } from '@/components/ui/button';
import { ESTADO_INICIAL } from '@/lib/acoes';
import type { Cliente } from '@/lib/tipos';

export function FormCliente({ cliente, aoConcluir }: { cliente?: Cliente; aoConcluir: () => void }) {
  const [estado, acao, pendente] = useActionState(salvarCliente, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.ok) {
      toast.success('Cliente salvo');
      aoConcluir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // Depois de um erro, reexibe o que a pessoa digitou.
  const v = (campo: 'nome' | 'email' | 'telefone' | 'empresa') =>
    estado.valores?.[campo] ?? cliente?.[campo] ?? '';

  return (
    <form action={acao} className="space-y-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <Campo nome="nome" rotulo="Nome" padrao={v('nome')} erros={estado.erros?.nome} />
      <Campo nome="email" rotulo="E-mail" tipo="email" padrao={v('email')} erros={estado.erros?.email} />
      <Campo nome="telefone" rotulo="Telefone" padrao={v('telefone')} erros={estado.erros?.telefone} />
      <Campo nome="empresa" rotulo="Empresa" padrao={v('empresa')} erros={estado.erros?.empresa} />
      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}
      <Button type="submit" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Button>
    </form>
  );
}
