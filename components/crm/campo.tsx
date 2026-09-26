import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Campo({
  nome,
  rotulo,
  tipo = 'text',
  padrao,
  erros,
  autoComplete,
}: {
  nome: string;
  rotulo: string;
  tipo?: string;
  padrao?: string;
  erros?: string[];
  autoComplete?: string;
}) {
  const idErro = `${nome}-erro`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={nome}>{rotulo}</Label>
      <Input
        id={nome}
        name={nome}
        type={tipo}
        defaultValue={padrao}
        autoComplete={autoComplete}
        aria-invalid={erros ? true : undefined}
        aria-describedby={erros ? idErro : undefined}
      />
      {erros && (
        <p id={idErro} className="text-sm text-destructive">
          {erros[0]}
        </p>
      )}
    </div>
  );
}
