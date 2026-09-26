import { FormCadastro } from '@/components/auth/form-cadastro';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CadastroPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cada conta tem o seu próprio CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <FormCadastro />
      </CardContent>
    </Card>
  );
}
