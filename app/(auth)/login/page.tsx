import { FormLogin } from '@/components/auth/form-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse o seu CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <FormLogin />
      </CardContent>
    </Card>
  );
}
