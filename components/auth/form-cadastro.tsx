'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { cadastrar } from '@/app/(auth)/actions';
import { Campo } from '@/components/crm/campo';
import { Button } from '@/components/ui/button';
import { ESTADO_INICIAL } from '@/lib/acoes';

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, ESTADO_INICIAL);
  return (
    <form action={acao} className="space-y-4">
      <Campo nome="nome" rotulo="Nome" autoComplete="name" padrao={estado.valores?.nome} erros={estado.erros?.nome} />
      <Campo nome="email" rotulo="E-mail" tipo="email" autoComplete="email" padrao={estado.valores?.email} erros={estado.erros?.email} />
      <Campo nome="senha" rotulo="Senha" tipo="password" autoComplete="new-password" erros={estado.erros?.senha} />
      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Criando conta…' : 'Criar conta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta? <Link href="/login" className="underline">Entrar</Link>
      </p>
    </form>
  );
}
