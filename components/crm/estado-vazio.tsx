'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { gerarDadosExemplo } from '@/app/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function EstadoVazio() {
  const [pendente, iniciar] = useTransition();

  function gerar() {
    iniciar(async () => {
      try {
        const r = await gerarDadosExemplo();
        if (!r.ok) toast.error(r.mensagem);
      } catch {
        toast.error('Não foi possível gerar os dados de exemplo');
      }
    });
  }

  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardHeader>
        <CardTitle>Seu CRM está vazio</CardTitle>
        <CardDescription>
          Cadastre clientes ou gere dados de exemplo para explorar o dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={gerar} disabled={pendente}>
          {pendente ? 'Gerando…' : 'Gerar dados de exemplo'}
        </Button>
      </CardContent>
    </Card>
  );
}
