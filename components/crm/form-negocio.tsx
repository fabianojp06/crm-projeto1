'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { excluirNegocio, salvarNegocio } from '@/app/dashboard/funil/actions';
import { Campo } from '@/components/crm/campo';
import { ConfirmarExclusao } from '@/components/crm/confirmar-exclusao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ESTADO_INICIAL } from '@/lib/acoes';
import { ETAPAS, ROTULO_ETAPA } from '@/lib/etapas';
import { formatarBRL, formatarNumeroBR } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { parseValorBRL } from '@/lib/schemas';

const classeSelect =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function FormNegocio({
  negocio,
  clientes,
  aoConcluir,
}: {
  negocio?: NegocioCard;
  clientes: { id: string; nome: string }[];
  aoConcluir: () => void;
}) {
  const [estado, acao, pendente] = useActionState(salvarNegocio, ESTADO_INICIAL);
  const [excluindo, iniciar] = useTransition();
  const [valorTexto, setValorTexto] = useState(negocio ? formatarNumeroBR(negocio.valor) : '');

  useEffect(() => {
    if (estado.ok) {
      toast.success('Negócio salvo');
      aoConcluir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!negocio && clientes.length === 0) {
    return (
      <p className="text-sm">
        Cadastre um cliente primeiro.{' '}
        <Link href="/dashboard/clientes" className="underline">Ir para Clientes</Link>
      </p>
    );
  }

  const v = (campo: 'titulo' | 'cliente_id' | 'etapa', padrao: string) => estado.valores?.[campo] ?? padrao;
  const previa = parseValorBRL(valorTexto);

  function excluir() {
    if (!negocio) return;
    iniciar(async () => {
      try {
        const r = await excluirNegocio(negocio.id);
        if (r.ok) {
          toast.success('Negócio excluído');
          aoConcluir();
        } else toast.error(r.mensagem);
      } catch {
        toast.error('Não foi possível excluir o negócio');
      }
    });
  }

  return (
    <form action={acao} noValidate className="space-y-4">
      {negocio && <input type="hidden" name="id" value={negocio.id} />}
      <Campo nome="titulo" rotulo="Título" padrao={v('titulo', negocio?.titulo ?? '')} erros={estado.erros?.titulo} />

      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor</Label>
        <Input
          id="valor"
          name="valor"
          inputMode="decimal"
          placeholder="1.500,50"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
          aria-invalid={estado.erros?.valor ? true : undefined}
        />
        {previa.ok && <p className="text-xs text-muted-foreground">= {formatarBRL(previa.valor)}</p>}
        {estado.erros?.valor && <p className="text-sm text-destructive">{estado.erros.valor[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cliente_id">Cliente</Label>
        <select id="cliente_id" name="cliente_id" className={classeSelect} defaultValue={v('cliente_id', negocio?.cliente_id ?? '')}>
          <option value="" disabled>Selecione…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        {estado.erros?.cliente_id && <p className="text-sm text-destructive">{estado.erros.cliente_id[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="etapa">Etapa</Label>
        <select id="etapa" name="etapa" className={classeSelect} defaultValue={v('etapa', negocio?.etapa ?? 'contato')}>
          {ETAPAS.map((e) => (
            <option key={e} value={e}>{ROTULO_ETAPA[e]}</option>
          ))}
        </select>
      </div>

      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Button>
        {negocio && (
          <ConfirmarExclusao
            titulo={`Excluir "${negocio.titulo}"?`}
            descricao="Esta ação não pode ser desfeita."
            aoConfirmar={excluir}
            desabilitado={excluindo}
          />
        )}
      </div>
    </form>
  );
}
