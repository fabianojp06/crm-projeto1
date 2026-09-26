'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITENS = [
  { href: '/dashboard', rotulo: 'Visão geral' },
  { href: '/dashboard/clientes', rotulo: 'Clientes' },
  { href: '/dashboard/funil', rotulo: 'Funil' },
];

export function MenuLateral() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu principal" className="flex gap-1 md:flex-col">
      {ITENS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-2 text-sm hover:bg-muted',
            pathname === item.href && 'bg-muted font-medium',
          )}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
