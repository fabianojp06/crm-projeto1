'use client';

import { TelaErro } from '@/components/crm/tela-erro';

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <TelaErro reset={reset} />;
}
