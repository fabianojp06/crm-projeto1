'use client';

import { Button } from '@/components/ui/button';

export function TelaErro({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground">Não foi possível carregar esta página.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
