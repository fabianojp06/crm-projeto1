import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function BuscaClientes({ q }: { q: string }) {
  return (
    <form method="get" className="flex max-w-sm gap-2" role="search">
      <Input name="q" defaultValue={q} placeholder="Buscar por nome" aria-label="Buscar por nome" />
      <Button type="submit" variant="outline">Buscar</Button>
    </form>
  );
}
