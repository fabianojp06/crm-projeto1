'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { entrar } from '@/app/(auth)/actions';
import { Campo } from '@/components/crm/campo';
import { Button } from '@/components/ui/button';
import { ESTADO_INICIAL } from '@/lib/acoes';

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrar, ESTADO_INICIAL);
  return (
    <form action={acao} className="space-y-4">
      <Campo nome="email" rotulo="E-mail" tipo="email" autoComplete="email" padrao={estado.valores?.email} erros={estado.erros?.email} />
      <Campo nome="senha" rotulo="Senha" tipo="password" autoComplete="current-password" erros={estado.erros?.senha} />
      {estado.mensagem && <p role="alert" className="text-sm text-destructive">{estado.mensagem}</p>}
      <Button type="submit" className="w-full" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta? <Link href="/cadastro" className="underline">Cadastre-se</Link>
      </p>
    </form>
  );
}
