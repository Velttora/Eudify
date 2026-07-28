'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { pathAfterBootstrap } from '@/shared/lib/routing';
import { AppHeader } from '@/shared/components/app-header';

type HubNavItem = { href: string; label: string; exact?: boolean };

const NAV: HubNavItem[] = [
  { href: '/dashboard/provider', label: 'Inicio', exact: true },
  { href: '/dashboard/provider/chat', label: 'Chat' },
  { href: '/dashboard/provider/agenda', label: 'Agenda' },
  { href: '/dashboard/provider/estudiantes', label: 'Estudiantes' },
  { href: '/dashboard/provider/ofertas', label: 'Ofertas' },
  { href: '/dashboard/provider/pagos', label: 'Pagos' },
  { href: '/dashboard/provider/insights', label: 'Insights' },
  { href: '/dashboard/provider/recursos', label: 'Recursos' },
  { href: '/dashboard/provider/vitrina', label: 'Vitrina pública' },
  { href: '/profile/provider', label: 'Mi perfil' },
];

function navClass(active: boolean) {
  return [
    'rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    active
      ? 'bg-[var(--primary)] text-white shadow-sm'
      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
  ].join(' ');
}

export function EducatorHubShell({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  useEffect(() => {
    const b = bootstrapQuery.data;
    if (!b) return;
    const next = pathAfterBootstrap(b);
    if (next !== '/dashboard/provider') {
      router.replace(next);
    }
  }, [bootstrapQuery.data, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const loading = bootstrapQuery.isLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8 text-base text-[var(--muted-foreground)]">
        Cargando tu espacio profesional…
      </div>
    );
  }

  if (bootstrapQuery.isError || !bootstrapQuery.data) {
    return (
      <div className="p-8 text-base text-red-700">
        No se pudo cargar la sesión.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader logoHref="/dashboard/provider" pageLabel="Educador" links={[]} />
      <div className="mx-auto flex max-w-7xl flex-col gap-0 lg:flex-row lg:gap-8">
        <div className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 lg:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-left text-sm font-semibold text-[var(--foreground)]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
          >
            Menú del hub
            <span className="text-[var(--muted-foreground)]">{mobileOpen ? '▲' : '▼'}</span>
          </button>
          {mobileOpen ? (
            <nav className="mt-2 flex flex-col gap-1 pb-1">
              {NAV.map((item) => {
                const active = item.exact === true
                  ? pathname === item.href
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={navClass(!!active)}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>

        <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] px-3 py-8 lg:block">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Tu negocio
          </p>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.exact === true
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={navClass(!!active)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
